import type { Connection as SolanaConnection } from '@solana/web3.js';
import type { Program as AnchorProgram } from '@project-serum/anchor';
import { PublicKey } from '../types/mocks';

export interface EscrowValidation {
  collection: string;
  escrow: string;
  name: string;
  uri: string;
  max: number;
  min: number;
  amount: number;
  feeAmount: number;
  solFeeAmount: number;
  path: number;
  count: number;
  isValid: boolean;
  issues: string[];
}

export interface ConversionStatus {
  asset: string;
  isLocked: boolean;
  currentOwner: string;
  escrowAccount?: string;
  tokenAmount?: number;
  lastOperation?: 'capture' | 'release';
  timestamp?: number;
  issues?: string[];
}

export class EscrowService {
  constructor(
    private connection: SolanaConnection,
    private program: AnchorProgram
  ) {}

  async validateEscrow(collectionAddress: string, escrowAddress: string): Promise<EscrowValidation> {
    try {
      const collection = new PublicKey(collectionAddress);
      const escrow = new PublicKey(escrowAddress);

      // Fetch escrow account data first
      const escrowAccount = await this.program.account.escrowV1.fetch(escrow as any);
      
      const issues: string[] = [];

      // Validate escrow configuration
      if (escrowAccount.max.toNumber() <= escrowAccount.min.toNumber()) {
        issues.push("Max value must be greater than min value");
      }

      if (escrowAccount.amount.toNumber() <= 0) {
        issues.push("Amount must be greater than 0");
      }

      // Check fee configuration
      if (escrowAccount.feeAmount.toNumber() < 0) {
        issues.push("Fee amount cannot be negative");
      }

      if (escrowAccount.solFeeAmount.toNumber() < 0) {
        issues.push("SOL fee amount cannot be negative");
      }

      return {
        collection: collectionAddress,
        escrow: escrowAddress,
        name: escrowAccount.name,
        uri: escrowAccount.uri,
        max: escrowAccount.max.toNumber(),
        min: escrowAccount.min.toNumber(),
        amount: escrowAccount.amount.toNumber(),
        feeAmount: escrowAccount.feeAmount.toNumber(),
        solFeeAmount: escrowAccount.solFeeAmount.toNumber(),
        path: escrowAccount.path,
        count: escrowAccount.count.toNumber(),
        isValid: issues.length === 0,
        issues
      };
    } catch (error: any) {
      if (error.message === 'Invalid public key input') {
        throw error;
      }
      return {
        collection: collectionAddress,
        escrow: escrowAddress,
        name: "",
        uri: "",
        max: 0,
        min: 0,
        amount: 0,
        feeAmount: 0,
        solFeeAmount: 0,
        path: 0,
        count: 0,
        isValid: false,
        issues: [`Failed to validate escrow: ${error.message}`]
      };
    }
  }

  async checkConversionStatus(assetAddress: string): Promise<ConversionStatus> {
    try {
      const asset = new PublicKey(assetAddress);
      
      // Fetch asset account data
      const assetAccount = await this.program.account.baseAssetV1.fetch(asset as any);
      
      // Check if asset is currently locked in an escrow
      const escrowAccounts = await this.program.account.escrowV1.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: asset.toBase58()
          }
        }
      ]);

      if (escrowAccounts.length === 0) {
        return {
          asset: assetAddress,
          isLocked: false,
          currentOwner: assetAccount.owner.toString()
        };
      }

      const escrowAccount = escrowAccounts[0];
      return {
        asset: assetAddress,
        isLocked: true,
        currentOwner: assetAccount.owner.toString(),
        escrowAccount: escrowAccount.publicKey.toString(),
        tokenAmount: escrowAccount.account.amount.toNumber(),
        lastOperation: escrowAccount.account.lastOperation,
        timestamp: escrowAccount.account.timestamp.toNumber()
      };
    } catch (error: any) {
      if (error.message === 'Invalid public key input') {
        throw error;
      }
      return {
        asset: assetAddress,
        isLocked: false,
        currentOwner: "",
        issues: [`Failed to check conversion status: ${error.message}`]
      };
    }
  }
}
