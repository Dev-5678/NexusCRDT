/**
 * NexusCRDT - Tombstone Pruner Unit Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VectorClock, CanvasShape } from '../src/core/crdt';
import { TombstonePruner } from '../src/core/tombstonePruner';

describe('Causal Tombstone Garbage Collector', () => {
  it('correctly records peer acknowledged vector clocks', () => {
    const pruner = new TombstonePruner();
    const clockA = new VectorClock({ peerA: 5, peerB: 3 });

    pruner.recordPeerAck('peerA', clockA);
    const frontier = pruner.computeStableFrontier(['peerA']);

    assert.strictEqual(frontier.get('peerA'), 5);
    assert.strictEqual(frontier.get('peerB'), 3);
  });

  it('computes the greatest lower bound across heterogeneous peer clocks', () => {
    const pruner = new TombstonePruner();
    const clockA = new VectorClock({ peerA: 10, peerB: 5 });
    const clockB = new VectorClock({ peerA: 7, peerB: 9 });

    pruner.recordPeerAck('peerA', clockA);
    pruner.recordPeerAck('peerB', clockB);

    const frontier = pruner.computeStableFrontier(['peerA', 'peerB']);

    // Minimum sequence numbers: peerA is 7, peerB is 5
    assert.strictEqual(frontier.get('peerA'), 7);
    assert.strictEqual(frontier.get('peerB'), 5);
  });

  it('safely purges tombstones that are causally dominated by the frontier', () => {
    const pruner = new TombstonePruner();
    const mockShapes = new Map<string, { shape: CanvasShape }>();

    // Setup dummy shape
    const shapeId = 'shape-deleted-1';
    mockShapes.set(shapeId, {
      shape: {
        id: shapeId,
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 100,
        strokeColor: '#000',
        fillColor: '#fff',
        strokeWidth: 2,
        zIndex: 1,
        isDeleted: true,
      },
    });

    // Deletion happened at peerA: 4, peerB: 2
    const delClock = new VectorClock({ peerA: 4, peerB: 2 });
    pruner.registerTombstone(shapeId, delClock, Date.now());

    // Both peers acknowledge past this point
    pruner.recordPeerAck('peerA', new VectorClock({ peerA: 6, peerB: 3 }));
    pruner.recordPeerAck('peerB', new VectorClock({ peerA: 5, peerB: 4 }));

    const metrics = pruner.prune(['peerA', 'peerB'], mockShapes);

    assert.strictEqual(metrics.tombstonesPurged, 1);
    assert.strictEqual(metrics.tombstonesRetained, 0);
    assert.strictEqual(mockShapes.has(shapeId), false);
    assert.strictEqual(pruner.getRegisteredTombstoneCount(), 0);
  });

  it('retains tombstones when an active peer has not observed the deletion', () => {
    const pruner = new TombstonePruner();
    const mockShapes = new Map<string, { shape: CanvasShape }>();

    const shapeId = 'shape-lagging-peer';
    mockShapes.set(shapeId, {
      shape: {
        id: shapeId,
        type: 'ellipse',
        x: 50,
        y: 50,
        width: 80,
        height: 80,
        strokeColor: '#333',
        fillColor: '#eee',
        strokeWidth: 1,
        zIndex: 2,
        isDeleted: true,
      },
    });

    // Deletion happened at peerA: 8
    const delClock = new VectorClock({ peerA: 8 });
    pruner.registerTombstone(shapeId, delClock, Date.now());

    // peerB is lagging and only knows peerA up to 5
    pruner.recordPeerAck('peerA', new VectorClock({ peerA: 10 }));
    pruner.recordPeerAck('peerB', new VectorClock({ peerA: 5 }));

    const metrics = pruner.prune(['peerA', 'peerB'], mockShapes);

    assert.strictEqual(metrics.tombstonesPurged, 0);
    assert.strictEqual(metrics.tombstonesRetained, 1);
    assert.strictEqual(mockShapes.has(shapeId), true);
    assert.strictEqual(pruner.getRegisteredTombstoneCount(), 1);
  });
});
