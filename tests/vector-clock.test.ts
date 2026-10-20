/**
 * NexusCRDT - Dedicated Vector Clock Invariant Tests
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VectorClock, CausalOrder } from '../src/core/crdt.js';

describe('Vector Clock Total & Partial Ordering', () => {
  it('detects concurrent events accurately', () => {
    const clock1 = new VectorClock({ 'peer-A': 3, 'peer-B': 1 });
    const clock2 = new VectorClock({ 'peer-A': 1, 'peer-B': 4 });

    assert.strictEqual(VectorClock.compare(clock1, clock2), CausalOrder.CONCURRENT);
  });

  it('detects causal antecedence', () => {
    const ancestor = new VectorClock({ 'peer-A': 2, 'peer-B': 3 });
    const descendant = new VectorClock({ 'peer-A': 5, 'peer-B': 3 });

    assert.strictEqual(VectorClock.compare(ancestor, descendant), CausalOrder.BEFORE);
    assert.strictEqual(VectorClock.compare(descendant, ancestor), CausalOrder.AFTER);
  });

  it('handles clock serialization and hydration', () => {
    const original = new VectorClock({ 'node-1': 10, 'node-2': 25 });
    const json = original.toJSON();
    const hydrated = new VectorClock(json);

    assert.strictEqual(hydrated.get('node-1'), 10);
    assert.strictEqual(hydrated.get('node-2'), 25);
    assert.strictEqual(VectorClock.compare(original, hydrated), CausalOrder.EQUAL);
  });
});
