import { UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

import { createPrismaClient, loadEnvironment } from '../scripts/lib/runtime';

const prisma = createPrismaClient();

const genres = [
  { tmdbId: 28, name: 'Action', slug: 'action' },
  { tmdbId: 12, name: 'Adventure', slug: 'adventure' },
  { tmdbId: 16, name: 'Animation', slug: 'animation' },
  { tmdbId: 35, name: 'Comedy', slug: 'comedy' },
  { tmdbId: 80, name: 'Crime', slug: 'crime' },
  { tmdbId: 99, name: 'Documentary', slug: 'documentary' },
  { tmdbId: 18, name: 'Drama', slug: 'drama' },
  { tmdbId: 10751, name: 'Family', slug: 'family' },
  { tmdbId: 14, name: 'Fantasy', slug: 'fantasy' },
  { tmdbId: 36, name: 'History', slug: 'history' },
  { tmdbId: 27, name: 'Horror', slug: 'horror' },
  { tmdbId: 10402, name: 'Music', slug: 'music' },
  { tmdbId: 9648, name: 'Mystery', slug: 'mystery' },
  { tmdbId: 10749, name: 'Romance', slug: 'romance' },
  { tmdbId: 878, name: 'Science Fiction', slug: 'science-fiction' },
  { tmdbId: 10770, name: 'TV Movie', slug: 'tv-movie' },
  { tmdbId: 53, name: 'Thriller', slug: 'thriller' },
  { tmdbId: 10752, name: 'War', slug: 'war' },
  { tmdbId: 37, name: 'Western', slug: 'western' },
];

const countries = [
  { isoCode: 'US', name: 'United States' },
  { isoCode: 'GB', name: 'United Kingdom' },
  { isoCode: 'FR', name: 'France' },
  { isoCode: 'DE', name: 'Germany' },
  { isoCode: 'JP', name: 'Japan' },
  { isoCode: 'KR', name: 'South Korea' },
  { isoCode: 'CN', name: 'China' },
  { isoCode: 'IN', name: 'India' },
  { isoCode: 'AU', name: 'Australia' },
  { isoCode: 'CA', name: 'Canada' },
  { isoCode: 'IT', name: 'Italy' },
  { isoCode: 'ES', name: 'Spain' },
  { isoCode: 'BR', name: 'Brazil' },
  { isoCode: 'MX', name: 'Mexico' },
  { isoCode: 'RU', name: 'Russia' },
  { isoCode: 'SE', name: 'Sweden' },
  { isoCode: 'DK', name: 'Denmark' },
  { isoCode: 'NO', name: 'Norway' },
  { isoCode: 'FI', name: 'Finland' },
  { isoCode: 'NL', name: 'Netherlands' },
  { isoCode: 'BE', name: 'Belgium' },
  { isoCode: 'CH', name: 'Switzerland' },
  { isoCode: 'AT', name: 'Austria' },
  { isoCode: 'PL', name: 'Poland' },
  { isoCode: 'CZ', name: 'Czech Republic' },
  { isoCode: 'HU', name: 'Hungary' },
  { isoCode: 'RO', name: 'Romania' },
  { isoCode: 'UA', name: 'Ukraine' },
  { isoCode: 'TR', name: 'Turkey' },
  { isoCode: 'TH', name: 'Thailand' },
  { isoCode: 'VN', name: 'Vietnam' },
  { isoCode: 'PH', name: 'Philippines' },
  { isoCode: 'ID', name: 'Indonesia' },
  { isoCode: 'MY', name: 'Malaysia' },
  { isoCode: 'SG', name: 'Singapore' },
  { isoCode: 'TW', name: 'Taiwan' },
  { isoCode: 'HK', name: 'Hong Kong' },
  { isoCode: 'NZ', name: 'New Zealand' },
  { isoCode: 'ZA', name: 'South Africa' },
  { isoCode: 'AR', name: 'Argentina' },
  { isoCode: 'CL', name: 'Chile' },
  { isoCode: 'CO', name: 'Colombia' },
  { isoCode: 'EG', name: 'Egypt' },
  { isoCode: 'IL', name: 'Israel' },
  { isoCode: 'AE', name: 'United Arab Emirates' },
  { isoCode: 'SA', name: 'Saudi Arabia' },
  { isoCode: 'IE', name: 'Ireland' },
  { isoCode: 'PT', name: 'Portugal' },
  { isoCode: 'GR', name: 'Greece' },
  { isoCode: 'HR', name: 'Croatia' },
];

const companies = [
  { tmdbId: 174, name: 'Warner Bros. Pictures', originCountry: 'US' },
  { tmdbId: 2, name: 'Walt Disney Pictures', originCountry: 'US' },
  { tmdbId: 33, name: 'Universal Pictures', originCountry: 'US' },
  { tmdbId: 4, name: 'Paramount Pictures', originCountry: 'US' },
  { tmdbId: 5, name: 'Columbia Pictures', originCountry: 'US' },
  { tmdbId: 25, name: '20th Century Studios', originCountry: 'US' },
  { tmdbId: 1632, name: 'Lionsgate', originCountry: 'US' },
  { tmdbId: 41077, name: 'A24', originCountry: 'US' },
  { tmdbId: 21, name: 'Metro-Goldwyn-Mayer', originCountry: 'US' },
  { tmdbId: 420, name: 'Marvel Studios', originCountry: 'US' },
  { tmdbId: 923, name: 'Legendary Entertainment', originCountry: 'US' },
  { tmdbId: 82819, name: 'Netflix', originCountry: 'US' },
  { tmdbId: 7505, name: 'Studio Ghibli', originCountry: 'JP' },
  { tmdbId: 3166, name: 'New Line Cinema', originCountry: 'US' },
  { tmdbId: 9993, name: 'DC Entertainment', originCountry: 'US' },
];

async function main() {
  loadEnvironment();
  console.log('Seeding database...');

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {
        tmdbId: genre.tmdbId,
        name: genre.name,
      },
      create: genre,
    });
  }
  console.log(`Seeded ${genres.length} genres`);

  for (const country of countries) {
    await prisma.country.upsert({
      where: { isoCode: country.isoCode },
      update: { name: country.name },
      create: country,
    });
  }
  console.log(`Seeded ${countries.length} countries`);

  for (const company of companies) {
    await prisma.productionCompany.upsert({
      where: { tmdbId: company.tmdbId },
      update: {
        name: company.name,
        originCountry: company.originCountry,
      },
      create: company,
    });
  }
  console.log(`Seeded ${companies.length} companies`);

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@cinedb.com' },
    update: {},
    create: {
      email: 'admin@cinedb.com',
      passwordHash: adminPassword,
      displayName: 'CineDB Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('Seeded admin user');

  const testPassword = await bcrypt.hash('User@123', 10);
  const testUsers = [
    { email: 'user1@test.com', displayName: 'Nguyen Van A' },
    { email: 'user2@test.com', displayName: 'Tran Thi B' },
    { email: 'user3@test.com', displayName: 'Le Van C' },
    { email: 'user4@test.com', displayName: 'Pham Thi D' },
    { email: 'user5@test.com', displayName: 'Hoang Van E' },
  ];

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
      },
      create: {
        email: user.email,
        displayName: user.displayName,
        passwordHash: testPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
  }
  console.log(`Seeded ${testUsers.length} test users`);

  console.log('Seeding complete');
}

void main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

