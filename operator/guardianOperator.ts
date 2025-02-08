import { ethers } from "ethers";
import * as dotenv from "dotenv";
const fs = require('fs');
const path = require('path');
dotenv.config();

// Setup env variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
let chainId = 31337;

const avsDeploymentData = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../contracts/deployments/guardianscope/${chainId}.json`), 'utf8'));
const guardianScopeServiceManagerAddress = avsDeploymentData.addresses.guardianScopeServiceManager;
const guardianScopeServiceManagerABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../abis/GuardianScopeServiceManager.json'), 'utf8'));

// Initialize contract object
const guardianScopeServiceManager = new ethers.Contract(guardianScopeServiceManagerAddress, guardianScopeServiceManagerABI, wallet);

async function signAndSubmitModeration(taskId: number, content: string, approved: boolean) {
    try {
        const messageHash = ethers.solidityPackedKeccak256(
            ["string", "bool"],
            [content, approved]
        );
        const messageBytes = ethers.getBytes(messageHash);
        const signature = await wallet.signMessage(messageBytes);

        console.log(`Submitting moderation for task ${taskId}: ${approved}`);
        const tx = await guardianScopeServiceManager.submitModeration(
            taskId,
            approved,
            signature
        );
        await tx.wait();
        console.log(`Moderation submitted successfully for task ${taskId}`);
    } catch (error) {
        console.error(`Error submitting moderation for task ${taskId}:`, error);
    }
}

async function evaluateContent(content: string): Promise<boolean> {
    // Mock AI evaluation - replace with actual AI integration
    console.log(`Evaluating content: ${content}`);
    return content.toLowerCase().includes("inappropriate") ? false : true;
}

async function monitorTasks() {
    console.log("Starting to monitor for new moderation tasks...");

    guardianScopeServiceManager.on("NewTaskCreated", async (taskIndex: number, task: any) => {
        console.log(`New moderation task received - ID: ${taskIndex}, Content: ${task.content}`);
        
        try {
            const approved = await evaluateContent(task.content);
            await signAndSubmitModeration(taskIndex, task.content, approved);
        } catch (error) {
            console.error(`Error processing task ${taskIndex}:`, error);
        }
    });
}

// Start monitoring
monitorTasks().catch((error) => {
    console.error("Error in monitoring tasks:", error);
});