/**
 * NexusCRDT - Multi-Shape Selection & Spatial Bounding Box
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { CanvasShape } from './crdt.js';
import { BoundingBox, Point } from '../utils/math.js';

export class SelectionManager {
  public static computeUnionBounds(shapes: CanvasShape[]): BoundingBox | null {
    if (shapes.length === 0) return null;
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const s of shapes) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}