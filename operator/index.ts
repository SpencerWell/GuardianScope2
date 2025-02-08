import { ethers } from "ethers";
import * as dotenv from "dotenv";
const fs = require('fs');
const path = require('path');
dotenv.config();

// Setup env variables 
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
let chainId = 31337;

// 修正文件路径 - 现在从 operator 直接到项目根目录
const avsDeploymentData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../contracts/deployments/guardianscope/31337.json'), 'utf8'));
const coreDeploymentData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../contracts/deployments/core/31337.json'), 'utf8'));

const delegationManagerAddress = coreDeploymentData.addresses.delegation;
const avsDirectoryAddress = coreDeploymentData.addresses.avsDirectory;
const guardianScopeServiceManagerAddress = avsDeploymentData.addresses.guardianScopeServiceManager;
const ecdsaStakeRegistryAddress = avsDeploymentData.addresses.stakeRegistry;

// 修正 ABI 文件路径
const delegationManagerABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../abis/IDelegationManager.json'), 'utf8'));
const ecdsaRegistryABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../abis/ECDSAStakeRegistry.json'), 'utf8'));
const guardianScopeServiceManagerABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../abis/GuardianScopeServiceManager.json'), 'utf8'));
const avsDirectoryABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../abis/IAVSDirectory.json'), 'utf8'));

// Initialize contract objects from ABIs
const delegationManager = new ethers.Contract(delegationManagerAddress, delegationManagerABI, wallet);
const guardianScopeServiceManager = new ethers.Contract(guardianScopeServiceManagerAddress, guardianScopeServiceManagerABI, wallet);
const ecdsaRegistryContract = new ethers.Contract(ecdsaStakeRegistryAddress, ecdsaRegistryABI, wallet);
const avsDirectory = new ethers.Contract(avsDirectoryAddress, avsDirectoryABI, wallet);

const registerOperator = async () => {
    // Check if operator is already registered
    try {
        const isOperator = await delegationManager.isOperator(wallet.address);
        if (!isOperator) {
            console.log("Registering as EigenLayer operator...");
            const tx1 = await delegationManager.registerAsOperator({
                __deprecated_earningsReceiver: wallet.address,
                delegationApprover: "0x0000000000000000000000000000000000000000",
                stakerOptOutWindowBlocks: 0
            }, "");
            await tx1.wait();
            console.log("Successfully registered as EigenLayer operator");
        } else {
            console.log("Already registered as EigenLayer operator");
        }
    } catch (error) {
        console.error("Error checking/registering as operator:", error);
        return;
    }

    // Check if operator is already registered with AVS
    try {
        const isRegistered = await ecdsaRegistryContract.operatorRegistered(wallet.address);
        if (!isRegistered) {
            console.log("Registering with GuardianScope AVS...");
            
            const salt = ethers.hexlify(ethers.randomBytes(32));
            const expiry = Math.floor(Date.now() / 1000) + 3600;

            const operatorDigestHash = await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
                wallet.address,
                guardianScopeServiceManagerAddress,
                salt,
                expiry
            );
            console.log("Operator digest hash:", operatorDigestHash);

            console.log("Signing digest hash with operator's private key");
            const operatorSigningKey = new ethers.SigningKey(process.env.PRIVATE_KEY!);
            const operatorSignedDigestHash = operatorSigningKey.sign(operatorDigestHash);

            const operatorSignature = {
                signature: ethers.Signature.from(operatorSignedDigestHash).serialized,
                salt: salt,
                expiry: expiry
            };

            console.log("Registering Operator to AVS Registry contract");
            const tx2 = await ecdsaRegistryContract.registerOperatorWithSignature(
                operatorSignature,
                wallet.address
            );
            await tx2.wait();
            console.log("Successfully registered with GuardianScope AVS");
        } else {
            console.log("Already registered with GuardianScope AVS");
        }
    } catch (error) {
        console.error("Error registering with AVS:", error);
        return;
    }
};

const main = async () => {
    try {
        await registerOperator();
        console.log("Operator registration process completed");
    } catch (error) {
        console.error("Error in main function:", error);
    }
};

main();