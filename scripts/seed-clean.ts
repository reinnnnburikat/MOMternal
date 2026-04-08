import pg from 'pg';

const { Pool } = pg;

// Use direct config to avoid URL parsing issues
const pool = new Pool({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.qvdxbhjpophjiycjxmxn',
  password: 'qf#j&&3yptpJyk?',
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 15000,
});

async function cleanupAndSeed() {
  const client = await pool.connect();
  try {
    console.log('=== MOMternal Database Cleanup & Seed ===\n');

    // Check existing data
    const { rows: existingPatients } = await client.query('SELECT COUNT(*)::int as count FROM patient');
    const { rows: existingConsults } = await client.query('SELECT COUNT(*)::int as count FROM consultation');
    const { rows: existingNurses } = await client.query('SELECT COUNT(*)::int as count FROM nurse');
    const { rows: existingAudits } = await client.query('SELECT COUNT(*)::int as count FROM audit_log');
    
    console.log('Current state:');
    console.log(`  Nurses: ${existingNurses[0].count}`);
    console.log(`  Patients: ${existingPatients[0].count}`);
    console.log(`  Consultations: ${existingConsults[0].count}`);
    console.log(`  Audit Logs: ${existingAudits[0].count}`);
    console.log('');

    // 1. Clean up all consultations
    const consultResult = await client.query('DELETE FROM consultation');
    console.log(`Deleted ${consultResult.rowCount} consultations`);

    // 2. Clean up all patients
    const patientResult = await client.query('DELETE FROM patient');
    console.log(`Deleted ${patientResult.rowCount} patients`);

    // 3. Clean up existing audit logs
    const auditResult = await client.query('DELETE FROM audit_log');
    console.log(`Deleted ${auditResult.rowCount} audit logs`);

    // 4. Clean up existing nurses
    const nurseResult = await client.query('DELETE FROM nurse');
    console.log(`Deleted ${nurseResult.rowCount} nurses`);

    // 5. Seed nurse accounts only
    const bcrypt = await import('bcryptjs');
    
    const nurses = [
      {
        email: 'jaldea.k12254703@umak.edu.ph',
        name: 'Janica Aldea',
        licenseNo: 'RN-UMAK-001',
        password: 'nurse123',
      },
      {
        email: 'snebre.k12257601@umak.edu.ph',
        name: 'Sophia Bianca Nebre',
        licenseNo: 'RN-UMAK-002',
        password: 'nurse123',
      },
      {
        email: 'doliveros.k12257017@umak.edu.ph',
        name: 'Danchelle Joy Oliveros',
        licenseNo: 'RN-UMAK-003',
        password: 'nurse123',
      },
      {
        email: 'krazon.k12255767@umak.edu.ph',
        name: 'Khimverlee Razon',
        licenseNo: 'RN-UMAK-004',
        password: 'nurse123',
      },
      {
        email: 'mvaldez.k12256669@umak.edu.ph',
        name: 'Mean Joyce Valdez',
        licenseNo: 'RN-UMAK-005',
        password: 'nurse123',
      },
    ];

    for (const nurse of nurses) {
      const hashedPassword = await bcrypt.hash(nurse.password, 10);
      await client.query(
        'INSERT INTO nurse (id, email, password, name, license_no, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())',
        [nurse.email, hashedPassword, nurse.name, nurse.licenseNo]
      );
      console.log(`Seeded nurse: ${nurse.name} (${nurse.email})`);
    }

    // 6. Verify
    const { rows: nurseRows } = await client.query('SELECT id, email, name, license_no FROM nurse');
    const { rows: patientRows } = await client.query('SELECT COUNT(*)::int as count FROM patient');
    const { rows: consultRows } = await client.query('SELECT COUNT(*)::int as count FROM consultation');

    console.log(`\n=== Final State ===`);
    console.log(`Nurses: ${nurseRows.length}`);
    console.log(`Patients: ${patientRows[0].count}`);
    console.log(`Consultations: ${consultRows[0].count}`);
    console.log('\n✅ Cleanup and seed complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupAndSeed();
