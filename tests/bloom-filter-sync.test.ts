/**
 * NexusCRDT - Bloom Filter & State Digest Synchronization Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

class SimpleDigestFilter {
  private bits: Uint8Array;
  private size: number;
  private hashCount: number;

  constructor(size = 256, hashCount = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  private hash(str: string, seed: number): number {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % this.size;
  }

  public add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(item, i);
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = idx % 8;
      this.bits[byteIdx] |= 1 << bitOffset;
    }
  }

  public mightContain(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(item, i);
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = idx % 8;
      if ((this.bits[byteIdx] & (1 << bitOffset)) === 0) {
        return false;
      }
    }
    return true;
  }

  public reconcileDifferences(peerFilter: SimpleDigestFilter, localItems: string[]): string[] {
    const missingInPeer: string[] = [];
    for (const item of localItems) {
      if (!peerFilter.mightContain(item)) {
        missingInPeer.push(item);
      }
    }
    return missingInPeer;
  }
}

describe('Bloom Filter & State Digest Synchronization', () => {
  it('correctly filters definite negatives without false negatives', () => {
    const filter = new SimpleDigestFilter(512, 4);
    const addedItems = ['op-vclock-1', 'op-vclock-2', 'op-vclock-3'];

    for (const item of addedItems) {
      filter.add(item);
    }

    for (const item of addedItems) {
      assert.strictEqual(filter.mightContain(item), true);
    }

    assert.strictEqual(filter.mightContain('unseen-mutation-xyz'), false);
  });

  it('identifies un-reconciled causal operations between peers', () => {
    const peerA = new SimpleDigestFilter(1024, 3);
    const peerB = new SimpleDigestFilter(1024, 3);

    const itemsA = ['shape-rect-1', 'shape-circle-2', 'shape-text-3'];
    const itemsB = ['shape-rect-1'];

    for (const item of itemsA) peerA.add(item);
    for (const item of itemsB) peerB.add(item);

    const needsPushToB = peerB.reconcileDifferences(peerB, itemsA);
    assert.ok(needsPushToB.includes('shape-circle-2'));
    assert.ok(needsPushToB.includes('shape-text-3'));
  });
});
