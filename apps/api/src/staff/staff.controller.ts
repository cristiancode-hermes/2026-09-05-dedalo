import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsString } from 'class-validator';
import { Repository } from 'typeorm';
import { Checkpoint, Run } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';
import { RunsService } from '../runs/runs.service';
import { madridToday } from '../util/madrid';

class ScanDto {
  @IsString() codeOrUrl!: string;
}

class StartDto {
  @IsString() code!: string;
}

@ApiTags('staff')
@Controller()
export class StaffController {
  constructor(
    private readonly runs: RunsService,
    @InjectRepository(Checkpoint) private readonly checks: Repository<Checkpoint>,
    @InjectRepository(Run) private readonly runRepo: Repository<Run>,
  ) {}

  @Post('staff/scan')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  async scan(@Body() dto: ScanDto) {
    const code = this.runs.parseCode(dto.codeOrUrl);
    const run = await this.runs.loadFull({ code });
    const checkpoints = await this.checks.find({
      where: { mazeId: run.mazeId },
      order: { sortOrder: 'ASC' },
    });
    if (run.maze) run.maze.checkpoints = checkpoints;
    const suggestedAction = this.runs.suggestedAction(run);
    const nextCheckpoint = checkpoints.find(
      (c) => !(run.visits || []).some((v) => v.checkpointId === c.id),
    );
    return {
      ...this.runs.serialize(run, false),
      suggestedAction,
      nextCheckpoint: nextCheckpoint
        ? { id: nextCheckpoint.id, title: nextCheckpoint.title, sortOrder: nextCheckpoint.sortOrder }
        : null,
    };
  }

  @Post('staff/start')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  start(@Body() dto: StartDto) {
    return this.runs.start(dto.code);
  }

  @Get('leaderboard')
  async leaderboard(@Query('mazeId') mazeId?: string, @Query('day') day?: string) {
    const where: Record<string, unknown> = { status: 'finished' };
    if (mazeId) where.mazeId = mazeId;
    if (day) where.civilDay = day;
    else where.civilDay = madridToday();
    const rows = await this.runRepo.find({
      where,
      relations: { maze: true, events: true, visits: { checkpoint: true } },
      order: { elapsedSec: 'ASC' },
    });
    return rows.map((r) => this.runs.serialize(r, true));
  }
}
