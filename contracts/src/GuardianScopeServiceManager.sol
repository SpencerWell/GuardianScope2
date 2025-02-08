// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ECDSAServiceManagerBase} from
    "@eigenlayer-middleware/src/unaudited/ECDSAServiceManagerBase.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {IServiceManager} from "@eigenlayer-middleware/src/interfaces/IServiceManager.sol";
import {ECDSAUpgradeable} from
    "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC1271Upgradeable} from "@openzeppelin-upgrades/contracts/interfaces/IERC1271Upgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@eigenlayer/contracts/interfaces/IRewardsCoordinator.sol";

contract GuardianScopeServiceManager is ECDSAServiceManagerBase {
    using ECDSAUpgradeable for bytes32;

    // 内容审核状态枚举
    enum ModerationStatus {
        PENDING,   // 待审核
        APPROVED,  // 已批准
        REJECTED   // 已拒绝
    }

    // 审核任务结构
    struct ModerationTask {
        string content;              // 需要审核的内容
        address submitter;           // 提交者地址
        uint32 taskCreatedBlock;     // 创建区块
        ModerationStatus status;     // 审核状态
        uint32 approvalCount;        // 批准票数
        uint32 rejectionCount;       // 拒绝票数
        bool isCompleted;           // 是否完成
    }

    uint32 public latestTaskNum;
    uint32 public constant QUORUM_THRESHOLD = 3;  // 需要至少3个操作员达成共识

    // 任务索引到任务哈希的映射
    mapping(uint32 => bytes32) public allTaskHashes;
    // 操作员对任务的响应映射
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;
    // 任务索引到任务详情的映射
    mapping(uint32 => ModerationTask) public tasks;
    // 操作员对特定任务的投票记录
    mapping(uint32 => mapping(address => bool)) public hasVoted;

    event NewModerationTaskCreated(uint32 indexed taskId, string content, address submitter);
    event ModerationResponseSubmitted(uint32 indexed taskId, address operator, bool approved);
    event ModerationTaskCompleted(uint32 indexed taskId, ModerationStatus status);

    constructor(
        address _avsDirectory,
        address _stakeRegistry,
        address _rewardsCoordinator,
        address _delegationManager
    )
        ECDSAServiceManagerBase(
            _avsDirectory,
            _stakeRegistry,
            _rewardsCoordinator,
            _delegationManager
        )
    {}

    function initialize(
        address initialOwner,
        address _rewardsInitiator
    ) external initializer {
        __ServiceManagerBase_init(initialOwner, _rewardsInitiator);
    }

    // 创建新的内容审核任务
    function createModerationTask(
        string memory content
    ) external returns (ModerationTask memory) {
        require(bytes(content).length > 0, "Content cannot be empty");
        
        ModerationTask memory newTask = ModerationTask({
            content: content,
            submitter: msg.sender,
            taskCreatedBlock: uint32(block.number),
            status: ModerationStatus.PENDING,
            approvalCount: 0,
            rejectionCount: 0,
            isCompleted: false
        });

        tasks[latestTaskNum] = newTask;
        allTaskHashes[latestTaskNum] = keccak256(abi.encode(newTask));
        
        emit NewModerationTaskCreated(latestTaskNum, content, msg.sender);
        latestTaskNum = latestTaskNum + 1;

        return newTask;
    }

    // 提交审核结果
    function submitModeration(
        uint32 taskId,
        bool approved,
        bytes memory signature
    ) external {
        require(!tasks[taskId].isCompleted, "Task is already completed");
        require(!hasVoted[taskId][msg.sender], "Operator has already voted");
        
        // 验证操作员资格
        require(
            ECDSAStakeRegistry(stakeRegistry).operatorRegistered(msg.sender),
            "Not a registered operator"
        );

        // 验证签名
        bytes32 messageHash = keccak256(abi.encodePacked(tasks[taskId].content, approved));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        require(
            IERC1271Upgradeable.isValidSignature.selector == 
            ECDSAStakeRegistry(stakeRegistry).isValidSignature(ethSignedMessageHash, signature),
            "Invalid signature"
        );

        // 记录响应
        allTaskResponses[msg.sender][taskId] = signature;
        hasVoted[taskId][msg.sender] = true;

        // 更新计数
        if (approved) {
            tasks[taskId].approvalCount++;
        } else {
            tasks[taskId].rejectionCount++;
        }

        emit ModerationResponseSubmitted(taskId, msg.sender, approved);

        // 检查是否达到共识
        if (tasks[taskId].approvalCount >= QUORUM_THRESHOLD) {
            tasks[taskId].status = ModerationStatus.APPROVED;
            tasks[taskId].isCompleted = true;
            emit ModerationTaskCompleted(taskId, ModerationStatus.APPROVED);
        } else if (tasks[taskId].rejectionCount >= QUORUM_THRESHOLD) {
            tasks[taskId].status = ModerationStatus.REJECTED;
            tasks[taskId].isCompleted = true;
            emit ModerationTaskCompleted(taskId, ModerationStatus.REJECTED);
        }
    }

    // 获取任务状态
    function getTaskStatus(uint32 taskId) external view returns (
        ModerationStatus status,
        uint32 approvalCount,
        uint32 rejectionCount,
        bool isCompleted
    ) {
        ModerationTask storage task = tasks[taskId];
        return (task.status, task.approvalCount, task.rejectionCount, task.isCompleted);
    }
}