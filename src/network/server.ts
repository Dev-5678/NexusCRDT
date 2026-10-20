/**
 * NexusCRDT - Distributed Synchronization Server
 * 
 * Provides room-based WebSocket routing, causal broadcast relays,
 * and authoritative snapshot cache for seamless client onboarding.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { WebSocketServer, WebSocket } from 'ws';
import { SyncMessage } from './client.js';
import { CRDTCanvasDocument, DeltaOperation } from '../core/crdt.js';

interface ClientConnection {
  ws: WebSocket;
  peerId: string;
  roomId: string;
}

export class CRDTRoom {
  public readonly id: string;
  public readonly doc: CRDTCanvasDocument;
  public readonly clients: Set<ClientConnection>;

  constructor(id: string) {
    this.id = id;
    this.doc = new CRDTCanvasDocument(`server-${id}`);
    this.clients = new Set();
  }

  public addClient(client: ClientConnection): void {
    this.clients.add(client);

    // Send latest document snapshot to new client
    const snapshot = this.doc.getSnapshot();
    const snapshotMsg: SyncMessage = {
      type: 'SNAPSHOT',
      roomId: this.id,
      peerId: 'server',
      payload: snapshot,
      timestamp: Date.now(),
    };
    client.ws.send(JSON.stringify(snapshotMsg));
  }

  public removeClient(client: ClientConnection): void {
    this.clients.delete(client);
    this.broadcast({
      type: 'PEER_LEAVE',
      roomId: this.id,
      peerId: client.peerId,
      timestamp: Date.now(),
    }, client);
  }

  public broadcast(msg: SyncMessage, sender?: ClientConnection): void {
    const raw = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client !== sender && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    }
  }

  public processDelta(delta: DeltaOperation, sender: ClientConnection): void {
    this.doc.applyRemoteDelta(delta);
    this.broadcast({
      type: 'DELTA_OP',
      roomId: this.id,
      peerId: sender.peerId,
      payload: delta,
      timestamp: Date.now(),
    }, sender);
  }
}

export class SyncServer {
  private wss: WebSocketServer;
  private rooms: Map<string, CRDTRoom> = new Map();

  constructor(port = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupListeners();
    console.log(`[NexusCRDT] Server listening on ws://localhost:${port}`);
  }

  private setupListeners(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      let clientConnection: ClientConnection | null = null;

      ws.on('message', (data: string) => {
        try {
          const msg: SyncMessage = JSON.parse(data.toString());

          if (msg.type === 'JOIN_ROOM') {
            const room = this.getOrCreateRoom(msg.roomId);
            clientConnection = { ws, peerId: msg.peerId, roomId: msg.roomId };
            room.addClient(clientConnection);
            console.log(`[NexusCRDT] Peer ${msg.peerId} joined room "${msg.roomId}"`);
            return;
          }

          if (!clientConnection) return;
          const room = this.rooms.get(clientConnection.roomId);
          if (!room) return;

          if (msg.type === 'DELTA_OP' && msg.payload) {
            room.processDelta(msg.payload as DeltaOperation, clientConnection);
          } else if (msg.type === 'CURSOR_MOVE') {
            room.broadcast(msg, clientConnection);
          }
        } catch (err) {
          console.error('[NexusCRDT] Error processing message', err);
        }
      });

      ws.on('close', () => {
        if (clientConnection) {
          const room = this.rooms.get(clientConnection.roomId);
          if (room) {
            room.removeClient(clientConnection);
            console.log(`[NexusCRDT] Peer ${clientConnection.peerId} left room "${clientConnection.roomId}"`);
          }
        }
      });
    });
  }

  private getOrCreateRoom(roomId: string): CRDTRoom {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new CRDTRoom(roomId);
      this.rooms.set(roomId, room);
    }
    return room;
  }

  public close(): Promise<void> {
    return new Promise((resolve) => this.wss.close(() => resolve()));
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('server.js')) {
  new SyncServer(8080);
}
