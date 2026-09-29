/**
 * NexusCRDT - Causal Undo/Redo DAG History Engine
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { DeltaOperation, VectorClock } from './crdt.js';

export interface UndoRedoNode {
  id: string;
  delta: DeltaOperation;
  inverseDelta: DeltaOperation;
  vectorClock: VectorClock;
  timestamp: number;
  parent?: string;
  children: string[];
}