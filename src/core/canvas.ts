/**
 * NexusCRDT - Canvas Engine & Viewport Transform Pipeline
 * 
 * Handles 60FPS spatial rendering, multi-cursor presence interpolation,
 * selection bounding boxes, and coordinate transformation (Screen <-> World).
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { CanvasShape } from './crdt.js';

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface PeerCursor {
  peerId: string;
  name: string;
  color: string;
  worldX: number;
  worldY: number;
  lastActive: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private transform: ViewportTransform = { scale: 1.0, offsetX: 0, offsetY: 0 };
  private selectedShapeId: string | null = null;
  private remoteCursors: Map<string, PeerCursor> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D Context unavailable');
    this.ctx = context;
  }

  public setTransform(transform: Partial<ViewportTransform>): void {
    this.transform = { ...this.transform, ...transform };
  }

  public getTransform(): ViewportTransform {
    return { ...this.transform };
  }

  public setSelectedShape(id: string | null): void {
    this.selectedShapeId = id;
  }

  public updateCursor(cursor: PeerCursor): void {
    this.remoteCursors.set(cursor.peerId, cursor);
  }

  public removeCursor(peerId: string): void {
    this.remoteCursors.delete(peerId);
  }

  /**
   * Convert screen viewport pixel coordinates to world coordinates
   */
  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.transform.offsetX) / this.transform.scale,
      y: (screenY - this.transform.offsetY) / this.transform.scale,
    };
  }

  /**
   * Convert world coordinates to screen pixel coordinates
   */
  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.transform.scale + this.transform.offsetX,
      y: worldY * this.transform.scale + this.transform.offsetY,
    };
  }

  /**
   * Render frame
   */
  public render(shapes: CanvasShape[]): void {
    const { width, height } = this.canvas;
    const { ctx, transform } = this;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply zoom & pan matrix
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    // Render spatial grid background
    this.renderGrid(width, height, transform);

    // Render all CRDT shapes in z-index order
    for (const shape of shapes) {
      this.drawShape(shape);
      if (shape.id === this.selectedShapeId) {
        this.drawSelectionHandles(shape);
      }
    }

    // Render remote cursors with smooth spring/interpolation
    const now = Date.now();
    for (const [peerId, cursor] of this.remoteCursors.entries()) {
      if (now - cursor.lastActive > 15000) {
        this.remoteCursors.delete(peerId);
        continue;
      }
      this.drawRemoteCursor(cursor);
    }

    ctx.restore();
  }

  private renderGrid(canvasWidth: number, canvasHeight: number, transform: ViewportTransform): void {
    const gridSize = 40;
    const startX = -transform.offsetX / transform.scale;
    const startY = -transform.offsetY / transform.scale;
    const endX = startX + canvasWidth / transform.scale;
    const endY = startY + canvasHeight / transform.scale;

    this.ctx.strokeStyle = '#27272a';
    this.ctx.lineWidth = 1 / transform.scale;

    this.ctx.beginPath();
    for (let x = Math.floor(startX / gridSize) * gridSize; x <= endX; x += gridSize) {
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
    }
    for (let y = Math.floor(startY / gridSize) * gridSize; y <= endY; y += gridSize) {
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
    }
    this.ctx.stroke();
  }

  private drawShape(shape: CanvasShape): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = shape.strokeColor;
    ctx.fillStyle = shape.fillColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape.type) {
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
        ctx.fill();
        ctx.stroke();
        break;

      case 'ellipse':
        ctx.beginPath();
        const rx = Math.abs(shape.width / 2);
        const ry = Math.abs(shape.height / 2);
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'arrow':
        this.drawArrow(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
        break;

      case 'text':
        ctx.font = '16px monospace';
        ctx.fillStyle = shape.strokeColor;
        ctx.fillText(shape.text || 'Text', shape.x, shape.y + 20);
        break;
    }
    ctx.restore();
  }

  private drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
    const headlen = 14;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.fill();
  }

  private drawSelectionHandles(shape: CanvasShape): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5 / this.transform.scale;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(shape.x - 4, shape.y - 4, shape.width + 8, shape.height + 8);
    ctx.restore();
  }

  private drawRemoteCursor(cursor: PeerCursor): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = cursor.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    // Draw cursor pointer
    ctx.beginPath();
    ctx.moveTo(cursor.worldX, cursor.worldY);
    ctx.lineTo(cursor.worldX + 12, cursor.worldY + 12);
    ctx.lineTo(cursor.worldX + 4, cursor.worldY + 12);
    ctx.lineTo(cursor.worldX, cursor.worldY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw peer label tag
    ctx.font = '11px sans-serif';
    ctx.fillStyle = cursor.color;
    ctx.fillRect(cursor.worldX + 14, cursor.worldY + 14, cursor.name.length * 7 + 10, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cursor.name, cursor.worldX + 19, cursor.worldY + 27);
    ctx.restore();
  }
}
