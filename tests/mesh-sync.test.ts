import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PeerHeartbeatTracker } from '../src/network/webrtc.js';

describe('WebRTC Mesh Synchronization & Heartbeat Resilience', () => {
  it('correctly tracks peer heartbeats and distinguishes active peers', () => {
    const tracker = new PeerHeartbeatTracker(5000);
    const t0 = 10000;

    tracker.recordHeartbeat('peer-alpha', t0);
    tracker.recordHeartbeat('peer-beta', t0);

    assert.strictEqual(tracker.isPeerAlive('peer-alpha', t0 + 2000), true);
    assert.strictEqual(tracker.isPeerAlive('peer-beta', t0 + 4999), true);
    assert.strictEqual(tracker.isPeerAlive('peer-gamma', t0 + 1000), false);
  });

  it('evicts stale peers exceeding timeout threshold during network partition', () => {
    const tracker = new PeerHeartbeatTracker(3000);
    const t0 = 10000;

    tracker.recordHeartbeat('peer-1', t0);
    tracker.recordHeartbeat('peer-2', t0);
    tracker.recordHeartbeat('peer-3', t0 + 2000);

    assert.strictEqual(tracker.getPeerCount(), 3);

    // At t0 + 3500, peer-1 and peer-2 are older than 3000ms, while peer-3 is only 1500ms old
    const evicted = tracker.evictStalePeers(t0 + 3500);

    assert.deepStrictEqual(evicted.sort(), ['peer-1', 'peer-2']);
    assert.strictEqual(tracker.getPeerCount(), 1);
    assert.deepStrictEqual(tracker.getActivePeers(t0 + 3500), ['peer-3']);
  });

  it('re-registers evicted peers upon receiving fresh heartbeats', () => {
    const tracker = new PeerHeartbeatTracker(2000);
    const t0 = 10000;

    tracker.recordHeartbeat('peer-node', t0);
    tracker.evictStalePeers(t0 + 3000);
    assert.strictEqual(tracker.isPeerAlive('peer-node', t0 + 3000), false);

    // Reconnection
    tracker.recordHeartbeat('peer-node', t0 + 4000);
    assert.strictEqual(tracker.isPeerAlive('peer-node', t0 + 4500), true);
    assert.strictEqual(tracker.getPeerCount(), 1);
  });
});
