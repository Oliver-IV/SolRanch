// 📍 Archivo: src/auth/entities/user.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { Ranch } from '../../ranch/entities/ranch.entity';

export enum UserRole {
  RANCHER = 'RANCHER',
  USER = 'USER',
  VERIFIER = 'VERIFIER'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  pubkey: string;

  @Column()
  nonce: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.USER],
  })
  roles: UserRole[];

  @OneToOne(() => Ranch, (ranch) => ranch.user)
  ranch: Ranch;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}