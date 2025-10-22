import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import {
  AnchorProvider,
  Program,
  Wallet,
  Idl,
  setProvider,
} from '@coral-xyz/anchor';
import { SolranchAnchor } from './idl/solranch_anchor';
import * as idl from './idl/solranch_anchor.json';
import bs58 from 'bs58';

@Injectable()
export class SolanaService implements OnModuleInit {
  private readonly logger = new Logger(SolanaService.name);
  public connection: Connection;
  public program: Program<SolranchAnchor>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('Initializing SolanaService...');

    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL');
    const programId = new PublicKey(
      this.configService.get<string>('PROGRAM_ID') || '',
    );

    if (!rpcUrl || !programId) {
      throw new Error('Missing SOLANA_RPC_URL or PROGRAM_ID in .env');
    }

    this.connection = new Connection(rpcUrl, 'confirmed');

    const adminSecret = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!adminSecret) {
      throw new Error('ADMIN_SECRET_KEY not set for SolanaService');
    }

    let adminKeypair: Keypair;
    try {
      adminKeypair = Keypair.fromSecretKey(bs58.decode(adminSecret));
    } catch (e) {
      throw new Error(`Invalid ADMIN_SECRET_KEY: ${e.message}`);
    }

    const wallet = new Wallet(adminKeypair);

    const provider = new AnchorProvider(this.connection, wallet, {
      preflightCommitment: 'confirmed',
      commitment: 'confirmed',
    });

    setProvider(provider);

    this.program = new Program(
      idl as Idl,
      provider, 
    ) as Program<SolranchAnchor>;

    this.logger.log(`SolanaService initialized. Program ID: ${programId.toBase58()}`);
    this.logger.log(`IDL Program ID: ${this.program.programId.toBase58()}`); 
    this.logger.log(`Provider wallet (Admin): ${wallet.publicKey.toBase58()}`);
  }

  public getProgram(): Program<SolranchAnchor> {
    return this.program;
  }

  public getConnection(): Connection {
    return this.connection;
  }
}