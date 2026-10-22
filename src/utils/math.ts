/**
 * NexusCRDT - Spatial Geometry & Transform Utilities
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function euclideanDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function isPointInBoundingBox(point: Point, box: BoundingBox): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if two axis-aligned bounding boxes (AABB) intersect
 */
export function boundingBoxIntersection(b1: BoundingBox, b2: BoundingBox): boolean {
  return (
    b1.x < b2.x + b2.width &&
    b1.x + b1.width > b2.x &&
    b1.y < b2.y + b2.height &&
    b1.y + b1.height > b2.y
  );
}

/**
 * Compute the minimal bounding box enclosing two bounding boxes
 */
export function boundingBoxUnion(b1: BoundingBox, b2: BoundingBox): BoundingBox {
  const minX = Math.min(b1.x, b2.x);
  const minY = Math.min(b1.y, b2.y);
  const maxX = Math.max(b1.x + b1.width, b2.x + b2.width);
  const maxY = Math.max(b1.y + b1.height, b2.y + b2.height);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate the geometric center point of a bounding box
 */
export function calculateBoundingBoxCenter(box: BoundingBox): Point {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Expand a bounding box outward uniformly by a given padding
 */
export function expandBoundingBox(box: BoundingBox, padding: number): BoundingBox {
  return {
    x: box.x - padding,
    y: box.y - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  };
}

