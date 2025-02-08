// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import {GuardianScopeServiceManager} from "../src/GuardianScopeServiceManager.sol";
import {MockAVSDeployer} from "@eigenlayer-middleware/test/utils/MockAVSDeployer.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {Vm} from "forge-std/Vm.sol";
import {console2} from "forge-std/Test.sol";
import {GuardianScopeDeploymentLib} from "../script/utils/GuardianScopeDeploymentLib.sol";
import {CoreDeploymentLib} from "../script/utils/CoreDeploymentLib.sol";
import {UpgradeableProxyLib} from "../script/utils/UpgradeableProxyLib.sol";
import {ERC20Mock} from "./ERC20Mock.sol";
import {Test, console2 as console} from "forge-std/Test.sol";
import {IGuardianScopeServiceManager} from "../src/IGuardianScopeServiceManager.sol";
import {ECDSAUpgradeable} from "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import {IStrategy} from "@eigenlayer/contracts/interfaces/IStrategy.sol";
import {IStrategyManager} from "@eigenlayer/contracts/interfaces/IStrategyManager.sol";
import {IDelegationManager} from "@eigenlayer/contracts/interfaces/IDelegationManager.sol";
import {ISignatureUtils} from "@eigenlayer/contracts/interfaces/ISignatureUtils.sol";
import {AVSDirectory} from "@eigenlayer/contracts/core/AVSDirectory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {StrategyFactory} from "@eigenlayer/contracts/strategies/StrategyFactory.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract GuardianScopeTestSetup is Test {
    using ECDSAUpgradeable for bytes32;

    struct Operator {
        Vm.Wallet key;
        Vm.Wallet signingKey;
    }

    struct TrafficGenerator {
        Vm.Wallet key;
    }

    struct AVSOwner {
        Vm.Wallet key;
    }

    Operator[] internal operators;
    TrafficGenerator internal generator;
    AVSOwner internal owner;

    GuardianScopeDeploymentLib.DeploymentData internal guardianScopeDeployment;
    CoreDeploymentLib.DeploymentData internal coreDeployment;
    CoreDeploymentLib.DeploymentConfigData coreConfigData;

    ERC20Mock public mockToken;
    mapping(address => IStrategy) public tokenToStrategy;
    IStrategyManager public strategyManager;

    uint256 internal constant INITIAL_BALANCE = 100 ether;
    uint256 internal constant DEPOSIT_AMOUNT = 1 ether;
    uint256 internal constant OPERATOR_COUNT = 4;

    function setUp() public virtual {
        generator = TrafficGenerator({
            key: vm.createWallet("generator_wallet")
        });
        owner = AVSOwner({
            key: vm.createWallet("owner_wallet")
        });

        address proxyAdmin = UpgradeableProxyLib.deployProxyAdmin();
        coreConfigData = CoreDeploymentLib.readDeploymentConfigValues("test/mockData/config/core/", 1337);
        coreDeployment = CoreDeploymentLib.deployContracts(proxyAdmin, coreConfigData);

        mockToken = new ERC20Mock();
        strategyManager = IStrategyManager(coreDeployment.strategyManager);

        // Create strategy for mock token
        IStrategy strategy = IStrategy(
            StrategyFactory(coreDeployment.strategyFactory).deployNewStrategy(mockToken)
        );
        tokenToStrategy[address(mockToken)] = strategy;

        guardianScopeDeployment = GuardianScopeDeploymentLib.deployContracts(
            proxyAdmin,
            coreDeployment,
            ECDSAStakeRegistry(address(0)).quorum(),
            owner.key.addr,
            owner.key.addr
        );

        labelContracts();
    }

    function createAndAddOperator() internal returns (Operator memory) {
        Vm.Wallet memory operatorKey = vm.createWallet(
            string.concat("operator", vm.toString(operators.length))
        );
        Vm.Wallet memory signingKey = vm.createWallet(
            string.concat("signing", vm.toString(operators.length))
        );

        Operator memory newOperator = Operator({
            key: operatorKey,
            signingKey: signingKey
        });

        operators.push(newOperator);
        return newOperator;
    }

    function labelContracts() internal {
        vm.label(coreDeployment.delegationManager, "DelegationManager");
        vm.label(coreDeployment.avsDirectory, "AVSDirectory");
        vm.label(coreDeployment.strategyManager, "StrategyManager");
        vm.label(guardianScopeDeployment.guardianScopeServiceManager, "GuardianScopeServiceManager");
        vm.label(guardianScopeDeployment.stakeRegistry, "StakeRegistry");
    }

    function createModerationTask(
        TrafficGenerator memory _generator,
        string memory content
    ) internal {
        IGuardianScopeServiceManager guardianScope = IGuardianScopeServiceManager(
            guardianScopeDeployment.guardianScopeServiceManager
        );

        vm.prank(_generator.key.addr);
        guardianScope.createModerationTask(content);
    }

    function submitModeration(
        Operator memory operator,
        uint32 taskId,
        bool approved
    ) internal {
        IGuardianScopeServiceManager guardianScope = IGuardianScopeServiceManager(
            guardianScopeDeployment.guardianScopeServiceManager
        );

        bytes32 messageHash = keccak256(abi.encodePacked(taskId, approved));
        bytes memory signature = signMessage(operator.signingKey, messageHash);

        vm.prank(operator.key.addr);
        guardianScope.submitModeration(taskId, approved, signature);
    }

    function signMessage(
        Vm.Wallet memory wallet,
        bytes32 messageHash
    ) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wallet.privateKey, messageHash);
        return abi.encodePacked(r, s, v);
    }

    function mintMockTokens(Operator memory operator, uint256 amount) internal {
        mockToken.mint(operator.key.addr, amount);
    }

    function depositTokenIntoStrategy(
        Operator memory operator,
        address token,
        uint256 amount
    ) internal {
        IStrategy strategy = tokenToStrategy[token];
        require(address(strategy) != address(0), "Strategy not found");
        
        vm.startPrank(operator.key.addr);
        mockToken.approve(address(strategyManager), amount);
        strategyManager.depositIntoStrategy(strategy, IERC20(token), amount);
        vm.stopPrank();
    }

    function registerOperatorToAVS(Operator memory operator) internal {
        ECDSAStakeRegistry stakeRegistry = ECDSAStakeRegistry(guardianScopeDeployment.stakeRegistry);
        AVSDirectory avsDirectory = AVSDirectory(coreDeployment.avsDirectory);

        bytes32 salt = keccak256(abi.encodePacked(block.timestamp, operator.key.addr));
        uint256 expiry = block.timestamp + 1 hours;

        bytes32 operatorRegistrationDigestHash = avsDirectory.calculateOperatorAVSRegistrationDigestHash(
            operator.key.addr,
            address(guardianScopeDeployment.guardianScopeServiceManager),
            salt,
            expiry
        );

        bytes memory signature = signMessage(operator.key, operatorRegistrationDigestHash);

        ISignatureUtils.SignatureWithSaltAndExpiry memory operatorSignature = ISignatureUtils
            .SignatureWithSaltAndExpiry({
                signature: signature,
                salt: salt,
                expiry: expiry
            });

        vm.prank(operator.key.addr);
        stakeRegistry.registerOperatorWithSignature(operatorSignature, operator.signingKey.addr);
    }
}

contract GuardianScopeInitializationTest is GuardianScopeTestSetup {
    function testInitialization() public {
        assertTrue(
            guardianScopeDeployment.guardianScopeServiceManager != address(0),
            "GuardianScopeServiceManager not deployed"
        );
        assertTrue(
            guardianScopeDeployment.stakeRegistry != address(0),
            "StakeRegistry not deployed"
        );
    }
}

contract GuardianScopeModerationTest is GuardianScopeTestSetup {
    IGuardianScopeServiceManager internal guardianScope;
    
    function setUp() public override {
        super.setUp();
        guardianScope = IGuardianScopeServiceManager(
            guardianScopeDeployment.guardianScopeServiceManager
        );
        
        _setupOperators();
    }

    function testCreateModerationTask() public {
        string memory content = "Test content for moderation";
        
        vm.prank(generator.key.addr);
        IGuardianScopeServiceManager.ModerationTask memory task = 
            guardianScope.createModerationTask(content);

        assertEq(task.content, content, "Content not set correctly");
        assertEq(task.submitter, generator.key.addr, "Submitter not set correctly");
        assertEq(uint256(task.status), uint256(IGuardianScopeServiceManager.ModerationStatus.PENDING), "Status should be PENDING");
        assertEq(task.taskCreatedBlock, uint32(block.number), "Block number not set correctly");
    }

    function _setupOperators() internal {
        for (uint i = 0; i < OPERATOR_COUNT; i++) {
            Operator memory operator = createAndAddOperator();
            mintMockTokens(operator, INITIAL_BALANCE);
            depositTokenIntoStrategy(operator, address(mockToken), DEPOSIT_AMOUNT);
            registerOperatorToAVS(operator);
        }
    }
}