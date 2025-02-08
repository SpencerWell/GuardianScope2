// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IGuardianScopeServiceManager {
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

    // 事件定义
    event NewModerationTaskCreated(uint32 indexed taskId, string content, address submitter);
    event ModerationResponseSubmitted(uint32 indexed taskId, address operator, bool approved);
    event ModerationTaskCompleted(uint32 indexed taskId, ModerationStatus status);

    // 查询函数
    function latestTaskNum() external view returns (uint32);

    function allTaskHashes(uint32 taskId) external view returns (bytes32);

    function allTaskResponses(
        address operator,
        uint32 taskId
    ) external view returns (bytes memory);

    function tasks(uint32 taskId) external view returns (ModerationTask memory);

    // 状态查询函数
    function getTaskStatus(uint32 taskId) external view returns (
        ModerationStatus status,
        uint32 approvalCount,
        uint32 rejectionCount,
        bool isCompleted
    );

    // 操作函数
    function createModerationTask(
        string memory content
    ) external returns (ModerationTask memory);

    function submitModeration(
        uint32 taskId,
        bool approved,
        bytes calldata signature
    ) external;
}