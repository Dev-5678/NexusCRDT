/**
 * NexusCRDT - Canvas Snapshot Serializer & SVG Node Exporter
 * 
 * Serializes dynamic canvas vector states into deterministic, standalone SVG markup
 * and compressed JSON snapshot bundles for offline caching and document export.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { CanvasShape } from './crdt';

export interface ExportOptions {
  includeDeleted?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  backgroundColor?: string;
  embedTimestamp?: boolean;
}

export class CanvasSerializer {
  /**
   * Serializes a collection of canvas shapes into standalone standard SVG markup
   */
  public static toSVG(shapes: CanvasShape[], options: ExportOptions = {}): string {
    const {
      includeDeleted = false,
      viewportWidth = 1920,
      viewportHeight = 1080,
      backgroundColor = '#09090b',
      embedTimestamp = true,
    } = options;

    const visibleShapes = shapes
      .filter((s) => includeDeleted || !s.isDeleted)
      .sort((a, b) => a.zIndex - b.zIndex);

    let svgElements = '';

    for (const shape of visibleShapes) {
      switch (shape.type) {
        case 'rectangle':
          svgElements += `  <rect id="${shape.id}" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" rx="4" />\n`;
          break;
        case 'ellipse':
          const cx = shape.x + shape.width / 2;
          const cy = shape.y + shape.height / 2;
          const rx = shape.width / 2;
          const ry = shape.height / 2;
          svgElements += `  <ellipse id="${shape.id}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" />\n`;
          break;
        case 'text':
          svgElements += `  <text id="${shape.id}" x="${shape.x}" y="${shape.y + shape.height}" fill="${shape.strokeColor}" font-family="sans-serif" font-size="16">${CanvasSerializer.escapeXml(shape.text || '')}</text>\n`;
          break;
        case 'arrow':
          const x2 = shape.x + shape.width;
          const y2 = shape.y + shape.height;
          svgElements += `  <line id="${shape.id}" x1="${shape.x}" y1="${shape.y}" x2="${x2}" y2="${y2}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" marker-end="url(#arrowhead)" />\n`;
          break;
      }
    }

    const timestampComment = embedTimestamp
      ? `<!-- Exported at ${new Date().toISOString()} by NexusCRDT Serializer -->\n`
      : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewportWidth} ${viewportHeight}" width="${viewportWidth}" height="${viewportHeight}">
${timestampComment}  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="${backgroundColor}" />
${svgElements}</svg>`;
  }

  /**
   * Serializes canvas shapes into JSON document payload with schema version
   */
  public static toJSONSnapshot(shapes: CanvasShape[], documentId: string = 'canvas-doc-1'): string {
    const payload = {
      version: '1.2.0',
      documentId,
      exportedAt: new Date().toISOString(),
      shapeCount: shapes.length,
      shapes,
    };
    return JSON.stringify(payload, null, 2);
  }

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}
