// Mock types for test utilities
export interface MockedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mockReturnValue: (value: ReturnType<T>) => MockedFunction<T>;
  mockResolvedValue: (value: Awaited<ReturnType<T>>) => MockedFunction<T>;
  mockRejectedValue: (error: any) => MockedFunction<T>;
  mockImplementation: (fn: T) => MockedFunction<T>;
}

// Mock PublicKey implementation
export class PublicKey {
  private static VALID_ADDRESSES = new Set([
    'MPL4o4wMzndgh8T1NVDxELQCj5UQfYTYEkabX3wNKtb',
    '11111111111111111111111111111111',
    '22222222222222222222222222222222',
    '33333333333333333333333333333333',
  ]);

  private static isValidPublicKey(key: string): boolean {
    return this.VALID_ADDRESSES.has(key);
  }

  private _key: string;

  constructor(value: string | Buffer | Uint8Array | number[]) {
    if (typeof value === 'string') {
      if (!PublicKey.isValidPublicKey(value)) {
        throw new Error('Invalid public key input');
      }
      this._key = value;
    } else {
      this._key = '11111111111111111111111111111111'; // Default for tests
    }
  }

  equals(other: PublicKey): boolean {
    return this._key === other._key;
  }

  toBase58(): string {
    return this._key;
  }

  toBuffer(): Buffer {
    return Buffer.from(this._key);
  }

  toBytes(): Uint8Array {
    return new Uint8Array(Buffer.from(this._key));
  }

  toString(): string {
    return this._key;
  }

  toJSON(): string {
    return this._key;
  }

  get [Symbol.toStringTag](): string {
    return 'PublicKey';
  }

  encode(): Buffer {
    return this.toBuffer();
  }

  static findProgramAddressSync(seeds: Buffer[], programId: PublicKey): [PublicKey, number] {
    // For testing, return a deterministic PDA based on the seeds
    const seedStr = seeds.map(s => s.toString('hex')).join('');
    if (seedStr.includes('escrow')) {
      // Return the escrow address provided in the test when validating escrow
      return [new PublicKey('22222222222222222222222222222222'), 0];
    }
    return [new PublicKey('11111111111111111111111111111111'), 0];
  }
}

// Mock Connection implementation
export class Connection {
  commitment: string;
  rpcEndpoint: string;

  constructor(endpoint?: string, commitment?: string) {
    this.commitment = commitment || 'confirmed';
    this.rpcEndpoint = endpoint || 'mock-endpoint';
  }

  // Add minimal required methods
  getBalance() { return Promise.resolve(0); }
  getBlockTime() { return Promise.resolve(0); }
  getMinimumLedgerSlot() { return Promise.resolve(0); }
  getSlot() { return Promise.resolve(0); }
}

// Mock Program implementation
export class Program {
  programId: PublicKey;
  account: {
    recipeV1: {
      fetch: MockedFunction<(address: PublicKey) => Promise<any>>;
      all: MockedFunction<(filters?: any[]) => Promise<any[]>>;
    };
    escrowV1: {
      fetch: MockedFunction<(address: PublicKey) => Promise<any>>;
      all: MockedFunction<(filters?: any[]) => Promise<any[]>>;
    };
    baseAssetV1: {
      fetch: MockedFunction<(address: PublicKey) => Promise<any>>;
    };
  };

  constructor(programId: string) {
    this.programId = new PublicKey(programId);
    this.account = {
      recipeV1: {
        fetch: jest.fn() as any,
        all: jest.fn() as any,
      },
      escrowV1: {
        fetch: jest.fn() as any,
        all: jest.fn() as any,
      },
      baseAssetV1: {
        fetch: jest.fn() as any,
      },
    };
  }
}
