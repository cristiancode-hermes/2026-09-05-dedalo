import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Checkpoint, Maze, MazePrice, Run } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { MazesService } from './mazes.service';
import { MazesController } from './mazes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Maze, MazePrice, Checkpoint, Run]), AuthModule],
  controllers: [MazesController],
  providers: [MazesService],
  exports: [MazesService],
})
export class MazesModule {}
