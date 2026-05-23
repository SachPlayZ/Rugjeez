// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @notice Binary prediction market: "Will token lose >thresholdBps within duration?"
/// All USDC amounts use 6-decimal ERC-20 interface.
/// Initial liquidity is seeded by the MarketRegistry after deployment (no constructor pull).
contract BinaryMarket {
    error BettingClosed();
    error AlreadyResolved();
    error NotResolver();
    error NothingToClaim();
    error GracePeriodNotElapsed();
    error MarketNotExpired();
    error TransferFailed();
    error ZeroAmount();
    error AlreadyCancelled();
    error MarketNotOpen();

    enum State {
        Open,
        Resolved,
        Cancelled
    }

    IERC20 public immutable USDC;

    // Market identity
    bytes32 public immutable tokenId;
    string public tokenChain;
    string public tokenSymbol;

    // Pricing reference
    uint256 public immutable baselinePrice; // 8-decimal USD
    uint256 public immutable thresholdBps; // typically 5000

    // Timing
    uint256 public immutable createdAt;
    uint256 public immutable resolvesAt;
    uint256 public immutable bettingClosesAt; // resolvesAt - 1h

    // Agent reasoning pointer
    bytes32 public immutable traceHash;

    // Resolver
    address public immutable resolver;

    // Pool state (6-decimal USDC)
    uint256 public yesPool;
    uint256 public noPool;
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;

    // Resolution
    State public state;
    bool public resolvedYes;

    event Bet(address indexed bettor, bool yes, uint256 amount, uint256 shares);
    event Resolved(bool yes);
    event Claimed(address indexed claimant, uint256 amount);
    event Cancelled();

    constructor(
        address usdc,
        address _resolver,
        bytes32 _tokenId,
        string memory _tokenChain,
        string memory _tokenSymbol,
        uint256 _baselinePrice,
        uint256 _thresholdBps,
        uint256 _duration,
        bytes32 _traceHash,
        uint256 _initialLiquidity // registry transfers this amount to us right after deploy
    ) {
        USDC = IERC20(usdc);
        resolver = _resolver;
        tokenId = _tokenId;
        tokenChain = _tokenChain;
        tokenSymbol = _tokenSymbol;
        baselinePrice = _baselinePrice;
        thresholdBps = _thresholdBps;
        traceHash = _traceHash;
        createdAt = block.timestamp;
        resolvesAt = block.timestamp + _duration;
        bettingClosesAt = resolvesAt - 1 hours;

        // Seed pools with values that registry will fund via transfer (no transferFrom here)
        uint256 half = _initialLiquidity / 2;
        yesPool = half;
        noPool = _initialLiquidity - half;
    }

    /// @notice Place a bet. Mints shares via constant-product formula.
    function bet(bool yes, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (block.timestamp >= bettingClosesAt) revert BettingClosed();
        if (state != State.Open) revert MarketNotOpen();

        bool ok = USDC.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        uint256 shares;
        if (yes) {
            shares = (amount * yesPool) / (noPool + amount);
            yesPool += amount;
            yesShares[msg.sender] += shares;
        } else {
            shares = (amount * noPool) / (yesPool + amount);
            noPool += amount;
            noShares[msg.sender] += shares;
        }

        emit Bet(msg.sender, yes, amount, shares);
    }

    /// @notice Resolver records the outcome.
    function resolve(bool yes) external {
        if (msg.sender != resolver) revert NotResolver();
        if (state == State.Resolved) revert AlreadyResolved();
        if (state == State.Cancelled) revert AlreadyCancelled();

        state = State.Resolved;
        resolvedYes = yes;
        emit Resolved(yes);
    }

    /// @notice Winners pull their proportional share of the total pool.
    function claim() external {
        if (state != State.Resolved) revert NothingToClaim();

        uint256 totalPool = yesPool + noPool;
        uint256 payout;

        if (resolvedYes) {
            uint256 shares = yesShares[msg.sender];
            if (shares == 0) revert NothingToClaim();
            yesShares[msg.sender] = 0;
            payout = (shares * totalPool) / yesPool;
        } else {
            uint256 shares = noShares[msg.sender];
            if (shares == 0) revert NothingToClaim();
            noShares[msg.sender] = 0;
            payout = (shares * totalPool) / noPool;
        }

        bool ok = USDC.transfer(msg.sender, payout);
        if (!ok) revert TransferFailed();
        emit Claimed(msg.sender, payout);
    }

    /// @notice Anyone can cancel an unresolved market 24h after resolvesAt.
    function cancelIfUnresolved() external {
        if (state != State.Open) revert MarketNotOpen();
        if (block.timestamp < resolvesAt) revert MarketNotExpired();
        if (block.timestamp < resolvesAt + 24 hours) revert GracePeriodNotElapsed();

        state = State.Cancelled;
        emit Cancelled();
    }

    /// @notice Proportional refund after cancellation.
    function refund() external {
        if (state != State.Cancelled) revert MarketNotOpen();

        uint256 totalPool = yesPool + noPool;
        uint256 yS = yesShares[msg.sender];
        uint256 nS = noShares[msg.sender];
        if (yS == 0 && nS == 0) revert NothingToClaim();

        uint256 payout = 0;
        if (yS > 0) {
            yesShares[msg.sender] = 0;
            payout += (yS * totalPool) / yesPool;
        }
        if (nS > 0) {
            noShares[msg.sender] = 0;
            payout += (nS * totalPool) / noPool;
        }

        bool ok = USDC.transfer(msg.sender, payout);
        if (!ok) revert TransferFailed();
        emit Claimed(msg.sender, payout);
    }
}
