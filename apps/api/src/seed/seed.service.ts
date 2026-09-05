import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';
import {
  Checkpoint,
  CheckpointVisit,
  LoyaltyLedger,
  Maze,
  MazePrice,
  Run,
  RunEvent,
  User,
} from '../entities/entities';
import { addDaysIso, madridToday, webOrigin } from '../util/madrid';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Maze) private readonly mazes: Repository<Maze>,
    @InjectRepository(MazePrice) private readonly prices: Repository<MazePrice>,
    @InjectRepository(Checkpoint) private readonly checks: Repository<Checkpoint>,
    @InjectRepository(Run) private readonly runs: Repository<Run>,
    @InjectRepository(RunEvent) private readonly events: Repository<RunEvent>,
    @InjectRepository(CheckpointVisit) private readonly visits: Repository<CheckpointVisit>,
    @InjectRepository(LoyaltyLedger) private readonly ledger: Repository<LoyaltyLedger>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_DB === 'false') return;
    const count = await this.users.count();
    if (count) {
      this.log.log('Seed skipped — users already present');
      return;
    }
    await this.seed();
  }

  async seed() {
    const hash = await bcrypt.hash('demo1234', 10);
    const demo = (await this.users.save({
      username: 'demo',
      email: 'demo@dedalo.dev',
      passwordHash: hash,
      role: 'client',
    } as any)) as User;
    const staff = (await this.users.save({
      username: 'staff',
      email: 'staff@dedalo.dev',
      passwordHash: hash,
      role: 'staff',
    } as any)) as User;
    await this.users.save({
      username: 'admin',
      email: 'admin@dedalo.dev',
      passwordHash: hash,
      role: 'admin',
    } as any);
    const neighbor = (await this.users.save({
      username: 'vecina',
      email: 'vecina@dedalo.dev',
      passwordHash: hash,
      role: 'client',
    } as any)) as User;

    const mayor = await this.maze(
      'espejo-mayor',
      'Espejo Mayor',
      'El pasillo largo: tres giros, un falso fondo y el azogue del fondo.',
      '/assets/espejo-mayor.svg',
      'Espejo Mayor — pasillo de azogue',
      270,
      12,
      2,
      [
        [1, 2, 1400],
        [3, 4, 1800],
        [5, 6, 2400],
      ],
      ['Umbral', 'Doble luna', 'Azogue'],
    );
    const luna = await this.maze(
      'doble-luna',
      'Doble luna',
      'Dos cámaras enfrentadas. El hilo se pierde si miras el reflejo y no la junta.',
      '/assets/doble-luna.svg',
      'Doble luna — cámaras enfrentadas',
      360,
      15,
      3,
      [
        [1, 2, 1600],
        [3, 4, 2100],
        [5, 6, 2800],
      ],
      ['Primera luna', 'Junta', 'Segunda luna', 'Salida'],
    );
    const corto = await this.maze(
      'azogue-corto',
      'Azogue corto',
      'Un circuito de aprendizaje: dos estaciones y la meta a la vista.',
      '/assets/azogue-corto.svg',
      'Azogue corto — circuito de aprendizaje',
      180,
      8,
      4,
      [
        [1, 2, 900],
        [3, 4, 1200],
        [5, 6, 1600],
      ],
      ['Primera junta', 'Meta visible'],
    );

    const today = madridToday();
    const finished = await this.makeRun({
      user: demo,
      maze: mayor,
      code: 'DDO-FIN1',
      teamSize: 2,
      totalCents: 1400,
      status: 'finished',
      civilDay: today,
      startedAgoMin: 40,
      elapsedSec: 248,
    });
    const mayorChecks = await this.checks.find({
      where: { mazeId: mayor.id },
      order: { sortOrder: 'ASC' },
    });
    const t0 = new Date(Date.now() - 40 * 60_000);
    for (let i = 0; i < mayorChecks.length; i += 1) {
      await this.visits.save({
        runId: finished.id,
        checkpointId: mayorChecks[i].id,
        at: new Date(t0.getTime() + (i + 1) * 80_000),
      } as any);
    }
    await this.ledger.save({ userId: demo.id, runId: finished.id, points: 15 } as any);

    await this.makeRun({
      user: demo,
      maze: luna,
      code: 'DDO-RUN1',
      teamSize: 3,
      totalCents: 2100,
      status: 'running',
      civilDay: today,
      startedAgoMin: 4,
      elapsedSec: null,
    });

    await this.makeRun({
      user: demo,
      maze: corto,
      code: 'DDO-CNF1',
      teamSize: 1,
      totalCents: 900,
      status: 'confirmed',
      civilDay: today,
      startedAgoMin: 0,
      elapsedSec: null,
    });

    for (let i = 1; i <= 10; i += 1) {
      const day = addDaysIso(today, -i);
      await this.makeRun({
        user: neighbor,
        maze: i % 2 ? mayor : luna,
        code: `DDO-H${String(i).padStart(2, '0')}`,
        teamSize: 2,
        totalCents: i % 2 ? 1400 : 1600,
        status: 'finished',
        civilDay: day,
        startedAgoMin: 60 * i,
        elapsedSec: 200 + i * 11,
      });
    }

    void staff;
    this.log.log('Seed complete — demo@dedalo.dev / demo1234');
  }

  private async maze(
    slug: string,
    name: string,
    description: string,
    photoUrl: string,
    caption: string,
    parSec: number,
    durationMin: number,
    maxTeams: number,
    bands: Array<[number, number, number]>,
    stations: string[],
  ): Promise<Maze> {
    const maze = (await this.mazes.save({
      slug,
      name,
      description,
      photoUrl,
      caption,
      parSec,
      durationMin,
      maxTeams,
      open: true,
    } as any)) as Maze;
    for (const [teamMin, teamMax, priceCents] of bands) {
      await this.prices.save({ mazeId: maze.id, teamMin, teamMax, priceCents } as any);
    }
    for (let i = 0; i < stations.length; i += 1) {
      await this.checks.save({ mazeId: maze.id, title: stations[i], sortOrder: i + 1 } as any);
    }
    return maze;
  }

  private async makeRun(opts: {
    user: User;
    maze: Maze;
    code: string;
    teamSize: number;
    totalCents: number;
    status: string;
    civilDay: string;
    startedAgoMin: number;
    elapsedSec: number | null;
  }): Promise<Run> {
    const qrUrl = `${webOrigin()}/carrera/${opts.code}`;
    const rawSvg = await QRCode.toString(qrUrl, { type: 'svg', margin: 1, width: 240 });
    const qrSvg = rawSvg.includes(qrUrl)
      ? rawSvg
      : rawSvg.replace('</svg>', `<desc>${qrUrl}</desc></svg>`);
    const now = new Date();
    const startedAt =
      opts.status === 'confirmed' ? null : new Date(now.getTime() - opts.startedAgoMin * 60_000);
    const finishedAt =
      opts.status === 'finished' && startedAt && opts.elapsedSec != null
        ? new Date(startedAt.getTime() + opts.elapsedSec * 1000)
        : null;
    const run = (await this.runs.save({
      code: opts.code,
      userId: opts.user.id,
      mazeId: opts.maze.id,
      teamSize: opts.teamSize,
      totalCents: opts.totalCents,
      status: opts.status,
      startedAt,
      finishedAt,
      elapsedSec: opts.elapsedSec,
      qrSvg,
      qrUrl,
      civilDay: opts.civilDay,
      createdAt: startedAt || now,
    } as any)) as Run;
    await this.events.save({
      runId: run.id,
      status: 'confirmed',
      at: startedAt || now,
      note: 'Cobro al momento',
    } as any);
    if (opts.status === 'running' || opts.status === 'finished' || opts.status === 'dnf') {
      await this.events.save({
        runId: run.id,
        status: 'running',
        at: startedAt || now,
        note: 'Pistoletazo',
      } as any);
    }
    if (opts.status === 'finished') {
      await this.events.save({
        runId: run.id,
        status: 'finished',
        at: finishedAt || now,
        note: 'Meta',
      } as any);
    }
    return run;
  }
}
