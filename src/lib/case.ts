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
  surname: 'surname',
  firstName: 'first_name',
  middleInitial: 'middle_initial',
  nameExtension: 'name_extension',
  dateOfBirth: 'date_of_birth',
  age: 'age',
  address: 'address',
  blockLotStreet: 'block_lot_street',
  barangay: 'barangay',
  contactNumber: 'contact_number',
  emergencyContact: 'emergency_contact',
  emergencyRelation: 'emergency_relation',
  occupation: 'occupation',
  religion: 'religion',
  maritalStatus: 'marital_status',
  familyComposition: 'family_composition',
  incomeBracket: 'income_bracket',
  allergies: 'allergies',
  medicalHistory: 'medical_history',
  surgicalHistory: 'surgical_history',
  familyHistory: 'family_history',
  obstetricHistory: 'obstetric_history',
  immunizationStatus: 'immunization_status',
  currentMedications: 'current_medications',
  healthPractices: 'health_practices',
  socialHistory: 'social_history',
  psychosocialHistory: 'psychosocial_history',
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
  status: 'status',
  healthHistory: 'health_history',
  healthHistoryRefCode: 'health_history_ref_code',
  typeOfVisit: 'type_of_visit',
  subjectiveSymptoms: 'subjective_symptoms',
  chiefComplaint: 'chief_complaint',
  objectiveVitals: 'objective_vitals',
  fetalHeartRate: 'fetal_heart_rate',
  fundalHeight: 'fundal_height',
  allergies: 'allergies',
  medications: 'medications',
  gravidity: 'gravidity',
  parity: 'parity',
  lmp: 'lmp',
  aog: 'aog',
  bloodType: 'blood_type',
  height: 'height',
  weight: 'weight',
  bmi: 'bmi',
  physicalExam: 'physical_exam',
  labResults: 'lab_results',
  notes: 'notes',
  icd10Diagnosis: 'icd10_diagnosis',
  nandaDiagnosis: 'nanda_diagnosis',
  nandaCode: 'nanda_code',
  nandaName: 'nanda_name',
  riskLevel: 'risk_level',
  preventionLevel: 'prevention_level',
  aiSuggestions: 'ai_suggestions',
  selectedInterventions: 'selected_interventions',
  interventionEvaluations: 'intervention_evaluations',
  evaluationStatus: 'evaluation_status',
  evaluationNotes: 'evaluation_notes',
  referralType: 'referral_type',
  referralPriority: 'referral_priority',
  referralFacility: 'referral_facility',
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
    surname: row.surname,
    firstName: row.first_name,
    middleInitial: row.middle_initial,
    nameExtension: row.name_extension,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    address: row.address,
    blockLotStreet: row.block_lot_street,
    barangay: row.barangay,
    contactNumber: row.contact_number,
    emergencyContact: row.emergency_contact,
    emergencyRelation: row.emergency_relation,
    occupation: row.occupation,
    religion: row.religion,
    maritalStatus: row.marital_status,
    familyComposition: row.family_composition,
    incomeBracket: row.income_bracket,
    allergies: row.allergies,
    medicalHistory: row.medical_history,
    surgicalHistory: row.surgical_history,
    familyHistory: row.family_history,
    obstetricHistory: row.obstetric_history,
    immunizationStatus: row.immunization_status,
    currentMedications: row.current_medications,
    healthPractices: row.health_practices,
    socialHistory: row.social_history,
    psychosocialHistory: row.psychosocial_history,
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
    healthHistory: row.health_history,
    healthHistoryRefCode: row.health_history_ref_code,
    typeOfVisit: row.type_of_visit,
    subjectiveSymptoms: row.subjective_symptoms,
    chiefComplaint: row.chief_complaint,
    objectiveVitals: row.objective_vitals,
    fetalHeartRate: row.fetal_heart_rate,
    fundalHeight: row.fundal_height,
    allergies: row.allergies,
    medications: row.medications,
    gravidity: row.gravidity,
    parity: row.parity,
    lmp: row.lmp,
    aog: row.aog,
    bloodType: row.blood_type,
    height: row.height,
    weight: row.weight,
    bmi: row.bmi,
    physicalExam: row.physical_exam,
    labResults: row.lab_results,
    notes: row.notes,
    icd10Diagnosis: row.icd10_diagnosis,
    nandaDiagnosis: row.nanda_diagnosis,
    nandaCode: row.nanda_code,
    nandaName: row.nanda_name,
    riskLevel: row.risk_level,
    preventionLevel: row.prevention_level,
    aiSuggestions: row.ai_suggestions,
    selectedInterventions: row.selected_interventions,
    interventionEvaluations: row.intervention_evaluations,
    evaluationStatus: row.evaluation_status,
    evaluationNotes: row.evaluation_notes,
    referralType: row.referral_type,
    referralPriority: row.referral_priority,
    referralFacility: row.referral_facility,
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
 * Field mapping for health_history table: camelCase (API) -> snake_case (DB)
 */
export const healthHistoryFieldMap: Record<string, string> = {
  referenceCode: 'reference_code',
  patientId: 'patient_id',
  nurseId: 'nurse_id',
  pastMedicalHistory: 'past_medical_history',
  previousSurgery: 'previous_surgery',
  historyOfTrauma: 'history_of_trauma',
  historyOfBloodTransfusion: 'history_of_blood_transfusion',
  familyHistoryPaternal: 'family_history_paternal',
  familyHistoryMaternal: 'family_history_maternal',
  smokingHistory: 'smoking_history',
  alcoholIntake: 'alcohol_intake',
  drugUse: 'drug_use',
  dietaryPattern: 'dietary_pattern',
  physicalActivity: 'physical_activity',
  sleepPattern: 'sleep_pattern',
  allergies: 'allergies',
  currentMedications: 'current_medications',
  immunizationStatus: 'immunization_status',
  mentalHealthHistory: 'mental_health_history',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * Convert a health_history row from DB (snake_case) to API format (camelCase)
 */
export function mapHealthHistoryFromDb(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    patientId: row.patient_id,
    nurseId: row.nurse_id,
    pastMedicalHistory: row.past_medical_history,
    previousSurgery: row.previous_surgery,
    historyOfTrauma: row.history_of_trauma,
    historyOfBloodTransfusion: row.history_of_blood_transfusion,
    familyHistoryPaternal: row.family_history_paternal,
    familyHistoryMaternal: row.family_history_maternal,
    smokingHistory: row.smoking_history,
    alcoholIntake: row.alcohol_intake,
    drugUse: row.drug_use,
    dietaryPattern: row.dietary_pattern,
    physicalActivity: row.physical_activity,
    sleepPattern: row.sleep_pattern,
    allergies: row.allergies,
    currentMedications: row.current_medications,
    immunizationStatus: row.immunization_status,
    mentalHealthHistory: row.mental_health_history,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
