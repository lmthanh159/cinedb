import { Module } from '@nestjs/common';

import { AdminDashboardController } from '@/modules/admin-dashboard/admin-dashboard.controller';
import { AdminDashboardService } from '@/modules/admin-dashboard/admin-dashboard.service';

@Module({
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
