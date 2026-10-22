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

  public static getShapesInLasso(shapes: CanvasShape[], lasso: BoundingBox): CanvasShape[] {
    return shapes.filter(
      (s) =>
        !s.isDeleted &&
        s.x >= lasso.x &&
        s.x + s.width <= lasso.x + lasso.width &&
        s.y >= lasso.y &&
        s.y + s.height <= lasso.y + lasso.height
    );
  }

  public static translateGroup(shapes: CanvasShape[], dx: number, dy: number): CanvasShape[] {
    return shapes.map((s) => ({
      ...s,
      x: s.x + dx,
      y: s.y + dy,
    }));
  }

  /**
   * Filter shapes that either intersect or are contained inside a lasso box
   */
  public static getShapesIntersectingLasso(shapes: CanvasShape[], lasso: BoundingBox): CanvasShape[] {
    return shapes.filter(
      (s) =>
        !s.isDeleted &&
        s.x < lasso.x + lasso.width &&
        s.x + s.width > lasso.x &&
        s.y < lasso.y + lasso.height &&
        s.y + s.height > lasso.y
    );
  }

  /**
   * Check if a point hits a specific canvas shape (accounting for shape type)
   */
  public static isShapeHit(shape: CanvasShape, point: Point): boolean {
    if (shape.isDeleted) return false;
    if (shape.type === 'ellipse') {
      const rx = Math.abs(shape.width / 2);
      const ry = Math.abs(shape.height / 2);
      if (rx === 0 || ry === 0) return false;
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const normalized = Math.pow((point.x - cx) / rx, 2) + Math.pow((point.y - cy) / ry, 2);
      return normalized <= 1.0;
    }

    // Default to rectangular AABB hit test
    return (
      point.x >= shape.x &&
      point.x <= shape.x + shape.width &&
      point.y >= shape.y &&
      point.y <= shape.y + shape.height
    );
  }
}
