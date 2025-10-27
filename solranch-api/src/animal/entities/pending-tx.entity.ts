import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TxStatus {
  PENDING_RANCHER_SIGNATURE = 'pending_rancher_signature',
  PENDING_VERIFIER_SIGNATURE = 'pending_verifier_signature',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('pending_transactions')
export class PendingTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  serializedTx: string;

  @Index()
  @Column()
  rancherPubkey: string;

  @Index()
  @Column()
  verifierPubkey: string;

  @Index()
  @Column()
  animalPda: string;

  @Column({ nullable: true })
  id_chip: string;

  @Column({ nullable: true })
  specie: string;

  @Column({ nullable: true })
  breed: string;

  @Column({ type: 'timestamp', nullable: true })
  birth_date: Date;

  @Column({
    type: 'enum',
    enum: TxStatus,
    default: TxStatus.PENDING_RANCHER_SIGNATURE,
  })
  status: TxStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  finalTxSignature: string;

  @Column({ nullable: true })  
  blockhash: string;

  @Column({ nullable: true }) 
  lastValidBlockHeight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}