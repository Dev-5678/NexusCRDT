/**
 * NexusCRDT - Causal Tombstone Garbage Collection Engine
 * 
 * In state-based and operation-based CRDTs, deleted elements are retained as
 * tombstones to ensure commutative and idempotent reconciliation across out-of-order
 * network partitions.
 * 
 * Once every active peer in the network topology has causally acknowledged a vector clock
 * past the deletion operation, the tombstone can be safely purged from memory without
 * risk of resurrection.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { PeerID, VectorClock, CanvasShape } from './crdt';

export interface PeerAckRecord {
  peerId: PeerID;
  clock: VectorClock;
  lastSeenMs: number;
}

export interface PruneMetrics {
  totalTombstonesEvaluated: number;
  tombstonesPurged: number;
  tombstonesRetained: number;
  memoryReclaimedEstimateBytes: number;
  durationMs: number;
}

export class TombstonePruner {
  private peerClocks: Map<PeerID, PeerAckRecord>;
  private tombstoneRegistry: Map<string, { shapeId: string; deletedAtClock: VectorClock; deletedAtTimestamp: number }>;

  constructor() {
    this.peerClocks = new Map();
    this.tombstoneRegistry = new Map();
  }

  /**
   * Records or updates the acknowledged causal clock of a participating peer
   */
  public recordPeerAck(peerId: PeerID, clock: VectorClock): void {
    this.peerClocks.set(peerId, {
      peerId,
      clock: clock.clone(),
      lastSeenMs: Date.now(),
    });
  }

  /**
   * Registers a deleted shape tombstone with its causal deletion vector clock
   */
  public registerTombstone(shapeId: string, deletionClock: VectorClock, timestamp: number): void {
    this.tombstoneRegistry.set(shapeId, {
      shapeId,
      deletedAtClock: deletionClock.clone(),
      deletedAtTimestamp: timestamp,
    });
  }

  /**
   * Computes the greatest lower bound (stable frontier) vector clock
   * across all active participating peers in the cluster.
   */
  public computeStableFrontier(activePeers: PeerID[]): VectorClock {
    const stableClock = new VectorClock();
    if (activePeers.length === 0) return stableClock;

    const firstPeer = this.peerClocks.get(activePeers[0]);
    if (!firstPeer) return stableClock;

    // Initialize with first peer's clock
    const baseClock = firstPeer.clock.clone();
    const allKeys = Object.keys(baseClock.toJSON());

    for (const key of allKeys) {
      let minSeq = baseClock.get(key);
      for (const peerId of activePeers) {
        const peerRecord = this.peerClocks.get(peerId);
        if (!peerRecord) {
          minSeq = 0;
          break;
        }
        minSeq = Math.min(minSeq, peerRecord.clock.get(key));
      }
      if (minSeq > 0) {
        // Build stable clock
        for (let i = 0; i < minSeq; i++) {
          stableClock.increment(key);
        }
      }
    }

    return stableClock;
  }

  /**
   * Checks whether a tombstone deletion clock is strictly causally dominated
   * by the stable frontier (i.e. every peer has observed the deletion)
   */
  public isTombstoneStable(tombstoneClock: VectorClock, stableFrontier: VectorClock): boolean {
    const tombstoneKeys = Object.keys(tombstoneClock.toJSON());
    if (tombstoneKeys.length === 0) return true;

    for (const key of tombstoneKeys) {
      if (stableFrontier.get(key) < tombstoneClock.get(key)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Prunes all tombstones that are causally stable across active peers
   */
  public prune(activePeers: PeerID[], shapesMap: Map<string, { shape: CanvasShape }>): PruneMetrics {
    const startTime = performance.now();
    const stableFrontier = this.computeStableFrontier(activePeers);

    let tombstonesPurged = 0;
    let tombstonesRetained = 0;

    for (const [shapeId, meta] of this.tombstoneRegistry.entries()) {
      if (this.isTombstoneStable(meta.deletedAtClock, stableFrontier)) {
        // Safe to prune from shape storage and registry
        shapesMap.delete(shapeId);
        this.tombstoneRegistry.delete(shapeId);
        tombstonesPurged++;
      } else {
        tombstonesRetained++;
      }
    }

    const durationMs = performance.now() - startTime;
    const avgShapeBytes = 256;

    return {
      totalTombstonesEvaluated: tombstonesPurged + tombstonesRetained,
      tombstonesPurged,
      tombstonesRetained,
      memoryReclaimedEstimateBytes: tombstonesPurged * avgShapeBytes,
      durationMs,
    };
  }

  public getRegisteredTombstoneCount(): number {
    return this.tombstoneRegistry.size;
  }
}
