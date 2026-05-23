// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/BinaryMarket.sol";
import "../src/MarketRegistry.sol";
import "../src/TraceRegistry.sol";

/// @dev Same minimal ERC20 as BinaryMarket tests
contract MockUSDC2 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MarketRegistryTest is Test {
    MockUSDC2 usdc;
    MarketRegistry registry;
    TraceRegistry traceReg;

    address owner = address(this);
    address agent = address(0xA9E47);
    address resolver = address(0x4E501);
    address stranger = address(0x51234);

    uint256 constant INITIAL_LIQ = 2e6;
    uint256 constant DURATION = 7 days;

    function setUp() public {
        usdc = new MockUSDC2();
        registry = new MarketRegistry(address(usdc), agent, resolver);
        traceReg = new TraceRegistry(agent);

        usdc.mint(agent, 1000e6);
        vm.prank(agent);
        usdc.approve(address(registry), type(uint256).max);
    }

    function _createMarket() internal returns (address market) {
        vm.prank(agent);
        market = registry.createMarket(bytes32("TOKEN"), "bsc", "RUG", 1e8, 5000, DURATION, keccak256("t"), INITIAL_LIQ);
    }

    function test_OnlyAgentCanCreate() public {
        vm.prank(stranger);
        vm.expectRevert(MarketRegistry.NotAgent.selector);
        registry.createMarket(bytes32("T"), "bsc", "RUG", 1e8, 5000, DURATION, keccak256("t"), INITIAL_LIQ);
    }

    function test_CreateMarketRecorded() public {
        address m = _createMarket();
        address[] memory markets = registry.getMarkets();
        assertEq(markets.length, 1);
        assertEq(markets[0], m);
    }

    function test_GetMarketsByToken() public {
        _createMarket();
        address[] memory markets = registry.getMarketsByToken(bytes32("TOKEN"));
        assertEq(markets.length, 1);
    }

    function test_MarketSeededWithLiquidity() public {
        address m = _createMarket();
        BinaryMarket market = BinaryMarket(m);
        assertEq(market.yesPool() + market.noPool(), INITIAL_LIQ);
    }

    function test_SetAgentOnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(MarketRegistry.NotOwner.selector);
        registry.setAgent(stranger);
    }

    function test_SetResolverOnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(MarketRegistry.NotOwner.selector);
        registry.setResolver(stranger);
    }

    // TraceRegistry tests

    function test_RecordTrace() public {
        bytes32 hash = keccak256("reasoning");
        vm.prank(agent);
        traceReg.recordTrace(hash, "Qm123", hex"deadbeef");
        (string memory cid, bytes memory sig, uint256 ts) = traceReg.getTrace(hash);
        assertEq(cid, "Qm123");
        assertGt(ts, 0);
        assertEq(sig, hex"deadbeef");
    }

    function test_DoubleRecordReverts() public {
        bytes32 hash = keccak256("reasoning");
        vm.startPrank(agent);
        traceReg.recordTrace(hash, "Qm123", hex"");
        vm.expectRevert(TraceRegistry.AlreadyRecorded.selector);
        traceReg.recordTrace(hash, "Qm456", hex"");
        vm.stopPrank();
    }

    function test_NonAgentCannotRecord() public {
        vm.prank(stranger);
        vm.expectRevert(TraceRegistry.NotAgent.selector);
        traceReg.recordTrace(keccak256("x"), "Qm", hex"");
    }
}
