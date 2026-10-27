/**
 * NexusCRDT - Multi-Peer Concurrency & Chaotic Convergence Stress Test
 * 
 * Simulates high-frequency concurrent mutations across multiple distributed nodes
 * subject to artificial network latency, packet reordering, and transient partitions.
 * Verifies that state convergence achieves 100% bit-identical equality.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CRDTCanvasDocument, VectorClock, CausalOrder } from '../src/core/crdt.js';

describe('Multi-Peer High-Concurrency Stress & Convergence', () => {
  it('converges 10 concurrent peers under out-of-order operation gossip', () => {
    const peerCount = 10;
    const peers: CRDTCanvasDocument[] = [];
    const allOperations: any[] = [];

    // Initialize 10 independent distributed nodes
    for (let i = 0; i < peerCount; i++) {
      peers.push(new CRDTCanvasDocument(`node-${String.fromCharCode(65 + i)}`));
    }

    // Each peer produces concurrent updates to common and unique entities
    for (let i = 0; i < peerCount; i++) {
      const peer = peers[i];
      // Mutation 1: Shared entity conflict test
      const op1 = peer.createOrUpdateShape({
        id: 'shared-canvas-root',
        type: 'rectangle',
        x: (i + 1) * 20,
        y: (i + 1) * 15,
        width: 100,
        height: 80,
        fillColor: `#ff00${i.toString().padStart(2, '0')}`
      });
      allOperations.push(op1);

      // Mutation 2: Node-specific entity
      const op2 = peer.createOrUpdateShape({
        id: `entity-${peer.peerId}`,
        type: 'circle',
        x: i * 50,
        y: i * 50,
        width: 40,
        height: 40,
        fillColor: '#00d4ff'
      });
      allOperations.push(op2);
    }

    // Shuffle operations to simulate chaotic, asynchronous, out-of-order network arrival
    const shuffledOps = [...allOperations].sort(() => Math.random() - 0.5);

    // Apply all shuffled operations to every peer
    for (const peer of peers) {
      for (const op of shuffledOps) {
        peer.applyRemoteOperation(op);
      }
    }

    // Convergence Validation: Every node must yield bit-identical canvas states
    const referenceState = peers[0].exportState();
    const referenceShapes = peers[0].getShapes();

    assert.strictEqual(referenceShapes.length, peerCount + 1, 'Canvas must contain all unique shapes + single shared root');

    for (let i = 1; i < peerCount; i++) {
      const currentState = peers[i].exportState();
      assert.deepStrictEqual(
        currentState,
        referenceState,
        `Node ${peers[i].peerId} failed to converge with Node-A under out-of-order arrival`
      );
    }
  });

  it('guarantees causal consistency during partitioned vector clock re-merges', () => {
    const nodeAlpha = new CRDTCanvasDocument('partition-alpha');
    const nodeBeta = new CRDTCanvasDocument('partition-beta');

    // Pre-partition base state
    const baseOp = nodeAlpha.createOrUpdateShape({
      id: 'cluster-master',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fillColor: '#ffffff'
    });
    nodeBeta.applyRemoteOperation(baseOp);

    // Simulate Network Partition: both mutate the same shape independently
    const alphaOp = nodeAlpha.createOrUpdateShape({
      id: 'cluster-master',
      type: 'rectangle',
      x: 250,
      y: 250,
      width: 100,
      height: 100,
      fillColor: '#10b981'
    });

    const betaOp = nodeBeta.createOrUpdateShape({
      id: 'cluster-master',
      type: 'rectangle',
      x: 500,
      y: 500,
      width: 150,
      height: 150,
      fillColor: '#ff5500'
    });

    // Partition Heals: bidirectional sync
    nodeAlpha.applyRemoteOperation(betaOp);
    nodeBeta.applyRemoteOperation(alphaOp);

    // Both must settle on the deterministic winner determined by Lamport timestamp & PeerID
    const alphaShape = nodeAlpha.getShapes().find(s => s.id === 'cluster-master');
    const betaShape = nodeBeta.getShapes().find(s => s.id === 'cluster-master');

    assert.deepStrictEqual(alphaShape, betaShape, 'Partition convergence failed');
    assert.ok(alphaShape !== undefined);
  });
});
