import { Connection, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@project-serum/anchor';
import { NodeWallet } from '@project-serum/anchor/dist/cjs/provider';

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connection: Connection;
  private program: Program;

  private constructor() {
    // Initialize connection to Solana devnet
    this.connection = new Connection(clusterApiUrl('devnet'));
    
    // Create a dummy wallet since we're only reading data
    const wallet = new NodeWallet(null);
    
    // Create provider
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });

    // Initialize program (this would be replaced with actual MPL-404 program ID and IDL)
    this.program = new Program(
      {} as Idl, // Replace with actual IDL
      'MPL4o4wMzndgh8T1NVDxELQCj5UQfYTYEkabX3wNKtb',
      provider
    );
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public getProgram(): Program {
    return this.program;
  }
}
