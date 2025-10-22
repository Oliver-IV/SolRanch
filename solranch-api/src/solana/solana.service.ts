// 📍 File: src/solana/solana.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { SolranchAnchor } from './idl/solranch_anchor';
import * as idl from './idl/solranch_anchor.json';

@Injectable()
export class SolanaService implements OnModuleInit {
  public connection: Connection;
  public program: Program<SolranchAnchor>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL');
    const programId = new PublicKey(
      this.configService.get<string>('PROGRAM_ID') || '',
    );

    if (!rpcUrl || !programId) {
      throw new Error('Missing SOLANA_RPC_URL or PROGRAM_ID in .env');
    }

    this.connection = new Connection(rpcUrl, 'confirmed');

    const dummyWallet = new Wallet(Keypair.generate());

    const provider = new AnchorProvider(this.connection, dummyWallet, {
      preflightCommitment: 'confirmed',
    });

    this.program = new Program<SolranchAnchor>(
      idl as SolranchAnchor,
      provider
    );
  }

  public getProgram(): Program<SolranchAnchor> {
    return this.program;
  }

  public getConnection(): Connection {
    return this.connection;
  }
}