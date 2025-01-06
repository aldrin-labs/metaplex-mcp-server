import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Connection as SolanaConnection } from '@solana/web3.js';
import { Program as AnchorProgram, Idl } from '@project-serum/anchor';
import { PublicKey, Program, Connection } from '../../types/mocks';
import { FeeService } from '../fees';
import type { MockedFunction } from '../../types/mocks';

describe('FeeService', () => {
  let feeService: FeeService;
  let mockConnection: Connection;
  let mockProgram: Program;
  let mockRecipeAll: MockedFunction<(filters?: any[]) => Promise<any[]>>;
  let mockEscrowAll: MockedFunction<(filters?: any[]) => Promise<any[]>>;

  beforeEach(() => {
    mockConnection = new Connection('mock-endpoint');
    mockProgram = new Program('MPL4o4wMzndgh8T1NVDxELQCj5UQfYTYEkabX3wNKtb');
    mockRecipeAll = mockProgram.account.recipeV1.all as MockedFunction<(filters?: any[]) => Promise<any[]>>;
    mockEscrowAll = mockProgram.account.escrowV1.all as MockedFunction<(filters?: any[]) => Promise<any[]>>;

    feeService = new FeeService(
      mockConnection as unknown as SolanaConnection,
      mockProgram as unknown as AnchorProgram<Idl>
    );
  });

  describe('calculateFees', () => {
    const mockRecipeAccount = {
      account: {
        feeAmountCapture: { toNumber: () => 0.01 }, // 1%
        feeAmountRelease: { toNumber: () => 0.02 }, // 2%
        solFeeAmountCapture: { toNumber: () => 0.001 },
        solFeeAmountRelease: { toNumber: () => 0.002 },
      },
      publicKey: new PublicKey('11111111111111111111111111111111'),
    };

    const mockEscrowAccount = {
      account: {
        feeAmount: { toNumber: () => 0.015 }, // 1.5%
        solFeeAmount: { toNumber: () => 0.0015 },
      },
      publicKey: new PublicKey('22222222222222222222222222222222'),
    };

    it('should calculate capture fees correctly', async () => {
      mockRecipeAll.mockResolvedValue([mockRecipeAccount]);

      const result = await feeService.calculateFees('capture', 1000);

      expect(result.isValid).toBe(true);
      expect(result.operation).toBe('capture');
      expect(result.amount).toBe(1000);
      expect(result.tokenFees.protocol).toBe(1); // 0.1% of 1000
      expect(result.tokenFees.project).toBe(10); // 1% of 1000
      expect(result.solFees.protocol).toBe(0.00001);
      expect(result.solFees.project).toBe(0.001);
      expect(result.tokenFees.total).toBe(11); // protocol + project
      expect(result.solFees.total).toBe(0.00101); // protocol + project
    });

    it('should calculate release fees correctly', async () => {
      mockEscrowAll.mockResolvedValue([mockEscrowAccount]);

      const result = await feeService.calculateFees('release', 1000);

      expect(result.isValid).toBe(true);
      expect(result.operation).toBe('release');
      expect(result.amount).toBe(1000);
      expect(result.tokenFees.protocol).toBe(1); // 0.1% of 1000
      expect(result.tokenFees.project).toBe(15); // 1.5% of 1000
      expect(result.solFees.protocol).toBe(0.00001);
      expect(result.solFees.project).toBe(0.0015);
      expect(result.tokenFees.total).toBe(16); // protocol + project
      expect(result.solFees.total).toBe(0.00151); // protocol + project
    });

    it('should handle invalid amount', async () => {
      const result = await feeService.calculateFees('capture', 0);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Amount must be greater than 0');
      expect(result.tokenFees.total).toBe(0);
      expect(result.solFees.total).toBe(0);
    });

    it('should handle fee configuration fetch errors', async () => {
      mockRecipeAll.mockRejectedValue(new Error('Failed to fetch fee configuration'));

      const result = await feeService.calculateFees('capture', 1000);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        'Failed to fetch project fee configuration: Failed to fetch fee configuration'
      );
      expect(result.tokenFees.total).toBe(0);
      expect(result.solFees.total).toBe(0);
    });

    it('should handle missing fee configuration', async () => {
      mockRecipeAll.mockResolvedValue([]);

      const result = await feeService.calculateFees('capture', 1000);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('No fee configuration found');
      expect(result.tokenFees.total).toBe(0);
      expect(result.solFees.total).toBe(0);
    });
  });
});
