import { randomInt } from "node:crypto";

import type {
  PairingChallenge,
  PairingServiceOptions,
  PairingVerificationResult,
} from "./types.js";
import type { PairingStore } from "./pairing-store.js";

export class PairingService {
  private sequence = 0;
  private readonly now: () => number;

  constructor(
    private readonly store: PairingStore,
    private readonly options: PairingServiceOptions,
  ) {
    this.now = options.now ?? Date.now;
  }

  issue(): PairingChallenge {
    const issuedAt = this.now();
    const pinGenerator =
      this.options.pinGenerator ?? createPinGenerator(this.options.pinLength);
    const challenge: PairingChallenge = {
      id: `pairing_${++this.sequence}`,
      pin: pinGenerator(),
      issuedAt,
      expiresAt: issuedAt + this.options.ttlMs,
      attemptsLeft: this.options.maxAttempts,
      maxAttempts: this.options.maxAttempts,
    };

    this.store.put(challenge);

    return { ...challenge };
  }

  verify(id: string, pin: string): PairingVerificationResult {
    const record = this.store.get(id);

    if (!record) {
      return {
        status: "not_found",
        attemptsLeft: 0,
      };
    }

    const now = this.now();

    if (record.expiresAt <= now) {
      this.store.delete(id);

      return {
        status: "expired",
        attemptsLeft: record.attemptsLeft,
      };
    }

    if (record.attemptsLeft <= 0) {
      this.store.delete(id);

      return {
        status: "locked",
        attemptsLeft: 0,
      };
    }

    if (record.pin === pin) {
      this.store.delete(id);

      return {
        status: "matched",
        attemptsLeft: record.attemptsLeft,
      };
    }

    const attemptsLeft = record.attemptsLeft - 1;

    if (attemptsLeft <= 0) {
      this.store.delete(id);

      return {
        status: "locked",
        attemptsLeft: 0,
      };
    }

    this.store.put({
      ...record,
      attemptsLeft,
    });

    return {
      status: "mismatch",
      attemptsLeft,
    };
  }
}

function createPinGenerator(pinLength: number = 6): () => string {
  return () => {
    const upperBound = 10 ** pinLength;
    const value = randomInt(0, upperBound);

    return value.toString().padStart(pinLength, "0");
  };
}
