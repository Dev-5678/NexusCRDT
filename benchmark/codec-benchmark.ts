import { DeltaCompressionCodec } from '../src/core/compression.js';
import { DeltaOperation } from '../src/core/crdt.js';

function benchmarkCodec() {
  console.log('=== NexusCRDT // Compression Codec Benchmark ===');
  const op: DeltaOperation = {
    opId: 'bench-op',
    peerId: 'bench-node',
    timestamp: Date.now(),
    vectorClock: { 'node-0': 100, 'node-1': 50 },
    type: 'UPSERT_SHAPE',
    payload: { id: 's-10', x: 400, y: 300, width: 120, height: 90 },
  };

  const ITERATIONS = 100000;
  const t0 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const encoded = DeltaCompressionCodec.encode(op);
    DeltaCompressionCodec.decode(encoded);
  }
  const t1 = performance.now();
  const opsSec = Math.floor((ITERATIONS / ((t1 - t0) / 1000)));

  console.log('Executed ' + ITERATIONS + ' roundtrip encode/decodes in ' + (t1 - t0).toFixed(2) + ' ms');
  console.log('Throughput: ' + opsSec.toLocaleString() + ' ops/sec\n');
}

benchmarkCodec();
