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