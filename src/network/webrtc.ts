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