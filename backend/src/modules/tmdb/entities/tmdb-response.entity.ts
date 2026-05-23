import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TmdbImportStatsEntity {
  @ApiProperty({ example: 25 })
  totalProcessed!: number;

  @ApiProperty({ example: 20 })
  totalCreated!: number;

  @ApiProperty({ example: 5 })
  totalUpdated!: number;

  @ApiProperty({ example: 0 })
  totalErrors!: number;
}

export class TmdbFullImportResponseEntity {
  @ApiProperty({ type: TmdbImportStatsEntity })
  movies!: TmdbImportStatsEntity;

  @ApiProperty({ type: TmdbImportStatsEntity })
  tvSeries!: TmdbImportStatsEntity;
}

export class TmdbSyncLogEntity extends TmdbImportStatsEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'FULL_IMPORT' })
  syncType!: string;

  @ApiProperty({ example: 'MOVIE' })
  entityType!: string;

  @ApiProperty({ example: 'SUCCESS' })
  status!: string;

  @ApiProperty({ example: '2026-05-15T00:00:00.000Z' })
  startedAt!: Date;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z', nullable: true })
  completedAt?: Date | null;
}

export class TmdbSyncLogsResponseEntity {
  @ApiProperty({ type: [TmdbSyncLogEntity] })
  data!: TmdbSyncLogEntity[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  })
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
