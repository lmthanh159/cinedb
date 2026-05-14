import type { PrismaClient } from '@prisma/client';

import {
  createSyncLogData,
  extractYear,
  fetchMovieDetails,
  fetchPopularMoviesPage,
  importMovieIntoDatabase,
  syncGenresFromTmdb,
} from './lib/tmdb';
import { createPrismaClient, loadEnvironment } from './lib/runtime';

const prisma = createPrismaClient();

async function runImport(client: PrismaClient) {
  await syncGenresFromTmdb(client, 'movie');

  const summaries = [];
  for (let page = 1; page <= 5; page += 1) {
    const response = await fetchPopularMoviesPage(page);
    summaries.push(...response.results);
  }

  const peopleImported = new Set<number>();
  let importedCount = 0;
  let errorCount = 0;

  const syncLog = await client.tmdbSyncLog.create({
    data: createSyncLogData('quick_import', 'movie'),
  });

  for (let index = 0; index < summaries.length; index += 1) {
    const summary = summaries[index];

    console.log(
      `Importing movie ${index + 1}/${summaries.length}: ${summary.title} (${extractYear(summary.release_date)})`,
    );

    try {
      const viDetails = await fetchMovieDetails(summary.id, process.env.TMDB_DEFAULT_LANGUAGE ?? 'vi-VN');
      const details =
        (viDetails.overview ?? '').trim().length > 0
          ? viDetails
          : await fetchMovieDetails(summary.id, process.env.TMDB_FALLBACK_LANGUAGE ?? 'en-US');

      await importMovieIntoDatabase(client, details, viDetails, peopleImported);
      importedCount += 1;
    } catch (error) {
      errorCount += 1;
      console.error(`Failed to import movie ${summary.id}:`, error);
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
    `Movie import summary: ${importedCount} imported, ${peopleImported.size} unique people processed, ${errorCount} errors`,
  );
}

async function main() {
  loadEnvironment();
  await runImport(prisma);
}

void main()
  .catch((error) => {
    console.error('TMDB movie import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

