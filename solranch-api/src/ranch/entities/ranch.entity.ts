import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Country } from '../enums/country.enum';

@Entity('ranches')
export class Ranch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  pda: string;

  @OneToOne(() => User, (user) => user.ranch, { cascade: true })
  @JoinColumn({ name: 'authority_pubkey', referencedColumnName: 'pubkey' })
  user: User;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: Country, 
    nullable: false 
  })
  country: Country;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'bigint', default: 0 })
  animalCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}