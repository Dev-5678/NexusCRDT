import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  euclideanDistance,
  isPointInBoundingBox,
  boundingBoxIntersection,
  boundingBoxUnion,
  calculateBoundingBoxCenter,
  expandBoundingBox,
} from '../src/utils/math.js';

describe('Spatial Math & Bounding Box Utilities', () => {
  it('correctly calculates Euclidean distance between two points', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    assert.strictEqual(euclideanDistance(p1, p2), 5);

    const p3 = { x: -1, y: -1 };
    const p4 = { x: 2, y: 3 };
    assert.strictEqual(euclideanDistance(p3, p4), 5);
  });

  it('determines point inclusion within bounding box boundaries', () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };

    assert.strictEqual(isPointInBoundingBox({ x: 50, y: 40 }, box), true);
    assert.strictEqual(isPointInBoundingBox({ x: 10, y: 20 }, box), true);
    assert.strictEqual(isPointInBoundingBox({ x: 110, y: 70 }, box), true);
    assert.strictEqual(isPointInBoundingBox({ x: 9, y: 40 }, box), false);
    assert.strictEqual(isPointInBoundingBox({ x: 50, y: 71 }, box), false);
  });

  it('accurately evaluates AABB intersections and non-overlapping geometries', () => {
    const boxA = { x: 0, y: 0, width: 50, height: 50 };
    const boxB = { x: 25, y: 25, width: 50, height: 50 };
    const boxC = { x: 100, y: 100, width: 20, height: 20 };

    assert.strictEqual(boundingBoxIntersection(boxA, boxB), true);
    assert.strictEqual(boundingBoxIntersection(boxB, boxA), true);
    assert.strictEqual(boundingBoxIntersection(boxA, boxC), false);
  });

  it('computes minimal enclosing bounding box union', () => {
    const boxA = { x: 10, y: 10, width: 20, height: 20 };
    const boxB = { x: 50, y: 60, width: 30, height: 40 };

    const union = boundingBoxUnion(boxA, boxB);
    assert.strictEqual(union.x, 10);
    assert.strictEqual(union.y, 10);
    assert.strictEqual(union.width, 70); // from x=10 to x=80
    assert.strictEqual(union.height, 90); // from y=10 to y=100
  });

  it('calculates bounding box center point and padded expansion', () => {
    const box = { x: 20, y: 40, width: 60, height: 80 };
    const center = calculateBoundingBoxCenter(box);

    assert.strictEqual(center.x, 50);
    assert.strictEqual(center.y, 80);

    const expanded = expandBoundingBox(box, 10);
    assert.strictEqual(expanded.x, 10);
    assert.strictEqual(expanded.y, 30);
    assert.strictEqual(expanded.width, 80);
    assert.strictEqual(expanded.height, 100);
  });
});
