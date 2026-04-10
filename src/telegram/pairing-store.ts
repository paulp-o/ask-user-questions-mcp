import type { PairingChallenge } from "./types.js";

export interface PairingStore {
  put(record: PairingChallenge): void;
  get(id: string): PairingChallenge | undefined;
  delete(id: string): boolean;
  pruneExpired(now?: number): number;
}

export class InMemoryPairingStore implements PairingStore {
  private readonly records = new Map<string, PairingChallenge>();

  put(record: PairingChallenge): void {
    this.records.set(record.id, { ...record });
  }

  get(id: string): PairingChallenge | undefined {
    const record = this.records.get(id);

    return record ? { ...record } : undefined;
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  pruneExpired(now: number = Date.now()): number {
    let removed = 0;

    for (const [id, record] of this.records.entries()) {
      if (record.expiresAt <= now) {
        this.records.delete(id);
        removed += 1;
      }
    }

    return removed;
  }
}
