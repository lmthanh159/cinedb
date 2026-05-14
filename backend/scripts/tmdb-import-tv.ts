import type { PrismaClient } from '@prisma/client';

import {
  createSyncLogData,
  extractYear,
  fetchPopularTvPage,
  fetchSeasonDetails,
  fetchTvDetails,
  importTvSeriesIntoDatabase,
  syncGenresFromTmdb,
  upsertSeasonsAndEpisodes,
} from './lib/tmdb';
import { createPrismaClient, loadEnvironment } from './lib/runtime';

const prisma = createPrismaClient();

async function runImport(client: PrismaClient) {
  await syncGenresFromTmdb(client, 'tv');

  const summaries = [];
  for (let page = 1; page <= 2; page += 1) {
    const response = await fetchPopularTvPage(page);
    summaries.push(...response.results);
  }

  const peopleImported = new Set<number>();
  let importedCount = 0;
  let errorCount = 0;

  const syncLog = await client.tmdbSyncLog.create({
    data: createSyncLogData('quick_import', 'tv'),
  });

  for (let index = 0; index < summaries.length; index += 1) {
    const summary = summaries[index];

    console.log(
      `Importing series ${index + 1}/${summaries.length}: ${summary.name} (${extractYear(summary.first_air_date)})`,
    );

    try {
      const viDetails = await fetchTvDetails(summary.id, process.env.TMDB_DEFAULT_LANGUAGE ?? 'vi-VN');
      const details =
        (viDetails.overview ?? '').trim().length > 0
          ? viDetails
          : await fetchTvDetails(summary.id, process.env.TMDB_FALLBACK_LANGUAGE ?? 'en-US');

      const series = await importTvSeriesIntoDatabase(client, details, viDetails, peopleImported);

      const seasonDetails = [];
      for (const season of details.seasons ?? []) {
        seasonDetails.push(
          await fetchSeasonDetails(
            summary.id,
            season.season_number,
            process.env.TMDB_DEFAULT_LANGUAGE ?? 'vi-VN',
          ),
        );
      }

      await upsertSeasonsAndEpisodes(client, series.id, seasonDetails);
      importedCount += 1;
    } catch (error) {
      errorCount += 1;
      console.error(`Failed to import series ${summary.id}:`, error);
    }
  }

  await client.tmdbSyncLog.update({
    where: { id: syncLog.id },
    data: {
      totalProcessed: summaries.length,
      totalCreated: importedCount,
      totalUpdated: 0,
      totalErrors: errorCount,
      completedAt: new Date(),
      status: errorCount > 0 ? 'completed' : 'completed',
    },
  });

  console.log(
    `TV import summary: ${importedCount} imported, ${peopleImported.size} unique people processed, ${errorCount} errors`,
  );
}

async function main() {
  loadEnvironment();
  await runImport(prisma);
}

void main()
  .catch((error) => {
    console.error('TMDB TV import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
