import { Connection, PublicKey } from '@solana/web3.js';
import { Program } from '@project-serum/anchor';

export interface RecipeAnalysis {
  collection: string;
  name: string;
  uri: string;
  max: number;
  min: number;
  amount: number;
  feeAmountCapture: number;
  feeAmountRelease: number;
  solFeeAmountCapture: number;
  solFeeAmountRelease: number;
  path: number;
  count: number;
  isValid: boolean;
  issues: string[];
}

export class RecipeService {
  constructor(
    private connection: Connection,
    private program: Program
  ) {}

  async analyzeRecipe(collectionAddress: string): Promise<RecipeAnalysis> {
    try {
      const collection = new PublicKey(collectionAddress);
      
      // Derive recipe PDA
      const [recipePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("recipe"), collection.toBuffer()],
        this.program.programId
      );

      // Fetch recipe account data
      const recipeAccount = await this.program.account.recipeV1.fetch(recipePda);
      
      const issues: string[] = [];

      // Validate recipe configuration
      if (recipeAccount.max.toNumber() <= recipeAccount.min.toNumber()) {
        issues.push("Max value must be greater than min value");
      }

      if (recipeAccount.amount.toNumber() <= 0) {
        issues.push("Amount must be greater than 0");
      }

      // Check fee configuration
      if (recipeAccount.feeAmountCapture.toNumber() < 0 || recipeAccount.feeAmountRelease.toNumber() < 0) {
        issues.push("Fee amounts cannot be negative");
      }

      if (recipeAccount.solFeeAmountCapture.toNumber() < 0 || recipeAccount.solFeeAmountRelease.toNumber() < 0) {
        issues.push("SOL fee amounts cannot be negative");
      }

      return {
        collection: collectionAddress,
        name: recipeAccount.name,
        uri: recipeAccount.uri,
        max: recipeAccount.max.toNumber(),
        min: recipeAccount.min.toNumber(),
        amount: recipeAccount.amount.toNumber(),
        feeAmountCapture: recipeAccount.feeAmountCapture.toNumber(),
        feeAmountRelease: recipeAccount.feeAmountRelease.toNumber(),
        solFeeAmountCapture: recipeAccount.solFeeAmountCapture.toNumber(),
        solFeeAmountRelease: recipeAccount.solFeeAmountRelease.toNumber(),
        path: recipeAccount.path,
        count: recipeAccount.count.toNumber(),
        isValid: issues.length === 0,
        issues
      };
    } catch (error: any) {
      return {
        collection: collectionAddress,
        name: "",
        uri: "",
        max: 0,
        min: 0,
        amount: 0,
        feeAmountCapture: 0,
        feeAmountRelease: 0,
        solFeeAmountCapture: 0,
        solFeeAmountRelease: 0,
        path: 0,
        count: 0,
        isValid: false,
        issues: [`Failed to analyze recipe: ${error.message}`]
      };
    }
  }
}
