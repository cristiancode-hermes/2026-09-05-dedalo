import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MazesService } from './mazes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/current-user';

class CreateMazeDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsInt() @Min(1) parSec!: number;
  @IsInt() @Min(1) durationMin!: number;
  @IsInt() @Min(1) maxTeams!: number;
  @IsString() photoUrl!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() caption?: string;
}

class PatchMazeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsInt() parSec?: number;
  @IsOptional() @IsInt() durationMin?: number;
  @IsOptional() @IsInt() maxTeams?: number;
  @IsOptional() @IsBoolean() open?: boolean;
}

class PriceItemDto {
  @IsInt() teamMin!: number;
  @IsInt() teamMax!: number;
  @IsInt() priceCents!: number;
}

class PutPricesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceItemDto)
  items!: PriceItemDto[];
}

class CheckpointDto {
  @IsString() title!: string;
  @IsInt() sortOrder!: number;
}

@ApiTags('mazes')
@Controller()
export class MazesController {
  constructor(private readonly mazes: MazesService) {}

  @Get('mazes')
  list() {
    return this.mazes.list();
  }

  @Get('mazes/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.mazes.bySlug(slug);
  }

  @Post('admin/mazes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() dto: CreateMazeDto) {
    return this.mazes.create(dto);
  }

  @Patch('admin/mazes/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  patch(@Param('id') id: string, @Body() dto: PatchMazeDto) {
    return this.mazes.patch(id, dto as any);
  }

  @Put('admin/mazes/:id/prices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  prices(@Param('id') id: string, @Body() dto: PutPricesDto) {
    return this.mazes.putPrices(id, dto.items);
  }

  @Post('admin/mazes/:id/checkpoints')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  checkpoint(@Param('id') id: string, @Body() dto: CheckpointDto) {
    return this.mazes.addCheckpoint(id, dto);
  }

  @Delete('admin/mazes/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.mazes.remove(id);
  }
}
