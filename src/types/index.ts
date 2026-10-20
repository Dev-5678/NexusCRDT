/**
 * NexusCRDT - Core Mathematical Type Definitions
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export type PeerID = string;

export enum CausalOrder {
  BEFORE = -1,
  CONCURRENT = 0,
  AFTER = 1,
  EQUAL = 2,
}

export interface LWWMetadata {
  timestamp: number;
  peerId: PeerID;
}

export type ShapeType = 'rectangle' | 'ellipse' | 'arrow' | 'text';

export interface CanvasShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  zIndex: number;
  isDeleted: boolean;
}

export interface DeltaOperation {
  opId: string;
  peerId: PeerID;
  timestamp: number;
  vectorClock: Record<PeerID, number>;
  type: 'UPSERT_SHAPE' | 'DELETE_SHAPE' | 'BATCH_SYNC';
  payload: Partial<CanvasShape> & { id: string };
}
