import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyController } from './loyalty.controller';

@Module({
  imports: [AuthModule],
  controllers: [LoyaltyController],
})
export class LoyaltyModule {}
