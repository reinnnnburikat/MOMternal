import { db } from '../src/lib/db';
import { hash } from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await hash('nurse123', 10);

  // Create pre-seeded nurse accounts
  const nurses = [
    {
      email: 'jaldea.k12254703@umak.edu.ph',
      password: hashedPassword,
      name: 'Janica Aldea',
      licenseNo: 'RN-UMAK-001',
    },
    {
      email: 'snebre.k12257601@umak.edu.ph',
      password: hashedPassword,
      name: 'Sophia Bianca Nebre',
      licenseNo: 'RN-UMAK-002',
    },
    {
      email: 'doliveros.k12257017@umak.edu.ph',
      password: hashedPassword,
      name: 'Danchelle Joy Oliveros',
      licenseNo: 'RN-UMAK-003',
    },
    {
      email: 'krazon.k12255767@umak.edu.ph',
      password: hashedPassword,
      name: 'Khimverlee Razon',
      licenseNo: 'RN-UMAK-004',
    },
    {
      email: 'mvaldez.k12256669@umak.edu.ph',
      password: hashedPassword,
      name: 'Mean Joyce Valdez',
      licenseNo: 'RN-UMAK-005',
    },
  ];

  for (const nurse of nurses) {
    await db.nurse.upsert({
      where: { email: nurse.email },
      update: {},
      create: nurse,
    });
    console.log(`  ✓ Created nurse: ${nurse.email}`);
  }

  console.log('\n✅ Database seeding completed! (Nurses only — patients start from 0)');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
