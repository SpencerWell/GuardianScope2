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
import {IERC20, StrategyFactory} from "@eigenlayer/contracts/strategies/StrategyFactory.sol";
import {Test, console2 as console} from "forge-std/Test.sol";
import {IGuardianScopeServiceManager} from "../src/IGuardianScopeServiceManager.sol";
import {ECDSAUpgradeable} from
    "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";

// 基础设置合约
contract GuardianScopeTestSetup is Test {
    // ... [保持原有的导入和设置代码] ...

    struct ModerationResult {
        bool approved;
        string reason;
    }

    // 创建审核任务
    function createModerationTask(
        TrafficGenerator memory generator,
        string memory content
    ) internal {
        IGuardianScopeServiceManager guardianScope = IGuardianScopeServiceManager(
            guardianScopeDeployment.guardianScopeServiceManager
        );

        vm.prank(generator.key.addr);
        guardianScope.createModerationTask(content);
    }

    // 提交审核结果
    function submitModeration(
        Operator memory operator,
        uint32 taskId,
        bool approved,
        bytes memory signature
    ) internal {
        IGuardianScopeServiceManager guardianScope = IGuardianScopeServiceManager(
            guardianScopeDeployment.guardianScopeServiceManager
        );

        vm.prank(operator.key.addr);
        guardianScope.submitModeration(taskId, approved, signature);
    }
}

// 初始化测试
contract GuardianScopeInitializationTest is GuardianScopeTestSetup {
    function testInitialization() public {
        // ... [保持原有的初始化测试逻辑] ...
    }
}

// 操作员注册测试
contract GuardianScopeOperatorTest is GuardianScopeTestSetup {
    uint256 internal constant INITIAL_BALANCE = 100 ether;
    uint256 internal constant DEPOSIT_AMOUNT = 1 ether;
    uint256 internal constant OPERATOR_COUNT = 4;

    // ... [保持原有的操作员测试设置] ...

    function testOperatorRegistration() public {
        // ... [保持原有的操作员注册测试逻辑] ...
    }
}

// 内容审核任务测试
contract GuardianScopeModerationTest is GuardianScopeTestSetup {
    using ECDSAUpgradeable for bytes32;

    IGuardianScopeServiceManager internal guardianScope;
    
    function setUp() public override {
        super.setUp();
        guardianScope = IGuardianScopeServiceManager(
            guardianScopeDeployment.guardianScopeServiceManager
        );
        
        // 设置操作员
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

    function testSubmitModeration() public {
        // 创建任务
        string memory content = "Test content for moderation";
        vm.prank(generator.key.addr);
        guardianScope.createModerationTask(content);
        uint32 taskId = uint32(guardianScope.latestTaskNum() - 1);

        // 操作员提交审核结果
        bytes32 messageHash = keccak256(abi.encodePacked(content, true));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        bytes memory signature = signWithSigningKey(operators[0], ethSignedMessageHash);

        vm.prank(operators[0].key.addr);
        guardianScope.submitModeration(taskId, true, signature);

        // 验证结果
        (
            IGuardianScopeServiceManager.ModerationStatus status,
            uint32 approvalCount,
            uint32 rejectionCount,
            bool isCompleted
        ) = guardianScope.getTaskStatus(taskId);

        assertEq(approvalCount, 1, "Approval count should be 1");
        assertEq(uint256(status), uint256(IGuardianScopeServiceManager.ModerationStatus.PENDING), "Status should still be PENDING");
    }

    function testModerationConsensus() public {
        // 创建任务
        string memory content = "Test content for moderation";
        vm.prank(generator.key.addr);
        guardianScope.createModerationTask(content);
        uint32 taskId = uint32(guardianScope.latestTaskNum() - 1);

        // 多个操作员提交审核结果
        for (uint i = 0; i < 3; i++) {
            bytes32 messageHash = keccak256(abi.encodePacked(content, true));
            bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
            bytes memory signature = signWithSigningKey(operators[i], ethSignedMessageHash);

            vm.prank(operators[i].key.addr);
            guardianScope.submitModeration(taskId, true, signature);
        }

        // 验证共识达成
        (
            IGuardianScopeServiceManager.ModerationStatus status,
            uint32 approvalCount,
            ,
            bool isCompleted
        ) = guardianScope.getTaskStatus(taskId);

        assertEq(uint256(status), uint256(IGuardianScopeServiceManager.ModerationStatus.APPROVED), "Status should be APPROVED");
        assertEq(approvalCount, 3, "Should have 3 approvals");
        assertTrue(isCompleted, "Task should be completed");
    }

    function testRejectionConsensus() public {
        // 创建任务
        string memory content = "Inappropriate content for testing";
        vm.prank(generator.key.addr);
        guardianScope.createModerationTask(content);
        uint32 taskId = uint32(guardianScope.latestTaskNum() - 1);

        // 多个操作员提交拒绝结果
        for (uint i = 0; i < 3; i++) {
            bytes32 messageHash = keccak256(abi.encodePacked(content, false));
            bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
            bytes memory signature = signWithSigningKey(operators[i], ethSignedMessageHash);

            vm.prank(operators[i].key.addr);
            guardianScope.submitModeration(taskId, false, signature);
        }

        // 验证拒绝共识
        (
            IGuardianScopeServiceManager.ModerationStatus status,
            ,
            uint32 rejectionCount,
            bool isCompleted
        ) = guardianScope.getTaskStatus(taskId);

        assertEq(uint256(status), uint256(IGuardianScopeServiceManager.ModerationStatus.REJECTED), "Status should be REJECTED");
        assertEq(rejectionCount, 3, "Should have 3 rejections");
        assertTrue(isCompleted, "Task should be completed");
    }

    function _setupOperators() internal {
        for (uint i = 0; i < OPERATOR_COUNT; i++) {
            Operator memory operator = createAndAddOperator();
            mintMockTokens(operator, INITIAL_BALANCE);
            depositTokenIntoStrategy(operator, address(mockToken), DEPOSIT_AMOUNT);
            registerAsOperator(operator);
            registerOperatorToAVS(operator);
        }
    }
}