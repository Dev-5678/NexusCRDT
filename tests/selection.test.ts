import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SelectionManager } from '../src/core/selection.js';
import { CanvasShape } from '../src/core/crdt.js';

describe('Multi-Shape Selection & Spatial Bounding Box Queries', () => {
  const shape1: CanvasShape = {
    id: 's1',
    type: 'rectangle',
    x: 10,
    y: 10,
    width: 40,
    height: 40,
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    zIndex: 1,
    isDeleted: false,
  };

  const shape2: CanvasShape = {
    id: 's2',
    type: 'ellipse',
    x: 100,
    y: 100,
    width: 60,
    height: 60,
    fillColor: '#ff0000',
    strokeColor: '#000000',
    strokeWidth: 2,
    zIndex: 2,
    isDeleted: false,
  };

  const deletedShape: CanvasShape = {
    id: 's3',
    type: 'rectangle',
    x: 20,
    y: 20,
    width: 20,
    height: 20,
    fillColor: '#00ff00',
    strokeColor: '#000000',
    strokeWidth: 1,
    zIndex: 3,
    isDeleted: true,
  };

  it('computes union bounds for arbitrary shape clusters', () => {
    assert.strictEqual(SelectionManager.computeUnionBounds([]), null);

    const bounds = SelectionManager.computeUnionBounds([shape1, shape2]);
    assert.notStrictEqual(bounds, null);
    assert.strictEqual(bounds!.x, 10);
    assert.strictEqual(bounds!.y, 10);
    assert.strictEqual(bounds!.width, 150); // 100 + 60 - 10
    assert.strictEqual(bounds!.height, 150);
  });

  it('filters shapes strictly contained within lasso bounding box', () => {
    const lasso = { x: 0, y: 0, width: 80, height: 80 };
    const inside = SelectionManager.getShapesInLasso([shape1, shape2, deletedShape], lasso);

    assert.strictEqual(inside.length, 1);
    assert.strictEqual(inside[0].id, 's1');
  });

  it('identifies shapes intersecting with lasso bounding boundary', () => {
    // Lasso overlapping s1 (10..50) and s2 (100..160)
    const lassoPartial = { x: 30, y: 30, width: 80, height: 80 };
    const intersecting = SelectionManager.getShapesIntersectingLasso([shape1, shape2, deletedShape], lassoPartial);

    assert.strictEqual(intersecting.length, 2);
    const ids = intersecting.map((s) => s.id).sort();
    assert.deepStrictEqual(ids, ['s1', 's2']);
  });

  it('performs hit tests on rectangular and elliptical primitives', () => {
    // Rectangle hit test
    assert.strictEqual(SelectionManager.isShapeHit(shape1, { x: 20, y: 20 }), true);
    assert.strictEqual(SelectionManager.isShapeHit(shape1, { x: 5, y: 20 }), false);

    // Ellipse hit test (center at 130, 130, rx=30, ry=30)
    assert.strictEqual(SelectionManager.isShapeHit(shape2, { x: 130, y: 130 }), true);
    assert.strictEqual(SelectionManager.isShapeHit(shape2, { x: 100, y: 100 }), false); // Corner of bounding box outside ellipse

    // Deleted shape hit test
    assert.strictEqual(SelectionManager.isShapeHit(deletedShape, { x: 25, y: 25 }), false);
  });

  it('translates shape cluster coordinates by delta vectors', () => {
    const translated = SelectionManager.translateGroup([shape1], 15, -5);
    assert.strictEqual(translated[0].x, 25);
    assert.strictEqual(translated[0].y, 5);
  });
});
