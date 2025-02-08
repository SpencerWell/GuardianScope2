# GuardianScope: Decentralized AI Content Moderation Protocol

## Table of Contents
- [GuardianScope: Decentralized AI Content Moderation Protocol](#guardianscope-decentralized-ai-content-moderation-protocol)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
    - [Decentralized Moderation](#decentralized-moderation)
    - [AI-Powered Analysis](#ai-powered-analysis)
  - [Technical Components](#technical-components)
    - [Smart Contract Infrastructure](#smart-contract-infrastructure)
    - [EigenLayer Integration](#eigenlayer-integration)
    - [AI Agent System](#ai-agent-system)
- [GuardianScope AVS](#guardianscope-avs)
  - [Architecture](#architecture)
  - [AVS User Flow](#avs-user-flow)
  - [Local Devnet Deployment](#local-devnet-deployment)
    - [Development Environment](#development-environment)
      - [Non-Nix Environment](#non-nix-environment)
      - [Nix Environment](#nix-environment)
    - [Quick Start](#quick-start)
      - [Start Anvil Chain](#start-anvil-chain)
      - [Deploy Contracts and Start Operator](#deploy-contracts-and-start-operator)
      - [Test Content Moderation](#test-content-moderation)
    - [Help and Support](#help-and-support)
    - [Contact Us](#contact-us)
    - [Disclaimers](#disclaimers)
    - [Testing](#testing)

## Overview

GuardianScope is a pioneering decentralized content moderation protocol powered by AI Agents and built on EigenLayer's AVS (Actively Validated Service) infrastructure. It enables automated, unbiased, and privacy-preserving content moderation for decentralized social platforms while ensuring transparency and security through blockchain technology.

## Features

### Decentralized Moderation
- Distributed network of operators running AI Agents
- Transparent decision-making process
- Economic incentives through EigenLayer's restaking mechanism
- Immune to centralized control and censorship

### AI-Powered Analysis
- Multi-modal content analysis (text, images, videos)
- Real-time moderation capabilities
- Adaptable to platform-specific requirements
- Continuous model improvement through decentralized governance

## Technical Components

### Smart Contract Infrastructure
- AVS smart contracts for coordination
- On-chain result verification
- Transparent reward distribution
- Governance mechanisms

### EigenLayer Integration
- Implements ServiceManagerBase for signature aggregation
- Utilizes BLS signatures for efficient consensus
- Leverages restaking for economic security
- Slashing conditions for malicious behavior

### AI Agent System
- Modular design supporting multiple AI models
- NLP models for text content analysis
- Computer vision models for image/video moderation
- Encrypted inference capabilities

# GuardianScope AVS

Welcome to the GuardianScope AVS. This project demonstrates a decentralized content moderation service built on EigenLayer. It provides automated, unbiased, and privacy-preserving content moderation for Web3 applications through AI-powered analysis.

## Architecture

```
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|  Content          |       |  GuardianScope    |       |  AI-Powered      |
|  Publisher        |<----->|  AVS Contract     |<----->|  Operators       |
|                   |       |                   |       |                   |
+-------------------+       +-------------------+       +-------------------+
```

## AVS User Flow

1. Content publisher submits content for moderation through the GuardianScope contract.
2. GuardianScope contract emits a `NewTaskCreated` event for the moderation request.
3. All registered and staked Operators receive this request and process it through their AI models.
4. Each Operator generates a moderation decision (approve/reject), hashes it with the content, and signs the hash.
5. Operators submit their signed decisions back to the GuardianScope contract.
6. The contract verifies operator eligibility and stake before accepting the submission.

This flow demonstrates how GuardianScope leverages EigenLayer's security and AI-powered operators for decentralized content moderation.

## Local Devnet Deployment

The following instructions explain how to deploy GuardianScope from scratch including EigenLayer and AVS specific contracts using Foundry to a local anvil chain, and start the AI-powered Operator application.

### Development Environment

#### Non-Nix Environment
Install dependencies:
- Node
- Typescript
- ts-node
- tcs
- npm
- Foundry
- ethers
- Python 3.9+ (for AI models)
- PyTorch

#### Nix Environment
On Nix platforms:
```bash
nix develop
```

### Quick Start

#### Start Anvil Chain
In terminal window #1:
```bash
# Install npm packages
npm install

# Start local anvil chain
npm run start:anvil
```

#### Deploy Contracts and Start Operator
In terminal window #2:
```bash
# Setup .env files
cp .env.example .env
cp contracts/.env.example contracts/.env

# Build contracts
npm run build

# Deploy EigenLayer contracts
npm run deploy:core

# Deploy GuardianScope contracts
npm run deploy:guardianscope

# Start the AI-powered Operator
npm run start:operator
```

#### Test Content Moderation
In terminal window #3:
```bash
# Submit test content for moderation
npm run start:test-content
```

### Help and Support

For help and support deploying and modifying this repo:
1. Open a ticket via support.eigenlayer.xyz
2. Include environment details:
   - For local testing: Include debug logs with `--revert-strings debug`
   - For testnet: Provide transaction hashes and verified contracts

### Contact Us

If you're planning to build on GuardianScope or integrate it into your platform, please fill out [this form](https://eigenlayer.xyz/contact) and we'll be in touch.

### Disclaimers

- This repo is currently intended for local development testing
- Testnet deployment support will be added soon
- Production deployments should migrate to BLS signature architecture

### Testing

```bash
# Start anvil chain
anvil

# In another terminal
make deploy-eigenlayer-contracts
make deploy-guardianscope-contracts
make test-moderation
```

The operator application includes comprehensive tests for both the smart contracts and AI moderation components. Review the `test/` directory for detailed test cases.