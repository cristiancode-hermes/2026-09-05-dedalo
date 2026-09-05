import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  ALL_ENTITIES,
  Checkpoint,
  LoyaltyLedger,
  Maze,
  MazePrice,
  Run,
  User,
} from './entities/entities';
import { AuthService } from './auth/auth.service';
import { MazesService } from './mazes/mazes.service';
import { RunsService } from './runs/runs.service';
import { madridToday } from './util/madrid';

function codeOf(err: unknown): string {
  const e = err as HttpException;
  const r = e.getResponse?.() as any;
  return r?.code || r?.message || String(err);
}

async function expectCode(p: Promise<unknown>, code: string) {
  try {
    await p;
    throw new Error('expected ' + code);
  } catch (e) {
    if ((e as Error).message === 'expected ' + code) throw e;
    expect(codeOf(e)).toBe(code);
  }
}

describe('Dédalo', () => {
  let ds: DataSource;
  let auth: AuthService;
  let mazes: MazesService;
  let runs: RunsService;
  let alice: User;
  let bob: User;
  let maze: Maze;
  let tight: Maze;
  let cps: Checkpoint[];

  beforeAll(async () => {
    process.env.WEB_ORIGIN = 'https://dedalo.proyectos.cristiancode.dev';
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } }),
      ],
      providers: [AuthService, MazesService, RunsService],
    }).compile();

    ds = moduleRef.get(DataSource);
    auth = moduleRef.get(AuthService);
    mazes = moduleRef.get(MazesService);
    runs = moduleRef.get(RunsService);

    const hash = await bcrypt.hash('demo1234', 10);
    alice = (await ds.getRepository(User).save({
      username: 'alice',
      email: 'alice@dedalo.test',
      passwordHash: hash,
      role: 'client',
    } as any)) as User;
    bob = (await ds.getRepository(User).save({
      username: 'bob',
      email: 'bob@dedalo.test',
      passwordHash: hash,
      role: 'client',
    } as any)) as User;

    maze = (await ds.getRepository(Maze).save({
      slug: 'espejo-mayor',
      name: 'Espejo Mayor',
      description: 'pasillo',
      photoUrl: '/assets/espejo-mayor.svg',
      caption: 'Espejo Mayor',
      parSec: 270,
      durationMin: 12,
      maxTeams: 8,
      open: true,
    } as any)) as Maze;
    await ds.getRepository(MazePrice).save({ mazeId: maze.id, teamMin: 1, teamMax: 2, priceCents: 1400 } as any);
    await ds.getRepository(MazePrice).save({ mazeId: maze.id, teamMin: 3, teamMax: 4, priceCents: 1800 } as any);
    await ds.getRepository(MazePrice).save({ mazeId: maze.id, teamMin: 5, teamMax: 6, priceCents: 2400 } as any);
    const c1 = (await ds.getRepository(Checkpoint).save({
      mazeId: maze.id,
      title: 'Umbral',
      sortOrder: 1,
    } as any)) as Checkpoint;
    const c2 = (await ds.getRepository(Checkpoint).save({
      mazeId: maze.id,
      title: 'Azogue',
      sortOrder: 2,
    } as any)) as Checkpoint;
    cps = [c1, c2];

    tight = (await ds.getRepository(Maze).save({
      slug: 'azogue-corto',
      name: 'Azogue corto',
      description: 'corto',
      photoUrl: '/assets/azogue-corto.svg',
      caption: 'Azogue corto',
      parSec: 90,
      durationMin: 1,
      maxTeams: 1,
      open: true,
    } as any)) as Maze;
    await ds.getRepository(MazePrice).save({ mazeId: tight.id, teamMin: 1, teamMax: 6, priceCents: 900 } as any);
  });

  afterAll(async () => {
    if (runs['timer']) clearInterval(runs['timer']);
    await ds.destroy();
  });

  it('login accepts username or email', async () => {
    const a = await auth.login({ identifier: 'alice', password: 'demo1234' });
    const b = await auth.login({ identifier: 'alice@dedalo.test', password: 'demo1234' });
    expect(a.accessToken).toBeTruthy();
    expect(b.user.email).toBe('alice@dedalo.test');
  });

  it('fromPriceCents is min of maze prices, never a literal', async () => {
    const list = await mazes.list();
    const row = list.find((m: any) => m.slug === 'espejo-mayor');
    expect(row.fromPriceCents).toBe(1400);
    const detail: any = await mazes.bySlug('espejo-mayor');
    expect(detail.fromPriceCents).toBe(1400);
    expect(detail.prices.map((p: any) => p.priceCents).sort((x: number, y: number) => x - y)).toEqual([
      1400, 1800, 2400,
    ]);
  });

  it('checkout is atomic, QR contains resource URL, no 15min hold', async () => {
    const run = await runs.checkout(alice.id, maze.id, 3);
    expect(run.status).toBe('confirmed');
    expect(run.totalCents).toBe(1800);
    expect(run.expiresAt).toBeUndefined();
    expect(String(run.qrUrl)).toContain('/carrera/' + run.code);
    expect(String(run.qrSvg)).toContain(String(run.qrUrl));
    expect(String(run.code)).toMatch(/^DDO-/);
    const events = run.events as any[];
    expect(events[0].status).toBe('confirmed');
  });

  it('409 ALREADY_RUNNING for same user+maze+civil day', async () => {
    await expectCode(runs.checkout(alice.id, maze.id, 2), 'ALREADY_RUNNING');
  });

  it('409 MAZE_FULL when running teams occupy maxTeams', async () => {
    const first = await runs.checkout(bob.id, tight.id, 1);
    await runs.start(String(first.code));
    const carol = (await ds.getRepository(User).save({
      username: 'carol',
      email: 'carol@dedalo.test',
      passwordHash: alice.passwordHash,
      role: 'client',
    } as any)) as User;
    await expectCode(runs.checkout(carol.id, tight.id, 1), 'MAZE_FULL');
  });

  it('checkpoint order is enforced', async () => {
    const dave = (await ds.getRepository(User).save({
      username: 'dave',
      email: 'dave@dedalo.test',
      passwordHash: alice.passwordHash,
      role: 'client',
    } as any)) as User;
    const other = (await ds.getRepository(Maze).save({
      slug: 'doble-luna',
      name: 'Doble luna',
      description: 'x',
      photoUrl: '/assets/doble-luna.svg',
      caption: 'Doble luna',
      parSec: 200,
      durationMin: 10,
      maxTeams: 4,
      open: true,
    } as any)) as Maze;
    await ds.getRepository(MazePrice).save({ mazeId: other.id, teamMin: 1, teamMax: 6, priceCents: 1600 } as any);
    const a = (await ds.getRepository(Checkpoint).save({
      mazeId: other.id,
      title: 'Primera',
      sortOrder: 1,
    } as any)) as Checkpoint;
    const b = (await ds.getRepository(Checkpoint).save({
      mazeId: other.id,
      title: 'Segunda',
      sortOrder: 2,
    } as any)) as Checkpoint;
    const run = await runs.checkout(dave.id, other.id, 1);
    await runs.start(String(run.code));
    await expectCode(runs.stamp(String(run.code), b.id), 'CHECKPOINT_ORDER');
    const stamped = await runs.stamp(String(run.code), a.id);
    expect((stamped.visits as any[]).length).toBe(1);
  });

  it('finish awards derived points 10 + 5 if under par', async () => {
    const eve = (await ds.getRepository(User).save({
      username: 'eve',
      email: 'eve@dedalo.test',
      passwordHash: alice.passwordHash,
      role: 'client',
    } as any)) as User;
    const run = await runs.checkout(eve.id, maze.id, 1);
    await runs.start(String(run.code));
    await runs.stamp(String(run.code), cps[0].id);
    await runs.stamp(String(run.code), cps[1].id);
    const done: any = await runs.finish(String(run.code));
    expect(done.status).toBe('finished');
    expect(done.elapsedSec).toBeGreaterThanOrEqual(0);
    const points = await auth.derivedPoints(eve.id);
    expect(points).toBe(15);
    const ledger = await ds.getRepository(LoyaltyLedger).find({ where: { userId: eve.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].runId).toBe(done.id);
  });

  it('mine list totals match detail', async () => {
    const list = await runs.mine(alice.id);
    const one = list[0];
    const detail = await runs.byCode(String(one.code), false);
    expect(detail.totalCents).toBe(one.totalCents);
    expect(detail.status).toBe(one.status);
    expect(detail.elapsedSec).toBe(one.elapsedSec);
  });

  it('sweeper marks running as dnf after duration+8min', async () => {
    const frank = (await ds.getRepository(User).save({
      username: 'frank',
      email: 'frank@dedalo.test',
      passwordHash: alice.passwordHash,
      role: 'client',
    } as any)) as User;
    const run = await runs.checkout(frank.id, maze.id, 1);
    await runs.start(String(run.code));
    const row = await ds.getRepository(Run).findOne({ where: { code: String(run.code) } });
    row!.startedAt = new Date(Date.now() - 30 * 60_000);
    await ds.getRepository(Run).save(row as any);
    const n = await runs.expireStale();
    expect(n).toBeGreaterThanOrEqual(1);
    const after = await ds.getRepository(Run).findOne({ where: { code: String(run.code) } });
    expect(after!.status).toBe('dnf');
  });

  it('cancel confirmed frees the slot', async () => {
    const gina = (await ds.getRepository(User).save({
      username: 'gina',
      email: 'gina@dedalo.test',
      passwordHash: alice.passwordHash,
      role: 'client',
    } as any)) as User;
    const run = await runs.checkout(gina.id, maze.id, 2);
    const cancelled = await runs.cancel(gina.id, String(run.code));
    expect(cancelled.status).toBe('cancelled');
    const again = await runs.checkout(gina.id, maze.id, 2);
    expect(again.status).toBe('confirmed');
  });

  it('public tracking has timeline without userId', async () => {
    const list = await runs.mine(alice.id);
    const pub = await runs.byCode(String(list[0].code), true);
    expect(pub.userId).toBeUndefined();
    expect(Array.isArray(pub.events)).toBe(true);
    expect((pub.events as any[]).length).toBeGreaterThan(0);
  });

  it('scan parser extracts code from URL', () => {
    expect(runs.parseCode('https://dedalo.proyectos.cristiancode.dev/carrera/DDO-AB12')).toBe(
      'DDO-AB12',
    );
    expect(runs.parseCode('ddo-zz99')).toBe('DDO-ZZ99');
  });

  it('civil day is Europe/Madrid ISO date', () => {
    expect(madridToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('cannot cancel a running race', async () => {
    const hugo = (await ds.getRepository(User).save({
      username: 'hugo',
      email: 'hugo@dedalo.test',
      passwordHash: alice.passwordHash,
      role: 'client',
    } as any)) as User;
    const extraMaze = (await ds.getRepository(Maze).save({
      slug: 'extra-pasillo',
      name: 'Extra',
      description: 'x',
      photoUrl: '/assets/espejo-mayor.svg',
      caption: 'Extra',
      parSec: 100,
      durationMin: 8,
      maxTeams: 3,
      open: true,
    } as any)) as Maze;
    await ds.getRepository(MazePrice).save({ mazeId: extraMaze.id, teamMin: 1, teamMax: 6, priceCents: 1100 } as any);
    const run = await runs.checkout(hugo.id, extraMaze.id, 1);
    await runs.start(String(run.code));
    await expectCode(runs.cancel(hugo.id, String(run.code)), 'CANNOT_CANCEL');
  });

  it('rejects wrong password', async () => {
    await expect(auth.login({ identifier: 'alice', password: 'wrongpass' })).rejects.toThrow();
  });
});
