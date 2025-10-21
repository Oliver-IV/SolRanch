import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TxStatus {
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

  @Index({ unique: true })
  @Column()
  animalPda: string;

  @Column({
    type: 'enum',
    enum: TxStatus,
    default: TxStatus.PENDING_VERIFIER_SIGNATURE,
  })
  status: TxStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  finalTxSignature: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}