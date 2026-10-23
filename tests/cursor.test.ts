/**
 * NexusCRDT - Cursor Interpolation & Dead Reckoning Unit Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CursorInterpolator } from '../src/core/cursorInterpolator';

describe('Catmull-Rom Collaborative Cursor Interpolator', () => {
  it('returns exact coordinate when only single sample exists', () => {
    const interpolator = new CursorInterpolator();
    interpolator.pushSample(100, 200, 1000);

    const pos = interpolator.extrapolate(1050);
    assert.strictEqual(pos.x, 100);
    assert.strictEqual(pos.y, 200);
    assert.strictEqual(pos.speed, 0);
  });

  it('computes linear velocity dead-reckoning on two samples', () => {
    const interpolator = new CursorInterpolator();
    interpolator.pushSample(0, 0, 1000);
    interpolator.pushSample(100, 50, 1100); // 100ms later

    const est = interpolator.extrapolate(1150); // 50ms into future
    // dt = 100ms, vx = 1 px/ms, vy = 0.5 px/ms
    assert.ok(est.vx > 0.99 && est.vx < 1.01);
    assert.ok(est.vy > 0.49 && est.vy < 0.51);
    assert.ok(est.x > 100);
    assert.ok(est.y > 50);
  });

  it('interpolates intermediate points smoothly along Catmull-Rom spline', () => {
    const interpolator = new CursorInterpolator();
    interpolator.pushSample(0, 0, 1000);
    interpolator.pushSample(10, 20, 1100);
    interpolator.pushSample(30, 60, 1200);
    interpolator.pushSample(60, 120, 1300);

    // Sample midpoint between p1 (10, 20) and p2 (30, 60) at t=1150
    const mid = interpolator.sampleAt(1150);
    assert.ok(mid.x >= 10 && mid.x <= 30);
    assert.ok(mid.y >= 20 && mid.y <= 60);
    assert.ok(mid.speed > 0);
  });

  it('limits internal sample ring buffer to maxSamples capacity', () => {
    const interpolator = new CursorInterpolator(5);
    for (let i = 0; i < 15; i++) {
      interpolator.pushSample(i * 10, i * 10, 1000 + i * 50);
    }

    const state = interpolator.sampleAt(1750);
    assert.ok(state.x > 100);
  });
});
