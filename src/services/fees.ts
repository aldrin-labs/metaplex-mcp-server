import { Connection, PublicKey } from '@solana/web3.js';
import { Program } from '@project-serum/anchor';

export interface FeeCalculation {
  operation: 'capture' | 'release';
  amount: number;
  tokenFees: {
    protocol: number;
    project: number;
    total: number;
  };
  solFees: {
    protocol: number;
    project: number;
    total: number;
  };
  isValid: boolean;
  issues: string[];
}

export class FeeService {
  private readonly PROTOCOL_TOKEN_FEE_RATE = 0.001; // 0.1%
  private readonly PROTOCOL_SOL_FEE = 0.00001; // Fixed SOL fee

  constructor(
    private connection: Connection,
    private program: Program
  ) {}

  async calculateFees(operation: 'capture' | 'release', amount: number): Promise<FeeCalculation> {
    const issues: string[] = [];

    if (amount <= 0) {
      return {
        operation,
        amount,
        tokenFees: { protocol: 0, project: 0, total: 0 },
        solFees: { protocol: 0, project: 0, total: 0 },
        isValid: false,
        issues: ['Amount must be greater than 0']
      };
    }

    // Calculate protocol fees
    const protocolTokenFee = amount * this.PROTOCOL_TOKEN_FEE_RATE;
    const protocolSolFee = this.PROTOCOL_SOL_FEE;

    // Get project fee configuration
    let projectTokenFee = 0;
    let projectSolFee = 0;

    try {
      const accounts = operation === 'capture'
        ? await this.program.account.recipeV1.all()
        : await this.program.account.escrowV1.all();

      if (accounts.length === 0) {
        return {
          operation,
          amount,
          tokenFees: { protocol: 0, project: 0, total: 0 },
          solFees: { protocol: 0, project: 0, total: 0 },
          isValid: false,
          issues: ['No fee configuration found']
        };
      }

      const config = accounts[0].account;
      if (operation === 'capture') {
        projectTokenFee = config.feeAmountCapture.toNumber() * amount;
        projectSolFee = config.solFeeAmountCapture.toNumber();
      } else {
        projectTokenFee = config.feeAmount.toNumber() * amount;
        projectSolFee = config.solFeeAmount.toNumber();
      }
    } catch (error: any) {
      return {
        operation,
        amount,
        tokenFees: { protocol: 0, project: 0, total: 0 },
        solFees: { protocol: 0, project: 0, total: 0 },
        isValid: false,
        issues: [`Failed to fetch project fee configuration: ${error.message}`]
      };
    }

    const tokenTotal = protocolTokenFee + projectTokenFee;
    const solTotal = protocolSolFee + projectSolFee;

    return {
      operation,
      amount,
      tokenFees: {
        protocol: protocolTokenFee,
        project: projectTokenFee,
        total: tokenTotal
      },
      solFees: {
        protocol: protocolSolFee,
        project: projectSolFee,
        total: solTotal
      },
      isValid: true,
      issues
    };
  }
}
