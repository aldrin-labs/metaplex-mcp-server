import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Connection as SolanaConnection } from '@solana/web3.js';
import { Program as AnchorProgram, Idl } from '@project-serum/anchor';
import { PublicKey, Program, Connection } from '../../types/mocks';
import { RecipeService } from '../recipe';
import type { MockedFunction } from '../../types/mocks';

describe('RecipeService', () => {
  let recipeService: RecipeService;
  let mockConnection: Connection;
  let mockProgram: Program;
  let mockFetch: MockedFunction<(address: PublicKey) => Promise<any>>;

  beforeEach(() => {
    mockConnection = new Connection('mock-endpoint');
    mockProgram = new Program('MPL4o4wMzndgh8T1NVDxELQCj5UQfYTYEkabX3wNKtb');
    mockFetch = mockProgram.account.recipeV1.fetch as MockedFunction<(address: PublicKey) => Promise<any>>;

    recipeService = new RecipeService(
      mockConnection as unknown as SolanaConnection,
      mockProgram as unknown as AnchorProgram<Idl>
    );
  });

  describe('analyzeRecipe', () => {
    it('should analyze a valid recipe configuration', async () => {
      const mockRecipeData = {
        name: 'Test Recipe',
        uri: 'https://test.uri',
        max: { toNumber: () => 100 },
        min: { toNumber: () => 1 },
        amount: { toNumber: () => 10 },
        feeAmountCapture: { toNumber: () => 1 },
        feeAmountRelease: { toNumber: () => 1 },
        solFeeAmountCapture: { toNumber: () => 0.1 },
        solFeeAmountRelease: { toNumber: () => 0.1 },
        path: 1,
        count: { toNumber: () => 5 },
      };

      mockFetch.mockResolvedValue(mockRecipeData);

      const result = await recipeService.analyzeRecipe('11111111111111111111111111111111');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.name).toBe('Test Recipe');
      expect(result.max).toBe(100);
      expect(result.min).toBe(1);
    });

    it('should detect invalid max/min configuration', async () => {
      const mockRecipeData = {
        name: 'Test Recipe',
        uri: 'https://test.uri',
        max: { toNumber: () => 1 }, // max <= min
        min: { toNumber: () => 1 },
        amount: { toNumber: () => 10 },
        feeAmountCapture: { toNumber: () => 1 },
        feeAmountRelease: { toNumber: () => 1 },
        solFeeAmountCapture: { toNumber: () => 0.1 },
        solFeeAmountRelease: { toNumber: () => 0.1 },
        path: 1,
        count: { toNumber: () => 5 },
      };

      mockFetch.mockResolvedValue(mockRecipeData);

      const result = await recipeService.analyzeRecipe('11111111111111111111111111111111');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Max value must be greater than min value');
    });

    it('should detect invalid amount configuration', async () => {
      const mockRecipeData = {
        name: 'Test Recipe',
        uri: 'https://test.uri',
        max: { toNumber: () => 100 },
        min: { toNumber: () => 1 },
        amount: { toNumber: () => 0 }, // invalid amount
        feeAmountCapture: { toNumber: () => 1 },
        feeAmountRelease: { toNumber: () => 1 },
        solFeeAmountCapture: { toNumber: () => 0.1 },
        solFeeAmountRelease: { toNumber: () => 0.1 },
        path: 1,
        count: { toNumber: () => 5 },
      };

      mockFetch.mockResolvedValue(mockRecipeData);

      const result = await recipeService.analyzeRecipe('11111111111111111111111111111111');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Amount must be greater than 0');
    });

    it('should handle recipe fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Recipe not found'));

      const result = await recipeService.analyzeRecipe('11111111111111111111111111111111');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Failed to analyze recipe: Recipe not found');
    });
  });
});
