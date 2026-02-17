// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/DataCache.sol";

contract DeployDataCache is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        DataCache cache = new DataCache(deployer);
        console.log("DataCache deployed at:", address(cache));
    }
}
