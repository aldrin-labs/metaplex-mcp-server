import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Connection as SolanaConnection } from '@solana/web3.js';
import { Program as AnchorProgram, Idl } from '@project-serum/anchor';
import { PublicKey, Program, Connection } from '../../types/mocks';
import { EscrowService } from '../escrow';
import type { MockedFunction } from '../../types/mocks';

describe('EscrowService', () => {
  let escrowService: EscrowService;
  let mockConnection: Connection;
  let mockProgram: Program;
  let mockEscrowFetch: MockedFunction<(address: PublicKey) => Promise<any>>;
  let mockEscrowAll: MockedFunction<(filters?: any[]) => Promise<any[]>>;
  let mockAssetFetch: MockedFunction<(address: PublicKey) => Promise<any>>;

  const VALID_COLLECTION = '11111111111111111111111111111111';
  const VALID_ESCROW = '22222222222222222222222222222222';
  const VALID_ASSET = '33333333333333333333333333333333';

  beforeEach(() => {
    mockConnection = new Connection('mock-endpoint');
    mockProgram = new Program('MPL4o4wMzndgh8T1NVDxELQCj5UQfYTYEkabX3wNKtb');
    mockEscrowFetch = mockProgram.account.escrowV1.fetch as MockedFunction<(address: PublicKey) => Promise<any>>;
    mockEscrowAll = mockProgram.account.escrowV1.all as MockedFunction<(filters?: any[]) => Promise<any[]>>;
    mockAssetFetch = mockProgram.account.baseAssetV1.fetch as MockedFunction<(address: PublicKey) => Promise<any>>;

    escrowService = new EscrowService(
      mockConnection as unknown as SolanaConnection,
      mockProgram as unknown as AnchorProgram<Idl>
    );
  });

  describe('validateEscrow', () => {
    const validEscrowData = {
      name: 'Test Escrow',
      uri: 'https://test.uri',
      max: { toNumber: () => 100 },
      min: { toNumber: () => 1 },
      amount: { toNumber: () => 10 },
      feeAmount: { toNumber: () => 1 },
      solFeeAmount: { toNumber: () => 0.1 },
      path: 1,
      count: { toNumber: () => 5 },
    };

    it('should validate a correct escrow configuration', async () => {
      mockEscrowFetch.mockResolvedValue(validEscrowData);

      const result = await escrowService.validateEscrow(VALID_COLLECTION, VALID_ESCROW);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.name).toBe('Test Escrow');
      expect(result.max).toBe(100);
      expect(result.min).toBe(1);
    });

    it('should detect invalid max/min configuration', async () => {
      const invalidData = {
        ...validEscrowData,
        max: { toNumber: () => 1 },
        min: { toNumber: () => 1 },
      };

      mockEscrowFetch.mockResolvedValue(invalidData);

      const result = await escrowService.validateEscrow(VALID_COLLECTION, VALID_ESCROW);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Max value must be greater than min value');
    });

    it('should detect invalid amount configuration', async () => {
      const invalidData = {
        ...validEscrowData,
        amount: { toNumber: () => 0 },
      };

      mockEscrowFetch.mockResolvedValue(invalidData);

      const result = await escrowService.validateEscrow(VALID_COLLECTION, VALID_ESCROW);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Amount must be greater than 0');
    });

    it('should handle escrow fetch errors', async () => {
      mockEscrowFetch.mockRejectedValue(new Error('Escrow not found'));

      const result = await escrowService.validateEscrow(VALID_COLLECTION, VALID_ESCROW);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Failed to validate escrow: Escrow not found');
    });
  });

  describe('checkConversionStatus', () => {
    it('should check status of unlocked asset', async () => {
      const mockAssetData = {
        owner: new PublicKey(VALID_COLLECTION),
      };

      mockAssetFetch.mockResolvedValue(mockAssetData);
      mockEscrowAll.mockResolvedValue([]);

      const result = await escrowService.checkConversionStatus(VALID_ASSET);

      expect(result.isLocked).toBe(false);
      expect(result.currentOwner).toBe(VALID_COLLECTION);
      expect(result.escrowAccount).toBeUndefined();
    });

    it('should check status of locked asset', async () => {
      const mockAssetData = {
        owner: new PublicKey(VALID_COLLECTION),
      };

      const mockEscrowData = {
        publicKey: new PublicKey(VALID_ESCROW),
        account: {
          amount: { toNumber: () => 100 },
          lastOperation: 'capture',
          timestamp: { toNumber: () => 1234567890 },
        },
      };

      mockAssetFetch.mockResolvedValue(mockAssetData);
      mockEscrowAll.mockResolvedValue([mockEscrowData]);

      const result = await escrowService.checkConversionStatus(VALID_ASSET);

      expect(result.isLocked).toBe(true);
      expect(result.currentOwner).toBe(VALID_COLLECTION);
      expect(result.escrowAccount).toBe(VALID_ESCROW);
      expect(result.tokenAmount).toBe(100);
      expect(result.lastOperation).toBe('capture');
      expect(result.timestamp).toBe(1234567890);
    });

    it('should handle asset fetch errors', async () => {
      mockAssetFetch.mockRejectedValue(new Error('Asset not found'));

      const result = await escrowService.checkConversionStatus(VALID_ASSET);

      expect(result.isLocked).toBe(false);
      expect(result.currentOwner).toBe('');
      expect(result.issues).toContain('Failed to check conversion status: Asset not found');
    });
  });
});
