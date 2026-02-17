//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployDataCache } from "./DeployDataCache.s.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        DeployDataCache deployDataCache = new DeployDataCache();
        deployDataCache.run();
    }
}
