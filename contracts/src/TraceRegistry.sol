// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Stores agent reasoning trace hashes on-chain for verifiability.
/// Agent records, anyone reads.
contract TraceRegistry {
    error AlreadyRecorded();
    error NotAgent();
    error ZeroAddress();

    address public agent;
    address public owner;

    struct TraceRecord {
        string ipfsCid;
        bytes signature;
        uint256 timestamp;
    }

    mapping(bytes32 => TraceRecord) private _traces;

    event TraceRecorded(bytes32 indexed traceHash, string ipfsCid, uint256 timestamp);
    event AgentUpdated(address indexed newAgent);

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    constructor(address _agent) {
        if (_agent == address(0)) revert ZeroAddress();
        owner = msg.sender;
        agent = _agent;
    }

    function recordTrace(bytes32 traceHash, string calldata ipfsCid, bytes calldata signature) external onlyAgent {
        if (bytes(_traces[traceHash].ipfsCid).length > 0) revert AlreadyRecorded();

        _traces[traceHash] = TraceRecord({ipfsCid: ipfsCid, signature: signature, timestamp: block.timestamp});

        emit TraceRecorded(traceHash, ipfsCid, block.timestamp);
    }

    function getTrace(bytes32 traceHash)
        external
        view
        returns (string memory ipfsCid, bytes memory signature, uint256 timestamp)
    {
        TraceRecord storage r = _traces[traceHash];
        return (r.ipfsCid, r.signature, r.timestamp);
    }

    function setAgent(address _agent) external {
        if (msg.sender != owner) revert NotAgent();
        if (_agent == address(0)) revert ZeroAddress();
        agent = _agent;
        emit AgentUpdated(_agent);
    }
}
