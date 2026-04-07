-- Migration 001: Initial schema for Momternal maternal health app
-- Tables: nurse, patient, consultation, audit_log

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Nurse table
CREATE TABLE IF NOT EXISTS nurse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  license_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Patient table
CREATE TABLE IF NOT EXISTS patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  contact_number TEXT,
  emergency_contact TEXT,
  emergency_relation TEXT,
  gravidity INTEGER DEFAULT 0,
  parity INTEGER DEFAULT 0,
  lmp DATE,
  aog TEXT,
  blood_type TEXT,
  allergies TEXT,
  medical_history TEXT,
  barangay TEXT,
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Consultation table
CREATE TABLE IF NOT EXISTS consultation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES nurse(id),
  consultation_date TIMESTAMPTZ DEFAULT now(),
  step_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  -- SOAP Assessment
  subjective_symptoms TEXT,
  objective_vitals TEXT,
  fetal_heart_rate TEXT,
  fundal_height TEXT,
  allergies TEXT,
  medications TEXT,
  -- Additional Findings
  physical_exam TEXT,
  lab_results TEXT,
  notes TEXT,
  -- Diagnosis
  icd10_diagnosis TEXT,
  nanda_diagnosis TEXT,
  -- Risk
  risk_level TEXT DEFAULT 'low',
  -- AI
  ai_suggestions TEXT,
  selected_interventions TEXT,
  -- Evaluation
  evaluation_status TEXT,
  evaluation_notes TEXT,
  -- Referral
  referral_summary TEXT,
  referral_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID REFERENCES nurse(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_risk_level ON patient(risk_level);
CREATE INDEX IF NOT EXISTS idx_patient_barangay ON patient(barangay);
CREATE INDEX IF NOT EXISTS idx_consultation_patient_id ON consultation(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_nurse_id ON consultation(nurse_id);
CREATE INDEX IF NOT EXISTS idx_consultation_status ON consultation(status);
CREATE INDEX IF NOT EXISTS idx_consultation_consultation_date ON consultation(consultation_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_nurse_id ON audit_log(nurse_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
