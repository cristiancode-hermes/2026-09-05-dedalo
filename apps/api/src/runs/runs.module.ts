import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Checkpoint,
  CheckpointVisit,
  LoyaltyLedger,
  Maze,
  MazePrice,
  Run,
  RunEvent,
} from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { RunsService } from './runs.service';
import { RunsController } from './runs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Run,
      RunEvent,
      CheckpointVisit,
      Maze,
      MazePrice,
      Checkpoint,
      LoyaltyLedger,
    ]),
    AuthModule,
  ],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
