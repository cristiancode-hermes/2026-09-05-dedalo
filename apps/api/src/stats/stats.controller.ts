import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Run } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';
import { addDaysIso, madridToday } from '../util/madrid';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(@InjectRepository(Run) private readonly runs: Repository<Run>) {}

  @Get('daily')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  async daily() {
    const today = madridToday();
    const start = addDaysIso(today, -13);
    const rows = await this.runs
      .createQueryBuilder('r')
      .select('r.civilDay AS date')
      .addSelect('COUNT(*) AS count')
      .where('r.civilDay >= :start', { start })
      .groupBy('r.civilDay')
      .orderBy('r.civilDay', 'ASC')
      .getRawMany();
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(String(row.date), Number(row.count));
    }
    const series: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 14; i += 1) {
      const date = addDaysIso(start, i);
      series.push({ date, count: map.get(date) || 0 });
    }
    return series;
  }
}
