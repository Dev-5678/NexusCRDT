/**
 * NexusCRDT - Core Mathematical CRDT Engine
 * 
 * Provides Conflict-Free Replicated Data Types guaranteeing Strong Eventual
 * Consistency (SEC) across distributed clients over unordered, lossy networks.
 * 
 * Mathematical Properties:
 * 1. Commutativity:   op_A ? op_B ? op_B ? op_A
 * 2. Associativity:   (op_A ? op_B) ? op_C ? op_A ? (op_B ? op_C)
 * 3. Idempotency:     op_A ? op_A ? op_A
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

/**
 * Vector Clock implementation for causal ordering of events
 * in distributed peer-to-peer topologies.
 */
export class VectorClock {
  private clock: Map<PeerID, number>;

  constructor(initial?: Record<PeerID, number> | Map<PeerID, number>) {
    this.clock = new Map();
    if (initial) {
      if (initial instanceof Map) {
        initial.forEach((v, k) => this.clock.set(k, v));
      } else {
        Object.entries(initial).forEach(([k, v]) => this.clock.set(k, v));
      }
    }
  }

  public get(peerId: PeerID): number {
    return this.clock.get(peerId) || 0;
  }

  public increment(peerId: PeerID): void {
    const current = this.get(peerId);
    this.clock.set(peerId, current + 1);
  }

  public merge(other: VectorClock): void {
    for (const [peerId, remoteSeq] of other.clock.entries()) {
      const localSeq = this.get(peerId);
      this.clock.set(peerId, Math.max(localSeq, remoteSeq));
    }
  }

  public clone(): VectorClock {
    const next = new VectorClock();
    this.clock.forEach((v, k) => next.clock.set(k, v));
    return next;
  }

  public toJSON(): Record<PeerID, number> {
    const obj: Record<PeerID, number> = {};
    this.clock.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }

  public static compare(a: VectorClock, b: VectorClock): CausalOrder {
    let aGreater = false;
    let bGreater = false;

    const allKeys = new Set([...a.clock.keys(), ...b.clock.keys()]);

    for (const key of allKeys) {
      const aVal = a.get(key);
      const bVal = b.get(key);

      if (aVal > bVal) aGreater = true;
      if (bVal > aVal) bGreater = true;
    }

    if (aGreater && !bGreater) return CausalOrder.AFTER;
    if (bGreater && !aGreater) return CausalOrder.BEFORE;
    if (!aGreater && !bGreater) return CausalOrder.EQUAL;
    return CausalOrder.CONCURRENT;
  }
}

/**
 * Last-Write-Wins Register with Lamport Timestamp + Peer ID tie-breaking
 * for deterministic conflict resolution.
 */
export interface LWWMetadata {
  timestamp: number;
  peerId: PeerID;
}

export class LWWRegister<T> {
  private value: T;
  private timestamp: number;
  private peerId: PeerID;

  constructor(value: T, timestamp: number, peerId: PeerID) {
    this.value = value;
    this.timestamp = timestamp;
    this.peerId = peerId;
  }

  public get(): T {
    return this.value;
  }

  public getMetadata(): LWWMetadata {
    return { timestamp: this.timestamp, peerId: this.peerId };
  }

  /**
   * Deterministic merge using Total Order:
   * (timestamp_a > timestamp_b) OR
   * (timestamp_a == timestamp_b AND peerId_a > peerId_b)
   */
  public merge(incomingValue: T, incomingTimestamp: number, incomingPeerId: PeerID): boolean {
    if (
      incomingTimestamp > this.timestamp ||
      (incomingTimestamp === this.timestamp && incomingPeerId > this.peerId)
    ) {
      this.value = incomingValue;
      this.timestamp = incomingTimestamp;
      this.peerId = incomingPeerId;
      return true;
    }
    return false;
  }
}

/**
 * Shape types supported by the canvas engine
 */
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

/**
 * Replicated Document containing canvas entities with Lamport clocks
 * and tombstone-based removal.
 */
export class CRDTCanvasDocument {
  public readonly peerId: PeerID;
  private vectorClock: VectorClock;
  private lamportClock: number;
  private shapes: Map<string, { shape: CanvasShape; timestamp: number; peerId: PeerID }>;
  private appliedOpIds: Set<string>;

  constructor(peerId: PeerID) {
    this.peerId = peerId;
    this.vectorClock = new VectorClock();
    this.lamportClock = 0;
    this.shapes = new Map();
    this.appliedOpIds = new Set();
  }

  public getVectorClock(): VectorClock {
    return this.vectorClock.clone();
  }

  public getLamportTime(): number {
    return this.lamportClock;
  }

  private advanceClock(remoteTimestamp?: number): number {
    this.vectorClock.increment(this.peerId);
    this.lamportClock = Math.max(this.lamportClock, remoteTimestamp || 0) + 1;
    return this.lamportClock;
  }

  /**
   * Upsert a canvas shape locally, generating an idempotent delta op
   */
  public createOrUpdateShape(shape: Partial<CanvasShape> & { id: string }): DeltaOperation {
    const timestamp = this.advanceClock();
    const existing = this.shapes.get(shape.id);

    const mergedShape: CanvasShape = {
      id: shape.id,
      type: shape.type ?? existing?.shape.type ?? 'rectangle',
      x: shape.x ?? existing?.shape.x ?? 0,
      y: shape.y ?? existing?.shape.y ?? 0,
      width: shape.width ?? existing?.shape.width ?? 100,
      height: shape.height ?? existing?.shape.height ?? 100,
      strokeColor: shape.strokeColor ?? existing?.shape.strokeColor ?? '#3b82f6',
      fillColor: shape.fillColor ?? existing?.shape.fillColor ?? 'rgba(59, 130, 246, 0.15)',
      strokeWidth: shape.strokeWidth ?? existing?.shape.strokeWidth ?? 2,
      text: shape.text ?? existing?.shape.text ?? '',
      zIndex: shape.zIndex ?? existing?.shape.zIndex ?? Date.now(),
      isDeleted: false,
    };

    this.shapes.set(shape.id, {
      shape: mergedShape,
      timestamp,
      peerId: this.peerId,
    });

    const opId = `${this.peerId}-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
    this.appliedOpIds.add(opId);

    return {
      opId,
      peerId: this.peerId,
      timestamp,
      vectorClock: this.vectorClock.toJSON(),
      type: 'UPSERT_SHAPE',
      payload: mergedShape,
    };
  }

  /**
   * Tombstone deletion of a shape
   */
  public deleteShape(id: string): DeltaOperation | null {
    const existing = this.shapes.get(id);
    if (!existing || existing.shape.isDeleted) return null;

    const timestamp = this.advanceClock();
    existing.shape.isDeleted = true;
    existing.timestamp = timestamp;
    existing.peerId = this.peerId;

    const opId = `${this.peerId}-${timestamp}-del-${Math.random().toString(36).substring(2, 7)}`;
    this.appliedOpIds.add(opId);

    return {
      opId,
      peerId: this.peerId,
      timestamp,
      vectorClock: this.vectorClock.toJSON(),
      type: 'DELETE_SHAPE',
      payload: { id, isDeleted: true },
    };
  }

  /**
   * Idempotent state convergence: Merges delta operations from remote peers
   */
  public applyRemoteDelta(delta: DeltaOperation): boolean {
    if (this.appliedOpIds.has(delta.opId)) {
      return false; // Idempotency check: duplicate operation ignored
    }
    this.appliedOpIds.add(delta.opId);

    // Merge vector clocks and advance local Lamport logical clock
    const remoteVC = new VectorClock(delta.vectorClock);
    this.vectorClock.merge(remoteVC);
    this.lamportClock = Math.max(this.lamportClock, delta.timestamp) + 1;

    const existing = this.shapes.get(delta.payload.id);

    // Conflict resolution: Higher timestamp wins; on tie, lexicographical peer ID
    const isDominant =
      !existing ||
      delta.timestamp > existing.timestamp ||
      (delta.timestamp === existing.timestamp && delta.peerId > existing.peerId);

    if (isDominant) {
      if (delta.type === 'DELETE_SHAPE') {
        if (existing) {
          existing.shape.isDeleted = true;
          existing.timestamp = delta.timestamp;
          existing.peerId = delta.peerId;
        } else {
          this.shapes.set(delta.payload.id, {
            shape: {
              id: delta.payload.id,
              type: 'rectangle',
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              strokeColor: '#000',
              fillColor: '#000',
              strokeWidth: 1,
              zIndex: 0,
              isDeleted: true,
            },
            timestamp: delta.timestamp,
            peerId: delta.peerId,
          });
        }
      } else {
        const shapePayload = delta.payload as CanvasShape;
        this.shapes.set(delta.payload.id, {
          shape: { ...shapePayload, isDeleted: false },
          timestamp: delta.timestamp,
          peerId: delta.peerId,
        });
      }
      return true;
    }

    return false;
  }

  /**
   * Returns active, non-tombstoned shapes sorted by zIndex
   */
  public getActiveShapes(): CanvasShape[] {
    return Array.from(this.shapes.values())
      .filter((entry) => !entry.shape.isDeleted)
      .map((entry) => ({ ...entry.shape }))
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Export snapshot for initial client synchronization
   */
  public getSnapshot(): {
    shapes: CanvasShape[];
    vectorClock: Record<PeerID, number>;
    lamportClock: number;
  } {
    return {
      shapes: this.getActiveShapes(),
      vectorClock: this.vectorClock.toJSON(),
      lamportClock: this.lamportClock,
    };
  }
}
