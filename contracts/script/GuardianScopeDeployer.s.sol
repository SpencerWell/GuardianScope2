// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/Test.sol";
import {GuardianScopeDeploymentLib} from "./utils/GuardianScopeDeploymentLib.sol";
import {CoreDeploymentLib} from "./utils/CoreDeploymentLib.sol";
import {UpgradeableProxyLib} from "./utils/UpgradeableProxyLib.sol";
import {StrategyBase} from "@eigenlayer/contracts/strategies/StrategyBase.sol";
import {ERC20Mock} from "../test/ERC20Mock.sol";
import {TransparentUpgradeableProxy} from
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {StrategyFactory} from "@eigenlayer/contracts/strategies/StrategyFactory.sol";
import {StrategyManager} from "@eigenlayer/contracts/core/StrategyManager.sol";
import {IRewardsCoordinator} from "@eigenlayer/contracts/interfaces/IRewardsCoordinator.sol";

import {
    Quorum,
    StrategyParams,
    IStrategy
} from "@eigenlayer-middleware/src/interfaces/IECDSAStakeRegistryEventsAndErrors.sol";

import "forge-std/Test.sol";

contract GuardianScopeDeployer is Script, Test {
    using CoreDeploymentLib for *;
    using UpgradeableProxyLib for address;

    address private deployer;
    address proxyAdmin;
    address rewardsOwner;
    address rewardsInitiator;
    IStrategy guardianScopeStrategy;
    CoreDeploymentLib.DeploymentData coreDeployment;
    GuardianScopeDeploymentLib.DeploymentData guardianScopeDeployment;
    GuardianScopeDeploymentLib.DeploymentConfigData guardianScopeConfig;
    Quorum internal quorum;
    ERC20Mock token;

    function setUp() public virtual {
        // 从环境变量获取部署者私钥
        deployer = vm.rememberKey(vm.envUint("PRIVATE_KEY"));
        vm.label(deployer, "Deployer");

        // 读取配置文件
        guardianScopeConfig = GuardianScopeDeploymentLib.readDeploymentConfigValues(
            "config/guardianscope/",
            block.chainid
        );

        // 读取核心部署数据
        coreDeployment = CoreDeploymentLib.readDeploymentJson(
            "deployments/core/",
            block.chainid
        );
    }

    function run() external {
        vm.startBroadcast(deployer);
        
        // 设置奖励相关地址
        rewardsOwner = guardianScopeConfig.rewardsOwner;
        rewardsInitiator = guardianScopeConfig.rewardsInitiator;

        // 部署模拟代币和策略
        token = new ERC20Mock();
        guardianScopeStrategy = IStrategy(
            StrategyFactory(coreDeployment.strategyFactory).deployNewStrategy(token)
        );

        // 设置 Quorum 参数
        quorum.strategies.push(
            StrategyParams({
                strategy: guardianScopeStrategy,
                multiplier: 10_000
            })
        );

        // 部署代理管理员
        proxyAdmin = UpgradeableProxyLib.deployProxyAdmin();

        // 部署 GuardianScope 合约
        guardianScopeDeployment = GuardianScopeDeploymentLib.deployContracts(
            proxyAdmin,
            coreDeployment,
            quorum,
            rewardsInitiator,
            rewardsOwner
        );

        // 设置策略和代币地址
        guardianScopeDeployment.strategy = address(guardianScopeStrategy);
        guardianScopeDeployment.token = address(token);

        vm.stopBroadcast();
        
        // 验证部署
        verifyDeployment();
        
        // 写入部署数据
        GuardianScopeDeploymentLib.writeDeploymentJson(guardianScopeDeployment);
    }

    function verifyDeployment() internal view {
        require(
            guardianScopeDeployment.stakeRegistry != address(0),
            "StakeRegistry address cannot be zero"
        );
        require(
            guardianScopeDeployment.guardianScopeServiceManager != address(0),
            "GuardianScopeServiceManager address cannot be zero"
        );
        require(
            guardianScopeDeployment.strategy != address(0),
            "Strategy address cannot be zero"
        );
        require(
            proxyAdmin != address(0),
            "ProxyAdmin address cannot be zero"
        );
        require(
            coreDeployment.delegationManager != address(0),
            "DelegationManager address cannot be zero"
        );
        require(
            coreDeployment.avsDirectory != address(0),
            "AVSDirectory address cannot be zero"
        );
    }
}