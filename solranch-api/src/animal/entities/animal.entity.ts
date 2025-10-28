import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Ranch } from '../../ranch/entities/ranch.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('animals')
export class Animal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column()
    pda: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'owner_pubkey', referencedColumnName: 'pubkey' })
    owner: User;

    @ManyToOne(() => Ranch)
    @JoinColumn({ name: 'owner_ranch_pda', referencedColumnName: 'pda' })
    ownerRanch: Ranch;

    @ManyToOne(() => Ranch)
    @JoinColumn({ name: 'origin_ranch_pda', referencedColumnName: 'pda' })
    originRanch: Ranch;

    @Index()
    @Column()
    idChip: string;

    @Column()
    specie: string;

    @Index()
    @Column()
    breed: string;

    @Column({ type: 'timestamp' })
    birthDate: Date;

    @Index()
    @Column({ type: 'bigint', nullable: true })
    salePrice: string | null; 

    @Column({ type: 'bigint', default: 0 })
    lastSalePrice: string; 

    @Index()
    @Column({ type: 'varchar', nullable: true })
    allowedBuyerPubkey: string | null;

    @Column({ name: 'assigned_verifier_pubkey', nullable: true, type: 'varchar' })
    assignedVerifierPubkey: string | null;

    @Column({ name: 'is_verified', default: false })
    isVerified: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}