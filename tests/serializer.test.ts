/**
 * NexusCRDT - Canvas Serializer Unit Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CanvasShape } from '../src/core/crdt';
import { CanvasSerializer } from '../src/core/canvasSerializer';

describe('Canvas Snapshot Serializer & SVG Exporter', () => {
  const sampleShapes: CanvasShape[] = [
    {
      id: 'rect-1',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      strokeColor: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.2)',
      strokeWidth: 2,
      zIndex: 1,
      isDeleted: false,
    },
    {
      id: 'ellipse-1',
      type: 'ellipse',
      x: 200,
      y: 100,
      width: 100,
      height: 60,
      strokeColor: '#10b981',
      fillColor: 'transparent',
      strokeWidth: 1,
      zIndex: 2,
      isDeleted: false,
    },
    {
      id: 'deleted-1',
      type: 'rectangle',
      x: 50,
      y: 50,
      width: 50,
      height: 50,
      strokeColor: '#ef4444',
      fillColor: '#ef4444',
      strokeWidth: 1,
      zIndex: 3,
      isDeleted: true,
    },
  ];

  it('generates valid SVG document with correct dimensions and background', () => {
    const svg = CanvasSerializer.toSVG(sampleShapes, {
      viewportWidth: 800,
      viewportHeight: 600,
      backgroundColor: '#18181b',
    });

    assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes('viewBox="0 0 800 600"'));
    assert.ok(svg.includes('fill="#18181b"'));
    assert.ok(svg.includes('id="rect-1"'));
    assert.ok(svg.includes('id="ellipse-1"'));
  });

  it('excludes deleted tombstones from SVG output by default', () => {
    const svg = CanvasSerializer.toSVG(sampleShapes);
    assert.ok(!svg.includes('id="deleted-1"'));
  });

  it('serializes shapes to structured JSON snapshot bundle', () => {
    const jsonStr = CanvasSerializer.toJSONSnapshot(sampleShapes, 'test-doc');
    const parsed = JSON.parse(jsonStr);

    assert.strictEqual(parsed.version, '1.2.0');
    assert.strictEqual(parsed.documentId, 'test-doc');
    assert.strictEqual(parsed.shapeCount, 3);
    assert.strictEqual(parsed.shapes.length, 3);
  });
});
