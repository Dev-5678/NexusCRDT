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

export class CausalHistoryStack {
  private nodes: Map<string, UndoRedoNode> = new Map();
  private currentNodeId: string | null = null;
  private peerId: string;

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  public record(delta: DeltaOperation, inverse: DeltaOperation, vc: VectorClock): void {
    const node: UndoRedoNode = {
      id: delta.opId,
      delta,
      inverseDelta: inverse,
      vectorClock: vc.clone(),
      timestamp: Date.now(),
      parent: this.currentNodeId || undefined,
      children: [],
    };

    if (this.currentNodeId && this.nodes.has(this.currentNodeId)) {
      this.nodes.get(this.currentNodeId)!.children.push(node.id);
    }

    this.nodes.set(node.id, node);
    this.currentNodeId = node.id;
  }

  public canUndo(): boolean {
    return this.currentNodeId !== null;
  }
}