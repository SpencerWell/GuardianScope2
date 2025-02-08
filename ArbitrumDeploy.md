Deploy Smart Contracts to Arbitrum
1. Set Up Arbitrum Sepolia Testnet
Add the Arbitrum Sepolia Testnet to your wallet (e.g., MetaMask):

Network Name: Arbitrum Sepolia

RPC URL: https://sepolia-rollup.arbitrum.io/rpc

Chain ID: 421614

Block Explorer: https://sepolia.arbiscan.io/

2. Deploy Contracts Using Foundry
Use Foundry's forge to deploy your Rust-based smart contracts to Arbitrum Sepolia:

```Bash
forge create --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
--private-key <your_private_key> \
src/GuardianScope.sol:GuardianScope
```

1. Verify Contracts
Verify your deployed contracts on the Arbitrum Sepolia Block Explorer:

```bash

forge verify-contract <contract_address> src/GuardianScope.sol:GuardianScope \
--chain-id 421614 \
--verifier-url https://api-sepolia.arbiscan.io/api \
--etherscan-api-key <your_etherscan_api_key>

```