/**
 * NexusCRDT - Delta Operation Compression & Wire Serialization
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { DeltaOperation } from './crdt.js';

export interface CompressedDeltaPayload {
  t: number;
  p: string;
  o: string;
  y: number;
  d: string;
}

export class DeltaCompressionCodec {
  public static encode(delta: DeltaOperation): CompressedDeltaPayload {
    const typeCode = delta.type === 'UPSERT_SHAPE' ? 0 : delta.type === 'DELETE_SHAPE' ? 1 : 2;
    const raw = JSON.stringify(delta.payload);
    return {
      t: delta.timestamp,
      p: delta.peerId,
      o: delta.opId,
      y: typeCode,
      d: raw,
    };
  }

  public static decode(compressed: CompressedDeltaPayload): Partial<DeltaOperation> {
    const typeMap = ['UPSERT_SHAPE', 'DELETE_SHAPE', 'BATCH_SYNC'] as const;
    return {
      timestamp: compressed.t,
      peerId: compressed.p,
      opId: compressed.o,
      type: typeMap[compressed.y],
      payload: JSON.parse(compressed.d),
    };
  }
}