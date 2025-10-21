import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('verifiers')
export class Verifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  pda: string;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn({ name: 'authority_pubkey', referencedColumnName: 'pubkey' })
  user: User;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}