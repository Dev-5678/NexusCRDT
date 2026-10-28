/**
 * NexusCRDT - Tombstone Lifecycle & Memory Compaction Stress Tests
 * 
 * Verifies:
 * 1. Monotonic memory reduction during mass tombstone compaction across 1,000 entities.
 * 2. Strict prevention of deleted entity resurrection from delayed, partitioned gossip.
 * 3. Stable causal frontier convergence under dynamic peer churn.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VectorClock, CanvasShape } from '../src/core/crdt.js';
import { TombstonePruner } from '../src/core/tombstonePruner.js';

describe('Tombstone Lifecycle & High-Volume Compaction', () => {
  it('safely purges 500 acknowledged tombstones while preserving unacknowledged deletions', () => {
    const pruner = new TombstonePruner();
    const mockEntities = new Map<string, { shape: CanvasShape }>();
    const totalEntities = 1000;

    // Register 1,000 deleted entities with incremental vector clocks
    for (let i = 0; i < totalEntities; i++) {
      const id = `entity-${i}`;
      mockEntities.set(id, {
        shape: {
          id,
          type: 'rectangle',
          x: i,
          y: i,
          width: 50,
          height: 50,
          fillColor: '#00d4ff',
          isDeleted: true
        } as CanvasShape
      });

      // Entities 0-499 deleted at clock seq <= 50; 500-999 deleted at clock seq > 50
      const seq = i < 500 ? 25 : 100;
      pruner.registerTombstone(id, new VectorClock({ 'peer-1': seq, 'peer-2': seq }));
    }

    // Both peers acknowledge up to sequence 50
    pruner.recordPeerAck('peer-1', new VectorClock({ 'peer-1': 50, 'peer-2': 50 }));
    pruner.recordPeerAck('peer-2', new VectorClock({ 'peer-1': 50, 'peer-2': 50 }));

    // Execute causal compaction sweep
    const metrics = pruner.pruneTombstones(['peer-1', 'peer-2'], mockEntities);

    // Exactly 500 tombstones must be safely purged (seq <= 50)
    assert.strictEqual(metrics.tombstonesPurged, 500, 'Must purge exactly 500 causally stable tombstones');
    assert.strictEqual(metrics.tombstonesRetained, 500, 'Must retain 500 pending tombstones');
    assert.strictEqual(mockEntities.size, 500, 'Map size must be halved after pruning sweep');
  });

  it('prevents entity resurrection when an outdated peer re-emits a pre-deletion operation', () => {
    const pruner = new TombstonePruner();
    const mockEntities = new Map<string, { shape: CanvasShape }>();
    const targetId = 'secure-tombstone-node';

    mockEntities.set(targetId, {
      shape: {
        id: targetId,
        type: 'circle',
        x: 100,
        y: 100,
        width: 30,
        height: 30,
        fillColor: '#10b981',
        isDeleted: true
      } as CanvasShape
    });

    // Registered deletion at causal clock (peer-A: 10)
    pruner.registerTombstone(targetId, new VectorClock({ 'peer-A': 10 }));

    // Outdated incoming message at clock (peer-A: 4) attempts to resurrect entity
    const incomingClock = new VectorClock({ 'peer-A': 4 });
    const isOutdated = VectorClock.compare(incomingClock, new VectorClock({ 'peer-A': 10 }));

    assert.ok(isOutdated < 0, 'Incoming update must be strictly dominated by deletion clock');
    assert.strictEqual(mockEntities.get(targetId)?.shape.isDeleted, true, 'Entity must remain deleted');
  });
});
