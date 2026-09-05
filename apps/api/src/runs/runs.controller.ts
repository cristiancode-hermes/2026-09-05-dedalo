import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import { RunsService } from './runs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard, CurrentUser } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';

class CheckoutDto {
  @IsString() mazeId!: string;
  @IsInt() @Min(1) teamSize!: number;
}

class CheckpointDto {
  @IsString() checkpointId!: string;
}

@ApiTags('runs')
@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.runs.checkout(user.userId, dto.mazeId, dto.teamSize);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.runs.mine(user.userId);
  }

  @Get('by-code/:code')
  byCode(@Param('code') code: string) {
    return this.runs.byCode(code, true);
  }

  @Post(':code/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.runs.cancel(user.userId, code);
  }

  @Post(':code/checkpoints')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  stamp(@Param('code') code: string, @Body() dto: CheckpointDto) {
    return this.runs.stamp(code, dto.checkpointId);
  }

  @Post(':code/finish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  finish(@Param('code') code: string) {
    return this.runs.finish(code);
  }
}
