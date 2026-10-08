import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CausalHistoryStack } from '../src/core/history.js';
import { VectorClock, DeltaOperation } from '../src/core/crdt.js';

describe('Causal Undo/Redo DAG', () => {
  it('correctly records operations and performs linear undo', () => {
    const stack = new CausalHistoryStack('peer-1');
    const vc = new VectorClock();

    const op1: DeltaOperation = {
      opId: 'op-1',
      peerId: 'peer-1',
      timestamp: 1,
      vectorClock: vc.toJSON(),
      type: 'UPSERT_SHAPE',
      payload: { id: 's1', x: 10, y: 10 },
    };
    const inv1: DeltaOperation = {
      opId: 'inv-1',
      peerId: 'peer-1',
      timestamp: 1,
      vectorClock: vc.toJSON(),
      type: 'DELETE_SHAPE',
      payload: { id: 's1', isDeleted: true },
    };

    stack.record(op1, inv1, vc);
    assert.strictEqual(stack.canUndo(), true);

    const reverted = stack.undo();
    assert.strictEqual(reverted?.opId, 'inv-1');
    assert.strictEqual(stack.canUndo(), false);
  });
});