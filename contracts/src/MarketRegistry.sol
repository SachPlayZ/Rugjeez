// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {BinaryMarket} from "./BinaryMarket.sol";

/// @notice Factory and index for BinaryMarket instances. Only the agent can mint markets.
contract MarketRegistry {
    error NotAgent();
    error NotOwner();
    error ZeroAddress();
    error TransferFailed();

    address public owner;
    address public agent;
    address public resolver;
    address public immutable USDC;

    address[] private _markets;
    mapping(bytes32 => address[]) private _marketsByToken;

    event MarketCreated(
        address indexed market,
        bytes32 indexed tokenId,
        string tokenChain,
        string tokenSymbol,
        uint256 baselinePrice,
        uint256 thresholdBps,
        uint256 resolvesAt,
        bytes32 traceHash,
        uint256 yesPool,
        uint256 noPool
    );
    event AgentUpdated(address indexed newAgent);
    event ResolverUpdated(address indexed newResolver);

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _usdc, address _agent, address _resolver) {
        if (_usdc == address(0) || _agent == address(0) || _resolver == address(0)) revert ZeroAddress();
        owner = msg.sender;
        USDC = _usdc;
        agent = _agent;
        resolver = _resolver;
    }

    /// @notice Deploy a new BinaryMarket and seed it with initial liquidity.
    /// Agent must have pre-approved initialLiquidity USDC to this registry.
    function createMarket(
        bytes32 tokenId,
        string calldata tokenChain,
        string calldata tokenSymbol,
        uint256 baselinePrice,
        uint256 thresholdBps,
        uint256 duration,
        bytes32 traceHash,
        uint256 initialLiquidity
    ) external onlyAgent returns (address market) {
        // Pull liquidity from agent into registry
        bool pulled = IERC20(USDC).transferFrom(msg.sender, address(this), initialLiquidity);
        if (!pulled) revert TransferFailed();

        // Deploy market (pools are set in constructor, but no USDC pulled there)
        market = address(
            new BinaryMarket(
                USDC,
                resolver,
                tokenId,
                tokenChain,
                tokenSymbol,
                baselinePrice,
                thresholdBps,
                duration,
                traceHash,
                initialLiquidity
            )
        );

        // Seed the market with the pulled liquidity
        bool seeded = IERC20(USDC).transfer(market, initialLiquidity);
        if (!seeded) revert TransferFailed();

        _markets.push(market);
        _marketsByToken[tokenId].push(market);

        uint256 half = initialLiquidity / 2;
        emit MarketCreated(
            market,
            tokenId,
            tokenChain,
            tokenSymbol,
            baselinePrice,
            thresholdBps,
            block.timestamp + duration,
            traceHash,
            half,
            initialLiquidity - half
        );
    }

    function setAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        agent = _agent;
        emit AgentUpdated(_agent);
    }

    function setResolver(address _resolver) external onlyOwner {
        if (_resolver == address(0)) revert ZeroAddress();
        resolver = _resolver;
        emit ResolverUpdated(_resolver);
    }

    function getMarkets() external view returns (address[] memory) {
        return _markets;
    }

    function getMarketsByToken(bytes32 tokenId) external view returns (address[] memory) {
        return _marketsByToken[tokenId];
    }

    function marketCount() external view returns (uint256) {
        return _markets.length;
    }
}
