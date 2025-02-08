import { ethers } from "ethers";
import * as dotenv from "dotenv";
const fs = require('fs');
const path = require('path');
dotenv.config();

// Setup env variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
let chainId = 31337;

// Load deployments and contracts
const avsDeploymentData = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, `../contracts/deployments/guardianscope/${chainId}.json`), 
        'utf8'
    )
);

const guardianScopeABI = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, '../abis/GuardianScopeServiceManager.json'), 
        'utf8'
    )
);

const guardianScopeServiceManager = new ethers.Contract(
    avsDeploymentData.addresses.guardianScopeServiceManager,
    guardianScopeABI,
    wallet
);

// Function to generate random content for testing moderation
function generateTestContent(): string {
    // Test cases representing different content types
    const testCases = [
        {
            content: "This is a friendly message about puppies and kittens playing together.",
            category: "safe"
        },
        {
            content: "This message contains words that might be inappropriate: [FILTERED].",
            category: "questionable"
        },
        {
            content: "A perfectly normal article about cooking recipes and gardening tips.",
            category: "safe"
        },
        {
            content: "Content that should be reviewed carefully due to sensitive topics.",
            category: "review"
        },
        {
            content: "Educational content about science and mathematics.",
            category: "safe"
        }
    ];

    const selectedCase = testCases[Math.floor(Math.random() * testCases.length)];
    console.log(`Generated ${selectedCase.category} content for moderation`);
    return selectedCase.content;
}

async function createModerationTask(content: string) {
    try {
        console.log(`Creating moderation task for content: ${content}`);
        const tx = await guardianScopeServiceManager.createModerationTask(content);
        const receipt = await tx.wait();
        console.log(`Task created successfully. Transaction hash: ${receipt.hash}`);
    } catch (error) {
        console.error('Error creating moderation task:', error);
    }
}

// Function to create new tasks periodically
function startCreatingTasks() {
    console.log("Starting to generate moderation tasks...");
    
    // Create tasks every 24 seconds
    setInterval(() => {
        const content = generateTestContent();
        createModerationTask(content);
    }, 24000);
}

// Start the task generation process
startCreatingTasks();