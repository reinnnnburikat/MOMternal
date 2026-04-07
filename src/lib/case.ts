/**
 * Convert snake_case string to camelCase.
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert camelCase string to snake_case.
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Convert all keys in an object from snake_case to camelCase (deep conversion).
 */
export function toCamelCase<T = Record<string, unknown>>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map(toCamelCase) as T;
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = snakeToCamel(key);
      // Handle nested objects recursively
      if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        result[camelKey] = toCamelCase(value);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map(toCamelCase);
      } else {
        result[camelKey] = value;
      }
    }
    return result as T;
  }
  return obj as T;
}

/**
 * Convert all keys in an object from camelCase to snake_case (shallow conversion).
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

/**
 * Field mapping for patient table: camelCase (API) -> snake_case (DB)
 */
export const patientFieldMap: Record<string, string> = {
  patientId: 'patient_id',
  dateOfBirth: 'date_of_birth',
  contactNumber: 'contact_number',
  emergencyContact: 'emergency_contact',
  emergencyRelation: 'emergency_relation',
  bloodType: 'blood_type',
  medicalHistory: 'medical_history',
  riskLevel: 'risk_level',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * Field mapping for consultation table: camelCase (API) -> snake_case (DB)
 */
export const consultationFieldMap: Record<string, string> = {
  consultationNo: 'consultation_no',
  patientId: 'patient_id',
  nurseId: 'nurse_id',
  consultationDate: 'consultation_date',
  stepCompleted: 'step_completed',
  subjectiveSymptoms: 'subjective_symptoms',
  objectiveVitals: 'objective_vitals',
  fetalHeartRate: 'fetal_heart_rate',
  fundalHeight: 'fundal_height',
  physicalExam: 'physical_exam',
  labResults: 'lab_results',
  icd10Diagnosis: 'icd10_diagnosis',
  nandaDiagnosis: 'nanda_diagnosis',
  aiSuggestions: 'ai_suggestions',
  selectedInterventions: 'selected_interventions',
  evaluationStatus: 'evaluation_status',
  evaluationNotes: 'evaluation_notes',
  referralSummary: 'referral_summary',
  referralStatus: 'referral_status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * Field mapping for nurse table: camelCase (API) -> snake_case (DB)
 */
export const nurseFieldMap: Record<string, string> = {
  licenseNo: 'license_no',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * Convert a patient row from DB (snake_case) to API format (camelCase)
 */
export function mapPatientFromDb(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    patientId: row.patient_id,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    contactNumber: row.contact_number,
    emergencyContact: row.emergency_contact,
    emergencyRelation: row.emergency_relation,
    gravidity: row.gravidity,
    parity: row.parity,
    lmp: row.lmp,
    aog: row.aog,
    bloodType: row.blood_type,
    allergies: row.allergies,
    medicalHistory: row.medical_history,
    barangay: row.barangay,
    riskLevel: row.risk_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a consultation row from DB (snake_case) to API format (camelCase)
 */
export function mapConsultationFromDb(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    consultationNo: row.consultation_no,
    patientId: row.patient_id,
    nurseId: row.nurse_id,
    consultationDate: row.consultation_date,
    stepCompleted: row.step_completed,
    status: row.status,
    subjectiveSymptoms: row.subjective_symptoms,
    objectiveVitals: row.objective_vitals,
    fetalHeartRate: row.fetal_heart_rate,
    fundalHeight: row.fundal_height,
    allergies: row.allergies,
    medications: row.medications,
    physicalExam: row.physical_exam,
    labResults: row.lab_results,
    notes: row.notes,
    icd10Diagnosis: row.icd10_diagnosis,
    nandaDiagnosis: row.nanda_diagnosis,
    riskLevel: row.risk_level,
    aiSuggestions: row.ai_suggestions,
    selectedInterventions: row.selected_interventions,
    evaluationStatus: row.evaluation_status,
    evaluationNotes: row.evaluation_notes,
    referralSummary: row.referral_summary,
    referralStatus: row.referral_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a nurse row from DB (snake_case) to API format (camelCase)
 */
export function mapNurseFromDb(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    licenseNo: row.license_no,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert patient data from API (camelCase) to DB (snake_case) format for INSERT/UPDATE
 */
export function mapPatientToDb(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = patientFieldMap[key] || camelToSnake(key);
    mapped[snakeKey] = value;
  }
  return mapped;
}

/**
 * Convert consultation data from API (camelCase) to DB (snake_case) format for INSERT/UPDATE
 */
export function mapConsultationToDb(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = consultationFieldMap[key] || camelToSnake(key);
    mapped[snakeKey] = value;
  }
  return mapped;
}
