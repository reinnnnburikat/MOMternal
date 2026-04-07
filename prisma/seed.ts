import { db } from '../src/lib/db';
import { hash } from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await hash('nurse123', 10);

  // Create pre-seeded nurse accounts only
  const nurses = [
    {
      email: 'nurse.santos@momternal.ph',
      password: hashedPassword,
      name: 'Maria Santos, RN',
      licenseNo: 'RN-2024-001',
    },
    {
      email: 'nurse.reyes@momternal.ph',
      password: hashedPassword,
      name: 'Ana Reyes, RN',
      licenseNo: 'RN-2024-002',
    },
    {
      email: 'nurse.cruz@momternal.ph',
      password: hashedPassword,
      name: 'Juan Cruz, RN',
      licenseNo: 'RN-2024-003',
    },
    {
      email: 'admin@momternal.ph',
      password: hashedPassword,
      name: 'Admin User',
      licenseNo: 'ADMIN-001',
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
