import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'client' })
  role: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => Run, (r) => r.user)
  runs?: Run[];

  @OneToMany(() => LoyaltyLedger, (l) => l.user)
  ledger?: LoyaltyLedger[];
}

@Entity('mazes')
export class Maze {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 240 })
  photoUrl: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  caption: string | null;

  @Column({ type: 'int' })
  parSec: number;

  @Column({ type: 'int' })
  durationMin: number;

  @Column({ type: 'int' })
  maxTeams: number;

  @Column({ type: 'boolean', default: true })
  open: boolean;

  @OneToMany(() => MazePrice, (p) => p.maze)
  prices?: MazePrice[];

  @OneToMany(() => Checkpoint, (c) => c.maze)
  checkpoints?: Checkpoint[];

  @OneToMany(() => Run, (r) => r.maze)
  runs?: Run[];
}

@Entity('maze_prices')
@Index(['mazeId', 'teamMin', 'teamMax'], { unique: true })
export class MazePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  mazeId: string;

  @ManyToOne(() => Maze, (m) => m.prices, { onDelete: 'CASCADE' })
  maze?: Maze;

  @Column({ type: 'int' })
  teamMin: number;

  @Column({ type: 'int' })
  teamMax: number;

  @Column({ type: 'int' })
  priceCents: number;
}

@Entity('checkpoints')
export class Checkpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  mazeId: string;

  @ManyToOne(() => Maze, (m) => m.checkpoints, { onDelete: 'CASCADE' })
  maze?: Maze;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'int' })
  sortOrder: number;
}

@Entity('runs')
@Index(['code'], { unique: true })
@Index(['mazeId', 'status'])
@Index(['userId', 'mazeId', 'civilDay'])
export class Run {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 12, unique: true })
  code: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u) => u.runs)
  user?: User;

  @Column({ type: 'varchar' })
  mazeId: string;

  @ManyToOne(() => Maze, (m) => m.runs)
  maze?: Maze;

  @Column({ type: 'int' })
  teamSize: number;

  @Column({ type: 'int' })
  totalCents: number;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  elapsedSec: number | null;

  @Column({ type: 'text', nullable: true })
  qrSvg: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  qrUrl: string | null;

  @Column({ type: 'date' })
  civilDay: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => RunEvent, (e) => e.run)
  events?: RunEvent[];

  @OneToMany(() => CheckpointVisit, (v) => v.run)
  visits?: CheckpointVisit[];
}

@Entity('run_events')
export class RunEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  runId: string;

  @ManyToOne(() => Run, (r) => r.events, { onDelete: 'CASCADE' })
  run?: Run;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ type: 'datetime' })
  at: Date;

  @Column({ type: 'varchar', length: 160, nullable: true })
  note: string | null;
}

@Entity('checkpoint_visits')
export class CheckpointVisit {
  @PrimaryColumn({ type: 'varchar' })
  runId: string;

  @PrimaryColumn({ type: 'varchar' })
  checkpointId: string;

  @ManyToOne(() => Run, (r) => r.visits, { onDelete: 'CASCADE' })
  run?: Run;

  @ManyToOne(() => Checkpoint)
  checkpoint?: Checkpoint;

  @Column({ type: 'datetime' })
  at: Date;
}

@Entity('loyalty_ledger')
export class LoyaltyLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u) => u.ledger)
  user?: User;

  @Column({ type: 'varchar', unique: true })
  runId: string;

  @Column({ type: 'int' })
  points: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}

export const ALL_ENTITIES = [
  User,
  Maze,
  MazePrice,
  Checkpoint,
  Run,
  RunEvent,
  CheckpointVisit,
  LoyaltyLedger,
];
