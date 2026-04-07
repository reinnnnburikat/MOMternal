import { db } from '../src/lib/db';
import { hash } from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await hash('nurse123', 10);

  // Create pre-seeded nurse accounts
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

  // Create sample patients
  const samplePatients = [
    {
      patientId: 'MOM-2025-001',
      name: 'Patient Alpha',
      dateOfBirth: new Date('1995-03-15'),
      address: '123 Guadalupe Nuevo, Makati City',
      contactNumber: '0917-123-4567',
      emergencyContact: '0917-987-6543',
      emergencyRelation: 'Husband',
      gravidity: 2,
      parity: 1,
      lmp: new Date('2024-12-01'),
      bloodType: 'O+',
      allergies: 'None',
      medicalHistory: 'Previous CS delivery',
      barangay: 'Guadalupe Nuevo',
      riskLevel: 'moderate',
    },
    {
      patientId: 'MOM-2025-002',
      name: 'Patient Beta',
      dateOfBirth: new Date('1998-07-22'),
      address: '456 Poblacion, Makati City',
      contactNumber: '0918-234-5678',
      emergencyContact: '0918-876-5432',
      emergencyRelation: 'Mother',
      gravidity: 1,
      parity: 0,
      lmp: new Date('2025-01-15'),
      bloodType: 'A+',
      allergies: 'Penicillin',
      medicalHistory: 'None',
      barangay: 'Poblacion',
      riskLevel: 'low',
    },
    {
      patientId: 'MOM-2025-003',
      name: 'Patient Gamma',
      dateOfBirth: new Date('1992-11-08'),
      address: '789 San Isidro, Makati City',
      contactNumber: '0919-345-6789',
      emergencyContact: '0919-765-4321',
      emergencyRelation: 'Sister',
      gravidity: 4,
      parity: 3,
      lmp: new Date('2024-11-10'),
      bloodType: 'B+',
      allergies: 'None',
      medicalHistory: 'Gestational diabetes (previous pregnancy)',
      barangay: 'San Isidro',
      riskLevel: 'high',
    },
    {
      patientId: 'MOM-2025-004',
      name: 'Patient Delta',
      dateOfBirth: new Date('2000-01-30'),
      address: '321 Valenzuela, Makati City',
      contactNumber: '0920-456-7890',
      emergencyContact: '0920-654-3210',
      emergencyRelation: 'Husband',
      gravidity: 1,
      parity: 0,
      lmp: new Date('2025-02-01'),
      bloodType: 'AB+',
      allergies: 'Sulfa drugs',
      medicalHistory: 'Asthma',
      barangay: 'Valenzuela',
      riskLevel: 'low',
    },
    {
      patientId: 'MOM-2025-005',
      name: 'Patient Epsilon',
      dateOfBirth: new Date('1988-06-12'),
      address: '654 Tejeros, Makati City',
      contactNumber: '0921-567-8901',
      emergencyContact: '0921-543-2109',
      emergencyRelation: 'Mother',
      gravidity: 3,
      parity: 2,
      lmp: new Date('2024-10-20'),
      bloodType: 'O-',
      allergies: 'Latex',
      medicalHistory: 'Hypertension, Pre-eclampsia (previous)',
      barangay: 'Tejeros',
      riskLevel: 'high',
    },
  ];

  for (const patient of samplePatients) {
    await db.patient.upsert({
      where: { patientId: patient.patientId },
      update: {},
      create: patient,
    });
    console.log(`  ✓ Created patient: ${patient.patientId} - ${patient.name}`);
  }

  // Create sample consultations
  const nurseSantos = await db.nurse.findUnique({ where: { email: 'nurse.santos@momternal.ph' } });
  const nurseReyes = await db.nurse.findUnique({ where: { email: 'nurse.reyes@momternal.ph' } });

  if (nurseSantos && nurseReyes) {
    const sampleConsultations = [
      {
        consultationNo: 'CONSULT-001',
        patientId: 'MOM-2025-001',
        nurseId: nurseSantos.id,
        subjectiveSymptoms: 'Mild headache, occasional dizziness, swelling of both feet',
        objectiveVitals: JSON.stringify({ bloodPressure: '130/90 mmHg', heartRate: '88 bpm', temperature: '36.8°C', weight: '72 kg', respiratoryRate: '20 cpm' }),
        fetalHeartRate: '145 bpm',
        fundalHeight: '28 cm',
        physicalExam: 'Minimal pedal edema, fundus at umbilicus level',
        labResults: 'Urine protein: trace, Hemoglobin: 11 g/dL',
        icd10Diagnosis: 'O10.0 - Pre-existing essential hypertension complicating pregnancy',
        nandaDiagnosis: 'Risk for ineffective cerebral tissue perfusion related to elevated blood pressure',
        riskLevel: 'moderate',
        stepCompleted: 7,
        status: 'completed',
        selectedInterventions: JSON.stringify([
          'Monitoring fetal heart rate and maternal vitals every 4 hours',
          'Assist with prescribed bed rest and positioning',
          'Educate on warning signs of pre-eclampsia',
          'Coordinate with physician for medication review'
        ]),
        evaluationStatus: 'partially',
        evaluationNotes: 'Blood pressure slightly improved with rest. Continue monitoring.',
        referralStatus: 'none',
      },
      {
        consultationNo: 'CONSULT-002',
        patientId: 'MOM-2025-003',
        nurseId: nurseReyes.id,
        subjectiveSymptoms: 'Severe headache, visual disturbances, epigastric pain',
        objectiveVitals: JSON.stringify({ bloodPressure: '160/100 mmHg', heartRate: '96 bpm', temperature: '37.2°C', weight: '80 kg', respiratoryRate: '22 cpm' }),
        fetalHeartRate: '158 bpm',
        fundalHeight: '32 cm',
        physicalExam: 'Marked pedal edema, hyperreflexia',
        labResults: 'Urine protein: 2+, Hemoglobin: 10 g/dL, Platelets: 150,000',
        icd10Diagnosis: 'O14.1 - Severe pre-eclampsia',
        nandaDiagnosis: 'Risk for fetal injury related to maternal hypertensive crisis',
        riskLevel: 'high',
        stepCompleted: 7,
        status: 'completed',
        selectedInterventions: JSON.stringify([
          'Immediate physician notification and emergency referral',
          'Continuous vital sign monitoring',
          'Prepare for possible emergency delivery',
          'Administer MgSO4 as prescribed',
          'Initiate fetal monitoring'
        ]),
        evaluationStatus: 'achieved',
        evaluationNotes: 'Patient referred to tertiary hospital. Stabilized before transfer.',
        referralStatus: 'completed',
        referralSummary: 'URGENT REFERRAL - Patient presents with severe pre-eclampsia. BP 160/100 mmHg with visual disturbances and epigastric pain. Immediate tertiary care needed. Gravida 4, Para 3 at approximately 32 weeks AOG.',
      },
      {
        consultationNo: 'CONSULT-003',
        patientId: 'MOM-2025-005',
        nurseId: nurseSantos.id,
        subjectiveSymptoms: 'Bilateral pedal edema, fatigue, weight gain',
        objectiveVitals: JSON.stringify({ bloodPressure: '150/95 mmHg', heartRate: '82 bpm', temperature: '36.6°C', weight: '85 kg', respiratoryRate: '18 cpm' }),
        fetalHeartRate: '138 bpm',
        fundalHeight: '34 cm',
        physicalExam: 'Moderate pedal edema bilaterally',
        labResults: 'Urine protein: 1+, Hemoglobin: 10.5 g/dL',
        icd10Diagnosis: 'O13 - Gestational hypertension',
        nandaDiagnosis: 'Risk for maternal injury related to hypertensive complications',
        riskLevel: 'high',
        stepCompleted: 5,
        status: 'in_progress',
      },
    ];

    for (const consultation of sampleConsultations) {
      const patient = await db.patient.findUnique({ where: { patientId: consultation.patientId } });
      if (patient) {
        await db.consultation.upsert({
          where: { consultationNo: consultation.consultationNo },
          update: {},
          create: {
            ...consultation,
            nurseId: consultation.nurseId,
            patientId: patient.id,
          },
        });
        console.log(`  ✓ Created consultation: ${consultation.consultationNo}`);
      }
    }
  }

  console.log('\n✅ Database seeding completed!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
