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