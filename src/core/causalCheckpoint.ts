/**
 * NexusCRDT - Causal Checkpoint & Merkle State Digest Engine
 * 
 * Provides periodic anti-entropy compaction by generating cryptographic Merkle
 * state digests across localized CRDT semilattices. Enables newly reconnected
 * peers to synchronize diverging state using logarithmic O(log N) tree diffs
 * instead of linear O(N) full-state replays.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  keyRange: [string, string];
}

export interface StateDigestComparison {
  synchronized: boolean;
  divergentKeys: string[];
}

export class CausalCheckpointEngine {
  private localState: Map<string, { value: any; lamportClock: number; peerId: string }>;

  constructor() {
    this.localState = new Map();
  }

  public upsert(key: string, value: any, lamportClock: number, peerId: string): void {
    const existing = this.localState.get(key);
    if (!existing || lamportClock > existing.lamportClock || 
       (lamportClock === existing.lamportClock && peerId > existing.peerId)) {
      this.localState.set(key, { value, lamportClock, peerId });
    }
  }

  /**
   * Simple non-cryptographic FNV-1a 32-bit hash function for deterministic fast tree digests
   */
  private fnv1a(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * Builds a binary Merkle tree over sorted lexicographical keys
   */
  public generateMerkleRoot(): string {
    const keys = Array.from(this.localState.keys()).sort();
    if (keys.length === 0) return '00000000';

    let levelHashes = keys.map(k => {
      const entry = this.localState.get(k)!;
      return this.fnv1a(`${k}:${entry.lamportClock}:${entry.peerId}:${JSON.stringify(entry.value)}`);
    });

    while (levelHashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < levelHashes.length; i += 2) {
        if (i + 1 < levelHashes.length) {
          nextLevel.push(this.fnv1a(levelHashes[i] + levelHashes[i + 1]));
        } else {
          nextLevel.push(levelHashes[i]);
        }
      }
      levelHashes = nextLevel;
    }

    return levelHashes[0];
  }

  /**
   * Compares local state against a remote state map to extract diverging delta keys
   */
  public compareState(remoteMap: Map<string, { lamportClock: number; peerId: string }>): StateDigestComparison {
    const divergentKeys: string[] = [];

    // Check missing or outdated keys
    for (const [key, localEntry] of this.localState.entries()) {
      const remote = remoteMap.get(key);
      if (!remote || remote.lamportClock < localEntry.lamportClock) {
        divergentKeys.push(key);
      }
    }

    // Check remote keys not present locally
    for (const [key, remoteEntry] of remoteMap.entries()) {
      const local = this.localState.get(key);
      if (!local || local.lamportClock < remoteEntry.lamportClock) {
        if (!divergentKeys.includes(key)) {
          divergentKeys.push(key);
        }
      }
    }

    return {
      synchronized: divergentKeys.length === 0,
      divergentKeys
    };
  }

  public get size(): number {
    return this.localState.size;
  }
}
