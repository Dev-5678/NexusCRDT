/**
 * NexusCRDT - Real-Time WebSocket Synchronization Protocol
 * 
 * Handles peer connection lifecycle, room subscriptions,
 * delta broadcasts, and snapshot catch-ups.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { DeltaOperation } from '../core/crdt.js';

export type SyncMessageType =
  | 'JOIN_ROOM'
  | 'SNAPSHOT'
  | 'DELTA_OP'
  | 'CURSOR_MOVE'
  | 'PEER_LEAVE'
  | 'PING'
  | 'PONG';

export interface SyncMessage {
  type: SyncMessageType;
  roomId: string;
  peerId: string;
  payload?: any;
  timestamp: number;
}

export class CRDTNetworkClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private peerId: string;
  private serverUrl: string;
  private isConnected = false;
  private pendingQueue: DeltaOperation[] = [];
  private onDeltaCallback?: (delta: DeltaOperation) => void;
  private onSnapshotCallback?: (snapshot: any) => void;
  private onCursorCallback?: (cursor: any) => void;

  constructor(serverUrl: string, roomId: string, peerId: string) {
    this.serverUrl = serverUrl;
    this.roomId = roomId;
    this.peerId = peerId;
  }

  public connect(): void {
    if (typeof WebSocket === 'undefined') return;

    this.ws = new WebSocket(this.serverUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.sendMessage({
        type: 'JOIN_ROOM',
        roomId: this.roomId,
        peerId: this.peerId,
        timestamp: Date.now(),
      });

      // Flush offline mutation queue
      while (this.pendingQueue.length > 0) {
        const delta = this.pendingQueue.shift();
        if (delta) this.broadcastDelta(delta);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('Failed to parse sync message', err);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      setTimeout(() => this.connect(), 2000); // Exponential backoff reconnect
    };
  }

  public onDelta(cb: (delta: DeltaOperation) => void): void {
    this.onDeltaCallback = cb;
  }

  public onSnapshot(cb: (snapshot: any) => void): void {
    this.onSnapshotCallback = cb;
  }

  public onCursor(cb: (cursor: any) => void): void {
    this.onCursorCallback = cb;
  }

  public broadcastDelta(delta: DeltaOperation): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingQueue.push(delta);
      return;
    }

    this.sendMessage({
      type: 'DELTA_OP',
      roomId: this.roomId,
      peerId: this.peerId,
      payload: delta,
      timestamp: Date.now(),
    });
  }

  public broadcastCursor(worldX: number, worldY: number, name: string, color: string): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.sendMessage({
      type: 'CURSOR_MOVE',
      roomId: this.roomId,
      peerId: this.peerId,
      payload: { worldX, worldY, name, color },
      timestamp: Date.now(),
    });
  }

  private sendMessage(msg: SyncMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: SyncMessage): void {
    if (msg.peerId === this.peerId) return; // Skip echo

    switch (msg.type) {
      case 'DELTA_OP':
        if (this.onDeltaCallback && msg.payload) {
          this.onDeltaCallback(msg.payload);
        }
        break;

      case 'SNAPSHOT':
        if (this.onSnapshotCallback && msg.payload) {
          this.onSnapshotCallback(msg.payload);
        }
        break;

      case 'CURSOR_MOVE':
        if (this.onCursorCallback && msg.payload) {
          this.onCursorCallback({
            peerId: msg.peerId,
            ...msg.payload,
            lastActive: Date.now(),
          });
        }
        break;
    }
  }
}
