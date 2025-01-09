import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@project-serum/anchor';
import { Wallet } from '@project-serum/anchor';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const idl = JSON.parse(await import('fs').then(fs => 
  fs.promises.readFile(path.resolve(__dirname, '../../reference/idls/mpl_hybrid.json'), 'utf-8')
));

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connection: Connection;
  private program: Program;

  private constructor() {
    // Initialize connection to Solana devnet
    this.connection = new Connection(clusterApiUrl('devnet'));
    
    // Create a dummy wallet since we're only reading data
    const wallet = new Wallet(Keypair.generate());
    
    // Create provider
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });

    // Initialize program (this would be replaced with actual MPL-404 program ID and IDL)
    this.program = new Program(
      idl as Idl,
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
