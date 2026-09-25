/**
 * NexusCRDT - High-Throughput Synchronization Benchmark
 * 
 * Simulates high-density concurrent operations across a 10-node
 * mesh topology to benchmark delta merge throughput and latency.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { CRDTCanvasDocument, DeltaOperation } from '../src/core/crdt.js';

function runBenchmark() {
  console.log('====================================================');
  console.log(' NexusCRDT // High-Concurrency Convergence Benchmark');
  console.log('====================================================\n');

  const NODE_COUNT = 10;
  const OPERATIONS_PER_NODE = 2500;
  const TOTAL_OPERATIONS = NODE_COUNT * OPERATIONS_PER_NODE;

  console.log(`[Config] Nodes: ${NODE_COUNT} | Ops/Node: ${OPERATIONS_PER_NODE} | Total Ops: ${TOTAL_OPERATIONS}`);

  const nodes = Array.from(
    { length: NODE_COUNT },
    (_, i) => new CRDTCanvasDocument(`node-${i}`)
  );

  const deltas: DeltaOperation[] = [];

  // Phase 1: Local Mutation Generation
  const t0 = performance.now();
  for (let i = 0; i < NODE_COUNT; i++) {
    const node = nodes[i];
    for (let j = 0; j < OPERATIONS_PER_NODE; j++) {
      const delta = node.createOrUpdateShape({
        id: `shape-${(i * 100 + j) % 200}`, // Intense write conflicts on overlapping IDs
        type: 'rectangle',
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        width: 100,
        height: 80,
        strokeColor: '#3b82f6',
      });
      deltas.push(delta);
    }
  }
  const t1 = performance.now();
  console.log(`Phase 1: Local generation complete in ${(t1 - t0).toFixed(2)} ms (${((TOTAL_OPERATIONS / (t1 - t0)) * 1000).toFixed(0)} ops/sec)`);

  // Phase 2: Distributed Shuffle & Full Mesh Convergence
  // Randomize arrival order to stress test commutativity & associativity
  for (let i = deltas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deltas[i], deltas[j]] = [deltas[j], deltas[i]];
  }

  const t2 = performance.now();
  let totalMerges = 0;
  for (const delta of deltas) {
    for (const node of nodes) {
      if (node.peerId !== delta.peerId) {
        node.applyRemoteDelta(delta);
        totalMerges++;
      }
    }
  }
  const t3 = performance.now();
  const mergeDurationSec = (t3 - t2) / 1000;
  console.log(`Phase 2: Mesh convergence (${totalMerges} cross-node merges) in ${(t3 - t2).toFixed(2)} ms`);
  console.log(`[Throughput]: ${(totalMerges / mergeDurationSec).toFixed(0)} remote merges/sec`);

  // Phase 3: Formal Consistency Verification across all nodes
  const baseline = JSON.stringify(nodes[0].getActiveShapes());
  let consistent = true;
  for (let i = 1; i < nodes.length; i++) {
    if (JSON.stringify(nodes[i].getActiveShapes()) !== baseline) {
      consistent = false;
      break;
    }
  }

  console.log('\n---------------- Verification Result ----------------');
  if (consistent) {
    console.log(`? SUCCESS: All ${NODE_COUNT} nodes converged to IDENTICAL state bit-for-bit.`);
    console.log(`Active Entities in Canvas: ${nodes[0].getActiveShapes().length}`);
  } else {
    console.error('? FAILURE: Divergence detected between nodes.');
  }
  console.log('====================================================\n');
}

runBenchmark();
