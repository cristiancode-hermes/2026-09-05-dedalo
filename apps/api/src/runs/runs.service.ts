import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import {
  Checkpoint,
  CheckpointVisit,
  LoyaltyLedger,
  Maze,
  MazePrice,
  Run,
  RunEvent,
} from '../entities/entities';
import { LIVE_RUN_STATUSES, madridToday, runCode, webOrigin } from '../util/madrid';

function conflict(code: string, message: string): never {
  throw new HttpException({ code, message }, HttpStatus.CONFLICT);
}

let lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

@Injectable()
export class RunsService implements OnModuleInit {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Run) private readonly runs: Repository<Run>,
    @InjectRepository(Maze) private readonly mazes: Repository<Maze>,
    @InjectRepository(MazePrice) private readonly prices: Repository<MazePrice>,
    @InjectRepository(Checkpoint) private readonly checks: Repository<Checkpoint>,
    @InjectRepository(RunEvent) private readonly events: Repository<RunEvent>,
    @InjectRepository(CheckpointVisit) private readonly visits: Repository<CheckpointVisit>,
    @InjectRepository(LoyaltyLedger) private readonly ledger: Repository<LoyaltyLedger>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.expireStale().catch(() => undefined);
    }, 30_000);
  }

  async expireStale(): Promise<number> {
    const running = await this.runs.find({ where: { status: 'running' }, relations: { maze: true } });
    const now = Date.now();
    let n = 0;
    for (const run of running) {
      const maze = run.maze || (await this.mazes.findOne({ where: { id: run.mazeId } }));
      if (!maze || !run.startedAt) continue;
      const limitMs = (maze.durationMin + 8) * 60_000;
      if (now - new Date(run.startedAt).getTime() > limitMs) {
        await this.markDnf(run, 'Tiempo de pasillo agotado');
        n += 1;
      }
    }
    return n;
  }

  private async markDnf(run: Run, note: string) {
    const now = new Date();
    const elapsed = run.startedAt
      ? Math.max(0, Math.round((now.getTime() - new Date(run.startedAt).getTime()) / 1000))
      : null;
    run.status = 'dnf';
    run.finishedAt = now;
    run.elapsedSec = elapsed;
    await this.runs.save(run as any);
    await this.events.save({ runId: run.id, status: 'dnf', at: now, note } as any);
  }

  serialize(run: Run, publicView = false) {
    const events = (run.events || []).slice().sort((a, b) => +new Date(a.at) - +new Date(b.at));
    const visits = run.visits || [];
    const maze = run.maze;
    const body: Record<string, unknown> = {
      id: run.id,
      code: run.code,
      mazeId: run.mazeId,
      mazeName: maze?.name,
      mazeSlug: maze?.slug,
      parSec: maze?.parSec,
      durationMin: maze?.durationMin,
      teamSize: run.teamSize,
      totalCents: run.totalCents,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      elapsedSec: run.elapsedSec,
      qrSvg: run.qrSvg,
      qrUrl: run.qrUrl,
      civilDay: run.civilDay,
      createdAt: run.createdAt,
      events: events.map((e) => ({ id: e.id, status: e.status, at: e.at, note: e.note })),
      visits: visits.map((v) => ({
        checkpointId: v.checkpointId,
        title: v.checkpoint?.title,
        sortOrder: v.checkpoint?.sortOrder,
        at: v.at,
      })),
    };
    if (!publicView) body.userId = run.userId;
    return body;
  }

  async loadFull(where: { id?: string; code?: string }) {
    const run = await this.runs.findOne({
      where,
      relations: { maze: true, events: true, visits: { checkpoint: true } },
    });
    if (!run) throw new NotFoundException('Carrera no encontrada');
    return run;
  }

  checkout(userId: string, mazeId: string, teamSize: number) {
    return withLock(() => this.checkoutLocked(userId, mazeId, teamSize));
  }

  private async checkoutLocked(userId: string, mazeId: string, teamSize: number) {
    const supportsLock = this.dataSource.options.type !== 'better-sqlite3';
    return this.dataSource.transaction(async (manager) => {
      const mazeRepo = manager.getRepository(Maze);
      const qb = mazeRepo.createQueryBuilder('m').where('m.id = :id', { id: mazeId });
      const maze = supportsLock ? await qb.setLock('pessimistic_write').getOne() : await qb.getOne();
      if (!maze) throw new NotFoundException('Circuito no encontrado');
      if (!maze.open) conflict('MAZE_CLOSED', 'Este pasillo está cerrado hoy.');

      const day = madridToday();
      const live = await manager.getRepository(Run).find({
        where: { userId, mazeId, civilDay: day, status: In([...LIVE_RUN_STATUSES]) },
      });
      if (live.length) {
        conflict('ALREADY_RUNNING', 'Ya tienes una carrera viva en este circuito hoy.');
      }

      const running = await manager.getRepository(Run).count({
        where: { mazeId, status: 'running' },
      });
      if (running >= maze.maxTeams) {
        conflict('MAZE_FULL', 'El pasillo está lleno. Espera a que salga un equipo.');
      }

      const prices = await manager.getRepository(MazePrice).find({ where: { mazeId } });
      const band = prices.find((p) => teamSize >= p.teamMin && teamSize <= p.teamMax);
      if (!band) conflict('BAD_TEAM', 'Ese tamaño de grupo no cabe en este circuito.');

      const code = runCode();
      const qrUrl = `${webOrigin()}/carrera/${code}`;
      const rawSvg = await QRCode.toString(qrUrl, { type: 'svg', margin: 1, width: 240 });
      const qrSvg = rawSvg.includes(qrUrl)
        ? rawSvg
        : rawSvg.replace('</svg>', `<desc>${qrUrl}</desc></svg>`);
      const now = new Date();

      const run = (await manager.getRepository(Run).save({
        code,
        userId,
        mazeId,
        teamSize,
        totalCents: band.priceCents,
        status: 'confirmed',
        startedAt: null,
        finishedAt: null,
        elapsedSec: null,
        qrSvg,
        qrUrl,
        civilDay: day,
        createdAt: now,
      } as any)) as Run;

      await manager.getRepository(RunEvent).save({
        runId: run.id,
        status: 'confirmed',
        at: now,
        note: 'Cobro al momento',
      } as any);

      const full = await manager.getRepository(Run).findOne({
        where: { id: run.id },
        relations: { maze: true, events: true, visits: { checkpoint: true } },
      });
      return this.serialize(full!);
    });
  }

  async mine(userId: string) {
    const rows = await this.runs.find({
      where: { userId },
      relations: { maze: true, events: true, visits: { checkpoint: true } },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async byCode(code: string, publicView = true) {
    const run = await this.loadFull({ code });
    return this.serialize(run, publicView);
  }

  async cancel(userId: string, code: string) {
    const run = await this.loadFull({ code });
    if (run.userId !== userId) throw new ForbiddenException('No es tu dorsal');
    if (run.status !== 'confirmed') {
      conflict('CANNOT_CANCEL', 'Solo se puede cancelar una carrera confirmada, no en curso.');
    }
    const now = new Date();
    run.status = 'cancelled';
    await this.runs.save(run as any);
    await this.events.save({ runId: run.id, status: 'cancelled', at: now, note: 'Cancelada por el equipo' } as any);
    return this.serialize(await this.loadFull({ id: run.id }));
  }

  async start(code: string) {
    return withLock(async () => {
      const run = await this.loadFull({ code });
      if (run.status !== 'confirmed') {
        conflict('BAD_STATUS', 'Esta carrera no está lista para el pistoletazo.');
      }
      const maze = run.maze!;
      const running = await this.runs.count({ where: { mazeId: run.mazeId, status: 'running' } });
      if (running >= maze.maxTeams) {
        conflict('MAZE_FULL', 'El pasillo está lleno. Espera a que salga un equipo.');
      }
      const now = new Date();
      run.status = 'running';
      run.startedAt = now;
      await this.runs.save(run as any);
      await this.events.save({ runId: run.id, status: 'running', at: now, note: 'Pistoletazo' } as any);
      return this.serialize(await this.loadFull({ id: run.id }));
    });
  }

  async stamp(code: string, checkpointId: string) {
    const run = await this.loadFull({ code });
    if (run.status !== 'running') {
      conflict('BAD_STATUS', 'Solo se sellan estaciones de una carrera en curso.');
    }
    const checks = await this.checks.find({
      where: { mazeId: run.mazeId },
      order: { sortOrder: 'ASC' },
    });
    const idx = checks.findIndex((c) => c.id === checkpointId);
    if (idx < 0) throw new NotFoundException('Estación no encontrada');
    const visited = new Set((run.visits || []).map((v) => v.checkpointId));
    if (visited.has(checkpointId)) {
      conflict('CHECKPOINT_ORDER', 'Esa estación ya está sellada.');
    }
    for (let i = 0; i < idx; i += 1) {
      if (!visited.has(checks[i].id)) {
        conflict('CHECKPOINT_ORDER', `Primero hay que sellar ${checks[i].title}.`);
      }
    }
    const now = new Date();
    await this.visits.save({ runId: run.id, checkpointId, at: now } as any);
    await this.events.save({
      runId: run.id,
      status: 'running',
      at: now,
      note: `Estación: ${checks[idx].title}`,
    } as any);
    return this.serialize(await this.loadFull({ id: run.id }));
  }

  async finish(code: string) {
    const run = await this.loadFull({ code });
    if (run.status !== 'running') {
      conflict('BAD_STATUS', 'Esta carrera no está en el pasillo.');
    }
    const now = new Date();
    const elapsed = run.startedAt
      ? Math.max(0, Math.round((now.getTime() - new Date(run.startedAt).getTime()) / 1000))
      : 0;
    run.status = 'finished';
    run.finishedAt = now;
    run.elapsedSec = elapsed;
    await this.runs.save(run as any);
    await this.events.save({ runId: run.id, status: 'finished', at: now, note: 'Meta' } as any);

    const par = run.maze?.parSec ?? 0;
    const points = 10 + (elapsed <= par ? 5 : 0);
    const existing = await this.ledger.findOne({ where: { runId: run.id } });
    if (!existing) {
      await this.ledger.save({ userId: run.userId, runId: run.id, points } as any);
    }
    const serialized = this.serialize(await this.loadFull({ id: run.id }));
    return { ...serialized, points };
  }

  suggestedAction(run: Run): 'start' | 'checkpoint' | 'finish' {
    if (run.status === 'confirmed') return 'start';
    if (run.status === 'running') {
      const checks = (run.maze?.checkpoints || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
      const visited = new Set((run.visits || []).map((v) => v.checkpointId));
      if (checks.some((c) => !visited.has(c.id))) return 'checkpoint';
      return 'finish';
    }
    return 'finish';
  }

  parseCode(codeOrUrl: string): string {
    const raw = (codeOrUrl || '').trim();
    const m = raw.match(/DDO-[A-Z0-9]+/i);
    if (m) return m[0].toUpperCase();
    const parts = raw.split('/').filter(Boolean);
    return (parts[parts.length - 1] || raw).toUpperCase();
  }
}
