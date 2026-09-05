import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Run } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Run]), AuthModule],
  controllers: [StatsController],
})
export class StatsModule {}
