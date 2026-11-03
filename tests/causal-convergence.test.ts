/**
 * NexusCRDT - State Semilattice Convergence & Causal Partition Recovery Test Suite
 * 
 * Formally verifies mathematical CRDT properties guaranteeing Strong Eventual
 * Consistency (SEC) across distributed, partitioned, and high-concurrency topologies:
 * 
 * 1. Semilattice Commutativity:   merge(A, B) == merge(B, A)
 * 2. Semilattice Associativity:   merge(merge(A, B), C) == merge(A, merge(B, C))
 * 3. Semilattice Idempotency:     merge(A, A) == A
 * 4. Split-Brain Partition Recovery: Automatic conflict-free convergence when healing
 * 5. Deterministic Total Order: Lamport timestamp + PeerID tie-breaking on simultaneous writes
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CRDTCanvasDocument,
  VectorClock,
  CausalOrder,
  LWWRegister,
  CanvasShape,
  DeltaOperation,
} from '../src/core/crdt.js';

describe('State Semilattice Convergence & Causal Partition Recovery', () => {
  it('guarantees algebraic commutativity: merge(A, B) === merge(B, A) for arbitrary deltas', () => {
    const peer1 = new CRDTCanvasDocument('peer-us-east');
    const peer2 = new CRDTCanvasDocument('peer-eu-central');

    // Peer 1 generates operation A
    const opA = peer1.createOrUpdateShape({
      id: 'cluster-mesh-node',
      type: 'rectangle',
      x: 100,
      y: 200,
      width: 320,
      height: 180,
      fillColor: '#38bdf8',
    });

    // Peer 2 generates operation B
    const opB = peer2.createOrUpdateShape({
      id: 'cluster-mesh-node',
      type: 'rectangle',
      x: 150,
      y: 220,
      width: 400,
      height: 200,
      fillColor: '#10b981',
    });

    // Node Alpha applies A then B
    const nodeAlpha = new CRDTCanvasDocument('evaluator-alpha');
    nodeAlpha.applyRemoteDelta(opA);
    nodeAlpha.applyRemoteDelta(opB);

    // Node Beta applies B then A (reversed arrival)
    const nodeBeta = new CRDTCanvasDocument('evaluator-beta');
    nodeBeta.applyRemoteDelta(opB);
    nodeBeta.applyRemoteDelta(opA);

    const snapshotAlpha = nodeAlpha.getActiveShapes();
    const snapshotBeta = nodeBeta.getActiveShapes();

    assert.strictEqual(snapshotAlpha.length, 1);
    assert.strictEqual(snapshotBeta.length, 1);
    assert.deepStrictEqual(
      snapshotAlpha[0],
      snapshotBeta[0],
      'Commutativity violation: arrival order affected final convergent state'
    );
  });

  it('guarantees algebraic associativity: (A ∨ B) ∨ C === A ∨ (B ∨ C)', () => {
    const p1 = new CRDTCanvasDocument('node-1');
    const p2 = new CRDTCanvasDocument('node-2');
    const p3 = new CRDTCanvasDocument('node-3');

    const opA = p1.createOrUpdateShape({
      id: 'shared-matrix-root',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      text: 'version-1',
    });

    const opB = p2.createOrUpdateShape({
      id: 'shared-matrix-root',
      type: 'rectangle',
      x: 20,
      y: 20,
      width: 120,
      height: 120,
      text: 'version-2',
    });

    const opC = p3.createOrUpdateShape({
      id: 'shared-matrix-root',
      type: 'rectangle',
      x: 30,
      y: 30,
      width: 140,
      height: 140,
      text: 'version-3',
    });

    // Cluster 1: (A merge B) merge C
    const cluster1 = new CRDTCanvasDocument('cluster-1');
    cluster1.applyRemoteDelta(opA);
    cluster1.applyRemoteDelta(opB);
    cluster1.applyRemoteDelta(opC);

    // Cluster 2: A merge (B merge C)
    const cluster2 = new CRDTCanvasDocument('cluster-2');
    cluster2.applyRemoteDelta(opB);
    cluster2.applyRemoteDelta(opC);
    cluster2.applyRemoteDelta(opA);

    assert.deepStrictEqual(
      cluster1.getActiveShapes(),
      cluster2.getActiveShapes(),
      'Associativity violation: grouping affected convergent state'
    );
  });

  it('guarantees idempotency on duplicate packet amplification: merge(A, A) === A', () => {
    const producer = new CRDTCanvasDocument('packet-producer');
    const consumer = new CRDTCanvasDocument('packet-consumer');

    const op = producer.createOrUpdateShape({
      id: 'idempotent-entity-target',
      type: 'ellipse',
      x: 500,
      y: 500,
      width: 80,
      height: 80,
      fillColor: '#a855f7',
    });

    // Apply operation first time
    const appliedFirst = consumer.applyRemoteDelta(op);
    assert.strictEqual(appliedFirst, true);

    // Re-apply same operation 50 times (simulating UDP broadcast duplication)
    for (let i = 0; i < 50; i++) {
      const appliedDuplicate = consumer.applyRemoteDelta(op);
      assert.strictEqual(appliedDuplicate, false, 'Duplicate opId must be rejected idempotently');
    }

    const shapes = consumer.getActiveShapes();
    assert.strictEqual(shapes.length, 1);
    assert.strictEqual(shapes[0].id, 'idempotent-entity-target');
  });

  it('recovers with zero data loss after multi-peer network partition healing', () => {
    const peerEast = new CRDTCanvasDocument('peer-virginia');
    const peerWest = new CRDTCanvasDocument('peer-oregon');
    const peerAsia = new CRDTCanvasDocument('peer-singapore');

    // Initial synchronized baseline state
    const baseOp = peerEast.createOrUpdateShape({
      id: 'global-state-anchor',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 1000,
      height: 600,
    });
    peerWest.applyRemoteDelta(baseOp);
    peerAsia.applyRemoteDelta(baseOp);

    // --- NETWORK PARTITION OCCURS ---
    // Island 1 (East) mutates anchor and creates local entities
    const eastOp1 = peerEast.createOrUpdateShape({
      id: 'global-state-anchor',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 1000,
      height: 600,
      text: 'Updated by East',
    });
    const eastOp2 = peerEast.createOrUpdateShape({
      id: 'east-isolated-node',
      type: 'ellipse',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    });

    // Island 2 (West + Asia) mutate anchor and delete an entity
    const westOp1 = peerWest.createOrUpdateShape({
      id: 'global-state-anchor',
      type: 'rectangle',
      x: 20,
      y: 20,
      width: 1000,
      height: 600,
      text: 'Updated by West',
    });
    const asiaOp1 = peerAsia.createOrUpdateShape({
      id: 'asia-isolated-node',
      type: 'rectangle',
      x: 200,
      y: 200,
      width: 60,
      height: 60,
    });

    // West and Asia gossip between each other
    peerAsia.applyRemoteDelta(westOp1);
    peerWest.applyRemoteDelta(asiaOp1);

    // --- PARTITION HEALS: FULL CAUSAL GOSSIP FLOOD ---
    const allPartitionOps = [eastOp1, eastOp2, westOp1, asiaOp1];

    for (const op of allPartitionOps) {
      peerEast.applyRemoteDelta(op);
      peerWest.applyRemoteDelta(op);
      peerAsia.applyRemoteDelta(op);
    }

    const sortById = (shapes: CanvasShape[]) => [...shapes].sort((a, b) => a.id.localeCompare(b.id));

    const eastState = sortById(peerEast.getActiveShapes());
    const westState = sortById(peerWest.getActiveShapes());
    const asiaState = sortById(peerAsia.getActiveShapes());

    assert.strictEqual(eastState.length, 3, 'Must contain anchor + east node + asia node');
    assert.deepStrictEqual(eastState, westState, 'East and West must converge identically after partition heals');
    assert.deepStrictEqual(westState, asiaState, 'West and Asia must converge identically after partition heals');
  });

  it('guarantees deterministic total order tie-breaking for concurrent writes', () => {
    const registerA = new LWWRegister<string>('node-alpha-val', 100, 'peer-A');
    const registerB = new LWWRegister<string>('node-beta-val', 100, 'peer-B');

    // Identical Lamport timestamp (100) -> PeerID tie-breaker ('peer-B' > 'peer-A')
    const updated = registerA.merge('node-beta-val', 100, 'peer-B');
    assert.strictEqual(updated, true, 'peer-B must dominate peer-A on timestamp collision');
    assert.strictEqual(registerA.get(), 'node-beta-val');

    // Attempting to merge peer-A into peer-B on identical timestamp must fail
    const reverseUpdated = registerB.merge('node-alpha-val', 100, 'peer-A');
    assert.strictEqual(reverseUpdated, false, 'peer-A cannot dominate peer-B on timestamp collision');
    assert.strictEqual(registerB.get(), 'node-beta-val');
  });
});
