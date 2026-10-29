/**
 * NexusCRDT - LWW-Element-Set Garbage Collection Latency Benchmark
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

interface ElementRecord<T> {
  value: T;
  timestamp: number;
  peerId: string;
}

class LWWElementSet<T> {
  private addSet: Map<string, ElementRecord<T>> = new Map();
  private removeSet: Map<string, ElementRecord<T>> = new Map();

  public add(key: string, value: T, timestamp: number, peerId: string): void {
    const existing = this.addSet.get(key);
    if (!existing || timestamp > existing.timestamp) {
      this.addSet.set(key, { value, timestamp, peerId });
    }
  }

  public remove(key: string, timestamp: number, peerId: string): void {
    const existing = this.removeSet.get(key);
    if (!existing || timestamp > existing.timestamp) {
      const addEntry = this.addSet.get(key);
      this.removeSet.set(key, { value: addEntry?.value as T, timestamp, peerId });
    }
  }

  public has(key: string): boolean {
    const addEntry = this.addSet.get(key);
    if (!addEntry) return false;
    const removeEntry = this.removeSet.get(key);
    if (!removeEntry) return true;
    return addEntry.timestamp > removeEntry.timestamp;
  }

  public compactTombstones(cutoffTimestamp: number): number {
    let purgedCount = 0;
    for (const [key, removeEntry] of this.removeSet.entries()) {
      const addEntry = this.addSet.get(key);
      if (removeEntry.timestamp <= cutoffTimestamp) {
        if (!addEntry || removeEntry.timestamp >= addEntry.timestamp) {
          this.addSet.delete(key);
          this.removeSet.delete(key);
          purgedCount++;
        }
      }
    }
    return purgedCount;
  }

  public size(): { active: number; tombstones: number } {
    let active = 0;
    for (const key of this.addSet.keys()) {
      if (this.has(key)) active++;
    }
    return { active, tombstones: this.removeSet.size };
  }
}

describe('LWW-Element-Set Tombstone Garbage Collector', () => {
  it('correctly resolves concurrent additions and removals by latest wall clock', () => {
    const set = new LWWElementSet<string>();
    set.add('node-1', 'Shape A', 100, 'peer-1');
    assert.strictEqual(set.has('node-1'), true);

    set.remove('node-1', 105, 'peer-2');
    assert.strictEqual(set.has('node-1'), false);

    set.add('node-1', 'Shape A Reborn', 110, 'peer-1');
    assert.strictEqual(set.has('node-1'), true);
  });

  it('purges obsolete tombstones below stable frontier threshold', () => {
    const set = new LWWElementSet<string>();
    for (let i = 0; i < 50; i++) {
      set.add(`shape-${i}`, `Payload ${i}`, 100 + i, 'peer-1');
      if (i % 2 === 0) {
        set.remove(`shape-${i}`, 200 + i, 'peer-2');
      }
    }

    const { tombstones } = set.size();
    assert.strictEqual(tombstones, 25);

    const purged = set.compactTombstones(250);
    assert.strictEqual(purged, 25);
    assert.strictEqual(set.size().tombstones, 0);
    assert.strictEqual(set.size().active, 25);
  });
});
