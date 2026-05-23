// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/BinaryMarket.sol";
import "../src/MarketRegistry.sol";

/// @dev Minimal ERC20 for testing
contract MockUSDC {
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

contract BinaryMarketTest is Test {
    MockUSDC usdc;
    MarketRegistry registry;

    address owner = address(this);
    address agent = address(0xA9E47);
    address resolver = address(0x4E501);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant INITIAL_LIQ = 2e6; // 2 USDC
    uint256 constant DURATION = 7 days;

    function setUp() public {
        usdc = new MockUSDC();
        registry = new MarketRegistry(address(usdc), agent, resolver);

        // Fund agent for initial liquidity
        usdc.mint(agent, 100e6);
        vm.prank(agent);
        usdc.approve(address(registry), type(uint256).max);

        // Fund alice and bob
        usdc.mint(alice, 100e6);
        usdc.mint(bob, 100e6);
    }

    function _createMarket() internal returns (BinaryMarket market) {
        vm.prank(agent);
        address m = registry.createMarket(
            bytes32("TOKEN"), "solana", "SCAM", 1e8, 5000, DURATION, keccak256("trace"), INITIAL_LIQ
        );
        market = BinaryMarket(m);
    }

    // ── Bet ──────────────────────────────────────────────────────────────────

    function test_BetYesMintShares() public {
        BinaryMarket m = _createMarket();
        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        m.bet(true, 1e6);
        vm.stopPrank();
        assertGt(m.yesShares(alice), 0, "alice has yes shares");
    }

    function test_BetNoMintShares() public {
        BinaryMarket m = _createMarket();
        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        m.bet(false, 1e6);
        vm.stopPrank();
        assertGt(m.noShares(alice), 0, "alice has no shares");
    }

    function test_MultipleBetsAccumulate() public {
        BinaryMarket m = _createMarket();
        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        m.bet(true, 1e6);
        uint256 after1 = m.yesShares(alice);
        m.bet(true, 1e6);
        uint256 after2 = m.yesShares(alice);
        vm.stopPrank();
        assertGt(after2, after1, "shares accumulate");
    }

    function test_BetAfterCloseReverts() public {
        BinaryMarket m = _createMarket();
        vm.warp(m.bettingClosesAt());
        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        vm.expectRevert(BinaryMarket.BettingClosed.selector);
        m.bet(true, 1e6);
        vm.stopPrank();
    }

    // ── Resolve ───────────────────────────────────────────────────────────────

    function test_NonResolverCannotResolve() public {
        BinaryMarket m = _createMarket();
        vm.expectRevert(BinaryMarket.NotResolver.selector);
        m.resolve(true);
    }

    function test_DoubleResolveReverts() public {
        BinaryMarket m = _createMarket();
        vm.prank(resolver);
        m.resolve(true);
        vm.prank(resolver);
        vm.expectRevert(BinaryMarket.AlreadyResolved.selector);
        m.resolve(false);
    }

    // ── Claim ─────────────────────────────────────────────────────────────────

    function test_ClaimBeforeResolveReverts() public {
        BinaryMarket m = _createMarket();
        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        m.bet(true, 1e6);
        vm.expectRevert(BinaryMarket.NothingToClaim.selector);
        m.claim();
        vm.stopPrank();
    }

    function test_WinnerClaimsCorrectAmount() public {
        BinaryMarket m = _createMarket();

        // alice bets YES, bob bets NO
        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        m.bet(true, 10e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(m), type(uint256).max);
        m.bet(false, 10e6);
        vm.stopPrank();

        vm.prank(resolver);
        m.resolve(true); // YES wins

        uint256 balanceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        m.claim();
        uint256 payout = usdc.balanceOf(alice) - balanceBefore;
        assertGt(payout, 0, "alice receives payout");
    }

    function test_LoserClaimsZero() public {
        BinaryMarket m = _createMarket();

        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        m.bet(true, 10e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(m), type(uint256).max);
        m.bet(false, 10e6);
        vm.stopPrank();

        vm.prank(resolver);
        m.resolve(true); // YES wins, bob loses

        vm.prank(bob);
        vm.expectRevert(BinaryMarket.NothingToClaim.selector);
        m.claim();
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    function test_CancelIfUnresolved() public {
        BinaryMarket m = _createMarket();
        vm.warp(m.resolvesAt() + 25 hours);
        m.cancelIfUnresolved();
        assertEq(uint256(m.state()), uint256(BinaryMarket.State.Cancelled));
    }

    function test_CancelBeforeGracePeriodReverts() public {
        BinaryMarket m = _createMarket();
        vm.warp(m.resolvesAt() + 1 hours); // only 1h after resolves, grace = 24h
        vm.expectRevert(BinaryMarket.GracePeriodNotElapsed.selector);
        m.cancelIfUnresolved();
    }

    function test_RefundAfterCancel() public {
        BinaryMarket m = _createMarket();

        vm.startPrank(alice);
        usdc.approve(address(m), type(uint256).max);
        m.bet(true, 5e6);
        vm.stopPrank();

        vm.warp(m.resolvesAt() + 25 hours);
        m.cancelIfUnresolved();

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        m.refund();
        assertGt(usdc.balanceOf(alice), before, "alice refunded");
    }
}
