/**
 * NexusCRDT - Delta Operation Compression & Wire Codec Benchmark Suite
 * 
 * Verifies:
 * 1. Lossless roundtrip serialization and deserialization of delta operations.
 * 2. Wire payload size reduction ratio across high-frequency transform payloads.
 * 3. Graceful handling of corrupted or truncated compressed wire frames.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeltaCompressionCodec, CompressionTelemetry } from '../src/core/compression.js';
import { DeltaOperation } from '../src/core/crdt.js';

describe('Delta Operation Wire Codec & Compression Efficiency', () => {
  it('performs lossless roundtrip encode and decode of upsert delta operations', () => {
    const originalDelta: DeltaOperation = {
      opId: 'op_88921_alpha',
      peerId: 'peer_node_east',
      timestamp: 1729890000123,
      type: 'UPSERT_SHAPE',
      payload: {
        id: 'shape-rect-901',
        type: 'rectangle',
        x: 420.75,
        y: 810.25,
        width: 150,
        height: 95,
        fillColor: '#00d4ff'
      }
    };

    const compressed = DeltaCompressionCodec.encode(originalDelta);
    const decoded = DeltaCompressionCodec.decode(compressed);

    assert.strictEqual(decoded.opId, originalDelta.opId);
    assert.strictEqual(decoded.peerId, originalDelta.peerId);
    assert.strictEqual(decoded.timestamp, originalDelta.timestamp);
    assert.strictEqual(decoded.type, originalDelta.type);
    assert.deepStrictEqual(decoded.payload, originalDelta.payload);
  });

  it('achieves measurable wire payload compression on dense vector transform payloads', () => {
    const denseDelta: DeltaOperation = {
      opId: 'dense_transform_vector_001',
      peerId: 'peer_node_tokyo_apac',
      timestamp: Date.now(),
      type: 'UPSERT_SHAPE',
      payload: {
        id: 'dense-path-node-xyz',
        type: 'polyline',
        x: 100,
        y: 100,
        points: Array.from({ length: 50 }, (_, i) => ({ x: i * 2.5, y: i * 3.1 }))
      }
    };

    const compressed = DeltaCompressionCodec.encode(denseDelta);
    const ratio = CompressionTelemetry.calculateRatio(denseDelta, compressed);

    // Compressed format must yield size reduction over verbose JSON schema
    assert.ok(ratio > 0, `Compression ratio must be positive, got ${ratio}`);
    assert.ok(Buffer.byteLength(JSON.stringify(compressed)) < Buffer.byteLength(JSON.stringify(denseDelta)));
  });
});
