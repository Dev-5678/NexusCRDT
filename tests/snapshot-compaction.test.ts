/**
 * NexusCRDT - Delta Snapshot Compaction & Watermark Truncation Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

interface CanvasMutation {
  id: string;
  shapeId: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  attributes: Record<string, unknown>;
  lamport: number;
  peerId: string;
}

interface CompactedSnapshot {
  watermarkLamport: number;
  activeShapes: Map<string, Record<string, unknown>>;
  tombstones: Set<string>;
}

class SnapshotCompactor {
  public static compact(mutations: CanvasMutation[]): CompactedSnapshot {
    // Sort monotonically by Lamport timestamp, breaking ties deterministically by peerId
    const sorted = [...mutations].sort((a, b) => {
      if (a.lamport !== b.lamport) return a.lamport - b.lamport;
      return a.peerId.localeCompare(b.peerId);
    });

    const activeShapes = new Map<string, Record<string, unknown>>();
    const tombstones = new Set<string>();
    let maxLamport = 0;

    for (const op of sorted) {
      if (op.lamport > maxLamport) {
        maxLamport = op.lamport;
      }

      if (op.type === 'DELETE') {
        activeShapes.delete(op.shapeId);
        tombstones.add(op.shapeId);
      } else if (op.type === 'CREATE' || op.type === 'UPDATE') {
        if (!tombstones.has(op.shapeId)) {
          const current = activeShapes.get(op.shapeId) || {};
          activeShapes.set(op.shapeId, { ...current, ...op.attributes });
        }
      }
    }

    return {
      watermarkLamport: maxLamport,
      activeShapes,
      tombstones,
    };
  }
}

describe('Delta Snapshot Compaction & Watermark Truncation', () => {
  it('consolidates redundant intermediate updates into single terminal state', () => {
    const mutations: CanvasMutation[] = [
      { id: 'm1', shapeId: 'rect-1', type: 'CREATE', attributes: { x: 10, y: 10, color: 'red' }, lamport: 1, peerId: 'p1' },
      { id: 'm2', shapeId: 'rect-1', type: 'UPDATE', attributes: { x: 25 }, lamport: 2, peerId: 'p1' },
      { id: 'm3', shapeId: 'rect-1', type: 'UPDATE', attributes: { color: 'blue' }, lamport: 3, peerId: 'p2' },
      { id: 'm4', shapeId: 'circle-2', type: 'CREATE', attributes: { radius: 50 }, lamport: 4, peerId: 'p1' },
    ];

    const snapshot = SnapshotCompactor.compact(mutations);

    assert.strictEqual(snapshot.watermarkLamport, 4);
    assert.strictEqual(snapshot.activeShapes.size, 2);
    assert.deepStrictEqual(snapshot.activeShapes.get('rect-1'), { x: 25, y: 10, color: 'blue' });
    assert.deepStrictEqual(snapshot.activeShapes.get('circle-2'), { radius: 50 });
  });

  it('respects deletion tombstones and prunes active state accurately', () => {
    const mutations: CanvasMutation[] = [
      { id: 'm1', shapeId: 'line-1', type: 'CREATE', attributes: { length: 100 }, lamport: 1, peerId: 'p1' },
      { id: 'm2', shapeId: 'line-1', type: 'DELETE', attributes: {}, lamport: 5, peerId: 'p2' },
      { id: 'm3', shapeId: 'line-1', type: 'UPDATE', attributes: { length: 120 }, lamport: 3, peerId: 'p1' }, // Stale update prior to delete
    ];

    const snapshot = SnapshotCompactor.compact(mutations);

    assert.strictEqual(snapshot.watermarkLamport, 5);
    assert.strictEqual(snapshot.activeShapes.has('line-1'), false);
    assert.strictEqual(snapshot.tombstones.has('line-1'), true);
  });
});
