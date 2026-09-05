import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Checkpoint, Run } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { RunsModule } from '../runs/runs.module';
import { StaffController } from './staff.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Checkpoint, Run]), AuthModule, RunsModule],
  controllers: [StaffController],
})
export class StaffModule {}
