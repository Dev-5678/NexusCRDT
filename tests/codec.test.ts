import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeltaCompressionCodec, CompressionTelemetry } from '../src/core/compression.js';
import { DeltaOperation } from '../src/core/crdt.js';

describe('Delta Compression Codec', () => {
  it('encodes and decodes delta operations losslessly', () => {
    const op: DeltaOperation = {
      opId: 'test-op-99',
      peerId: 'peer-alpha',
      timestamp: 1024,
      vectorClock: { 'peer-alpha': 5 },
      type: 'UPSERT_SHAPE',
      payload: { id: 'shape-rect-1', x: 250, y: 140, width: 80, height: 60 },
    };

    const encoded = DeltaCompressionCodec.encode(op);
    const decoded = DeltaCompressionCodec.decode(encoded);

    assert.strictEqual(decoded.opId, op.opId);
    assert.strictEqual(decoded.timestamp, op.timestamp);
    assert.deepStrictEqual(decoded.payload, op.payload);

    const ratio = CompressionTelemetry.calculateRatio(op, encoded);
    assert.ok(ratio >= 0);
  });
});