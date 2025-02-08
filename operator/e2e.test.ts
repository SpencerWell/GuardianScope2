import { createAnvil, Anvil } from "@viem/anvil";
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const execAsync = util.promisify(exec);

async function loadJsonFile(filePath: string): Promise<any> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading file ${filePath}:`, error);
        return null;
    }
}

async function loadDeployments(): Promise<Record<string, any>> {
    const coreFilePath = path.join(__dirname, '..', 'contracts', 'deployments', 'core', '31337.json');
    const guardianFilePath = path.join(__dirname, '..', 'contracts', 'deployments', 'guardianscope', '31337.json');

    const [coreDeployment, guardianDeployment] = await Promise.all([
        loadJsonFile(coreFilePath),
        loadJsonFile(guardianFilePath)
    ]);

    if (!coreDeployment || !guardianDeployment) {
        throw new Error('Error loading deployments');
    }

    return {
        core: coreDeployment,
        guardian: guardianDeployment
    };
}

describe('GuardianScope Integration Test', () => {
    let anvil: Anvil;
    let deployment: Record<string, any>;
    let provider: ethers.JsonRpcProvider;
    let signer: ethers.Wallet;
    let delegationManager: ethers.Contract;
    let guardianScopeServiceManager: ethers.Contract;
    let ecdsaRegistryContract: ethers.Contract;
    let avsDirectory: ethers.Contract;

    beforeAll(async () => {
        anvil = createAnvil();
        await anvil.start();
        await execAsync('npm run deploy:core');
        await execAsync('npm run deploy:guardianscope');
        deployment = await loadDeployments();

        provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        const delegationManagerABI = await loadJsonFile(path.join(__dirname, '..', 'abis', 'IDelegationManager.json'));
        const ecdsaRegistryABI = await loadJsonFile(path.join(__dirname, '..', 'abis', 'ECDSAStakeRegistry.json'));
        const guardianScopeServiceManagerABI = await loadJsonFile(path.join(__dirname, '..', 'abis', 'GuardianScopeServiceManager.json'));
        const avsDirectoryABI = await loadJsonFile(path.join(__dirname, '..', 'abis', 'IAVSDirectory.json'));

        delegationManager = new ethers.Contract(deployment.core.addresses.delegation, delegationManagerABI, signer);
        guardianScopeServiceManager = new ethers.Contract(deployment.guardian.addresses.guardianScopeServiceManager, guardianScopeServiceManagerABI, signer);
        ecdsaRegistryContract = new ethers.Contract(deployment.guardian.addresses.stakeRegistry, ecdsaRegistryABI, signer);
        avsDirectory = new ethers.Contract(deployment.core.addresses.avsDirectory, avsDirectoryABI, signer);
    });

    it('should register as an operator', async () => {
        const tx = await delegationManager.registerAsOperator({
            __deprecated_earningsReceiver: await signer.getAddress(),
            delegationApprover: "0x0000000000000000000000000000000000000000",
            stakerOptOutWindowBlocks: 0
        }, "");
        await tx.wait();

        const isOperator = await delegationManager.isOperator(signer.address);
        expect(isOperator).toBe(true);
    });

    it('should register operator to AVS', async () => {
        const salt = ethers.hexlify(ethers.randomBytes(32));
        const expiry = Math.floor(Date.now() / 1000) + 3600;

        const operatorDigestHash = await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
            signer.address,
            await guardianScopeServiceManager.getAddress(),
            salt,
            expiry
        );

        const operatorSigningKey = new ethers.SigningKey(process.env.PRIVATE_KEY!);
        const operatorSignedDigestHash = operatorSigningKey.sign(operatorDigestHash);
        const operatorSignature = ethers.Signature.from(operatorSignedDigestHash).serialized;

        const tx = await ecdsaRegistryContract.registerOperatorWithSignature(
            {
                signature: operatorSignature,
                salt: salt,
                expiry: expiry
            },
            signer.address
        );
        await tx.wait();

        const isRegistered = await ecdsaRegistryContract.operatorRegistered(signer.address);
        expect(isRegistered).toBe(true);
    });

    it('should create and moderate content', async () => {
        const content = "Test content for moderation";
        const tx1 = await guardianScopeServiceManager.createModerationTask(content);
        await tx1.wait();

        const taskIndex = 0;
        const approved = true;
        
        const messageHash = ethers.solidityPackedKeccak256(["string", "bool"], [content, approved]);
        const messageBytes = ethers.getBytes(messageHash);
        const signature = await signer.signMessage(messageBytes);

        const tx2 = await guardianScopeServiceManager.submitModeration(taskIndex, approved, signature);
        await tx2.wait();
    });

    afterAll(async () => {
        await anvil.stop();
    });
});