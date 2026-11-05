// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FinalityAnchor — ChainLens measurement anchoring on Portaldot V3
/// @notice Stores ChainLens finality snapshots (measured live from four
///         testnets) as immutable on-chain records on Portaldot V3.
///         ChainLens measures read-only; this contract is the write path
///         that makes those measurements verifiable by anyone, forever.
/// @dev    Deployment status (2026-11-05): bytecode compiles clean; deploy is
///         gated on Portaldot V3's Revive account-mapping — see
///         docs/ANCHOR-STATUS.md in the ChainLens repo for the full,
///         transaction-level evidence of the attempts.
contract FinalityAnchor {
    struct Snapshot {
        uint64 anchoredAt;        // unix time the anchor transaction was mined
        uint64 portaldotBlock;    // Portaldot V3 block height at measurement
        uint32 portaldotFinalitySec;
        uint32 sepoliaFinalitySec;
        uint32 baseFinalitySec;
        uint32 amoyFinalitySec;   // 0 = n/a (Heimdall checkpoints, see methodology)
    }

    address public immutable owner;
    Snapshot public latest;
    uint256 public anchorCount;

    event Anchored(
        uint256 indexed anchorIndex,
        uint64 portaldotBlock,
        uint32 portaldotFinalitySec,
        uint32 sepoliaFinalitySec,
        uint32 baseFinalitySec,
        uint32 amoyFinalitySec
    );

    constructor() {
        owner = msg.sender;
    }

    /// @notice Anchor one ChainLens measurement snapshot.
    function anchor(
        uint64 portaldotBlock,
        uint32 portaldotFinalitySec,
        uint32 sepoliaFinalitySec,
        uint32 baseFinalitySec,
        uint32 amoyFinalitySec
    ) external {
        require(msg.sender == owner, "only the ChainLens operator");
        latest = Snapshot({
            anchoredAt: uint64(block.timestamp),
            portaldotBlock: portaldotBlock,
            portaldotFinalitySec: portaldotFinalitySec,
            sepoliaFinalitySec: sepoliaFinalitySec,
            baseFinalitySec: baseFinalitySec,
            amoyFinalitySec: amoyFinalitySec
        });
        emit Anchored(anchorCount, portaldotBlock, portaldotFinalitySec, sepoliaFinalitySec, baseFinalitySec, amoyFinalitySec);
        anchorCount += 1;
    }
}
