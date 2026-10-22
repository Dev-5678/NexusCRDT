/**
 * NexusCRDT - WebRTC Peer-to-Peer Mesh Transport
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface RTCMessage {
  type: 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'DISCONNECT';
  senderId: string;
  targetId: string;
  data: any;
}

export class WebRTCDataChannelAdapter {
  private peerId: string;
  private channels: Map<string, any> = new Map();

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  public registerChannel(remotePeerId: string, channel: any): void {
    this.channels.set(remotePeerId, channel);
  }

  public broadcast(payload: Uint8Array): void {
    for (const channel of this.channels.values()) {
      if (channel.readyState === 'open') {
        channel.send(payload);
      }
    }
  }
}

export class ICEManager {
  public static createIceConfig(): any {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }
}

export class HybridTransportCoordinator {
  private mode: 'WEBSOCKET' | 'WEBRTC' = 'WEBSOCKET';

  public setMode(mode: 'WEBSOCKET' | 'WEBRTC'): void {
    this.mode = mode;
  }

  public getMode(): 'WEBSOCKET' | 'WEBRTC' {
    return this.mode;
  }
}

export interface PeerHeartbeatEntry {
  peerId: string;
  lastHeartbeat: number;
}

export class PeerHeartbeatTracker {
  private peers: Map<string, number> = new Map();
  private timeoutMs: number;

  constructor(timeoutMs: number = 10000) {
    this.timeoutMs = timeoutMs;
  }

  public recordHeartbeat(peerId: string, timestamp: number = Date.now()): void {
    this.peers.set(peerId, timestamp);
  }

  public isPeerAlive(peerId: string, now: number = Date.now()): boolean {
    const last = this.peers.get(peerId);
    if (last === undefined) return false;
    return now - last <= this.timeoutMs;
  }

  public evictStalePeers(now: number = Date.now()): string[] {
    const evicted: string[] = [];
    for (const [peerId, last] of this.peers.entries()) {
      if (now - last > this.timeoutMs) {
        evicted.push(peerId);
        this.peers.delete(peerId);
      }
    }
    return evicted;
  }

  public getActivePeers(now: number = Date.now()): string[] {
    const active: string[] = [];
    for (const [peerId, last] of this.peers.entries()) {
      if (now - last <= this.timeoutMs) {
        active.push(peerId);
      }
    }
    return active;
  }

  public getPeerCount(): number {
    return this.peers.size;
  }
}
