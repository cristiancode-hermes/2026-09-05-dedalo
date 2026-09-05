import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Checkpoint, Maze, MazePrice, Run } from '../entities/entities';

@Injectable()
export class MazesService {
  constructor(
    @InjectRepository(Maze) private readonly mazes: Repository<Maze>,
    @InjectRepository(MazePrice) private readonly prices: Repository<MazePrice>,
    @InjectRepository(Checkpoint) private readonly checks: Repository<Checkpoint>,
    @InjectRepository(Run) private readonly runs: Repository<Run>,
  ) {}

  async list() {
    const mazes = await this.mazes.find({ order: { name: 'ASC' } });
    return Promise.all(mazes.map((m) => this.decorate(m, false)));
  }

  async bySlug(slug: string) {
    const maze = await this.mazes.findOne({ where: { slug } });
    if (!maze) throw new NotFoundException('Circuito no encontrado');
    return this.decorate(maze, true);
  }

  async byId(id: string) {
    const maze = await this.mazes.findOne({ where: { id } });
    if (!maze) throw new NotFoundException('Circuito no encontrado');
    return maze;
  }

  priceForTeam(prices: MazePrice[], teamSize: number): MazePrice | undefined {
    return prices.find((p) => teamSize >= p.teamMin && teamSize <= p.teamMax);
  }

  async decorate(maze: Maze, detailed: boolean) {
    const prices = await this.prices.find({ where: { mazeId: maze.id }, order: { teamMin: 'ASC' } });
    const fromPriceCents = prices.length ? Math.min(...prices.map((p) => p.priceCents)) : 0;
    const running = await this.runs.count({ where: { mazeId: maze.id, status: 'running' } });
    const freeTeamsNow = Math.max(0, maze.maxTeams - running);
    const base = {
      id: maze.id,
      slug: maze.slug,
      name: maze.name,
      description: maze.description,
      photoUrl: maze.photoUrl,
      caption: maze.caption,
      parSec: maze.parSec,
      durationMin: maze.durationMin,
      maxTeams: maze.maxTeams,
      open: maze.open,
      fromPriceCents,
      freeTeamsNow,
    };
    if (!detailed) return base;
    const checkpoints = await this.checks.find({
      where: { mazeId: maze.id },
      order: { sortOrder: 'ASC' },
    });
    return {
      ...base,
      prices: prices.map((p) => ({
        id: p.id,
        teamMin: p.teamMin,
        teamMax: p.teamMax,
        priceCents: p.priceCents,
      })),
      checkpoints: checkpoints.map((c) => ({
        id: c.id,
        title: c.title,
        sortOrder: c.sortOrder,
      })),
    };
  }

  async create(dto: {
    name: string;
    slug: string;
    parSec: number;
    durationMin: number;
    maxTeams: number;
    photoUrl: string;
    description?: string;
    caption?: string;
  }) {
    return (await this.mazes.save({
      name: dto.name,
      slug: dto.slug,
      parSec: dto.parSec,
      durationMin: dto.durationMin,
      maxTeams: dto.maxTeams,
      photoUrl: dto.photoUrl,
      description: dto.description || '',
      caption: dto.caption || dto.name,
      open: true,
    } as any)) as Maze;
  }

  async patch(id: string, dto: Partial<Maze>) {
    const maze = await this.byId(id);
    Object.assign(maze, dto);
    return (await this.mazes.save(maze as any)) as Maze;
  }

  async putPrices(id: string, items: Array<{ teamMin: number; teamMax: number; priceCents: number }>) {
    await this.byId(id);
    const existing = await this.prices.find({ where: { mazeId: id } });
    if (existing.length) await this.prices.remove(existing);
    const saved: MazePrice[] = [];
    for (const item of items) {
      const row = (await this.prices.save({
        mazeId: id,
        teamMin: item.teamMin,
        teamMax: item.teamMax,
        priceCents: item.priceCents,
      } as any)) as MazePrice;
      saved.push(row);
    }
    return saved;
  }

  async addCheckpoint(id: string, dto: { title: string; sortOrder: number }) {
    await this.byId(id);
    return (await this.checks.save({
      mazeId: id,
      title: dto.title,
      sortOrder: dto.sortOrder,
    } as any)) as Checkpoint;
  }

  async remove(id: string) {
    const maze = await this.byId(id);
    const live = await this.runs.count({
      where: { mazeId: id, status: In(['confirmed', 'running']) },
    });
    if (live) throw new NotFoundException('Hay carreras vivas en este circuito');
    await this.mazes.remove(maze);
  }
}
