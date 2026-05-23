// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/MarketRegistry.sol";
import "../src/TraceRegistry.sol";

contract Deploy is Script {
    function run() external {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address agent = vm.envAddress("AGENT_ADDRESS");
        address resolver = vm.envAddress("RESOLVER_ADDRESS");

        vm.startBroadcast();

        MarketRegistry registry = new MarketRegistry(usdc, agent, resolver);
        TraceRegistry traceReg = new TraceRegistry(agent);

        vm.stopBroadcast();

        console2.log("MarketRegistry:", address(registry));
        console2.log("TraceRegistry:", address(traceReg));
    }
}
