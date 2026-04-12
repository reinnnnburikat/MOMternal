/**
 * Shared health history constants used by both NewPatient and Consultation forms.
 * Based on MOMTERNAL specifications document.
 */

export const PAST_MEDICAL_OPTIONS = [
  'Hypertension',
  'Diabetes Mellitus',
  'Heart Disease',
  'Pulmonary Disease',
  'Rheumatic Fever (RF)',
  'Seizure Disorder',
  'Renal Disease',
  'Others (specify)',
];

export const PREVIOUS_SURGERY_OPTIONS = [
  'None',
  'Cesarean section',
  'Abdominal Surgery',
  'Others (specify)',
];

export const FAMILY_HISTORY_CONDITIONS = [
  'Hypertension',
  'Diabetes Mellitus',
  'Heart Disease',
  'Congenital Anomalies',
  'Twin Pregnancy',
  'Breech Presentation',
  'Others (specify)',
];

export const TRAUMA_OPTIONS = [
  { label: 'Yes (specify)', value: 'yes' },
  { label: 'No', value: 'no' },
];

export const BLOOD_TRANSFUSION_OPTIONS = [
  { label: 'Yes (specify)', value: 'yes' },
  { label: 'No', value: 'no' },
];

export const FAMILY_HISTORY_PRESENCE_OPTIONS = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Unknown', value: 'unknown' },
];

export const SMOKING_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'Former', value: 'former' },
  { label: 'Current', value: 'current' },
];

export const ALCOHOL_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Occasional', value: 'occasional' },
  { label: 'Regular', value: 'regular' },
];

export const DRUG_USE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Past use', value: 'past' },
  { label: 'Current use', value: 'current' },
];

export const DIETARY_PATTERN_OPTIONS = [
  { label: 'Adequate', value: 'adequate' },
  { label: 'Inadequate', value: 'inadequate' },
  { label: 'Special diet (specify)', value: 'special' },
];

export const PHYSICAL_ACTIVITY_OPTIONS = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Vigorous', value: 'vigorous' },
];

export const SLEEP_PATTERN_OPTIONS = [
  { label: 'Adequate (6\u20138 hrs)', value: 'adequate' },
  { label: 'Inadequate (<6 hrs)', value: 'inadequate' },
  { label: 'Excessive (>9 hrs)', value: 'excessive' },
];

/** Structured health history data type matching the new-patient form format */
export interface StructuredHealthHistory {
  pastMedicalHistory: {
    selected: string[];
    othersText: string;
  };
  previousSurgery: {
    selected: string[];
    othersText: string;
  };
  historyOfTrauma: {
    value: string;
    specify: string;
  };
  historyOfBloodTransfusion: {
    value: string;
    specify: string;
  };
  familyHistory: {
    value: string;
    selected: string[];
    othersText: string;
  };
  smoking: {
    value: string;
    packYears: string;
  };
  alcoholIntake: {
    value: string;
    drinksPerDay: string;
  };
  drugUse: {
    value: string;
    substance: string;
  };
  dietaryPattern: {
    value: string;
    specify: string;
  };
  physicalActivity: string;
  sleepPattern: string;
}

/** Create empty structured health history */
export function createEmptyHealthHistory(): StructuredHealthHistory {
  return {
    pastMedicalHistory: { selected: [], othersText: '' },
    previousSurgery: { selected: [], othersText: '' },
    historyOfTrauma: { value: '', specify: '' },
    historyOfBloodTransfusion: { value: '', specify: '' },
    familyHistory: { value: '', selected: [], othersText: '' },
    smoking: { value: '', packYears: '' },
    alcoholIntake: { value: '', drinksPerDay: '' },
    drugUse: { value: '', substance: '' },
    dietaryPattern: { value: '', specify: '' },
    physicalActivity: '',
    sleepPattern: '',
  };
}

/**
 * Parse health history data - handles both old flat-string format and new structured format.
 * Returns null if data is empty/invalid.
 */
export function parseHealthHistory(raw: string | null | undefined): StructuredHealthHistory | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Check if it's the new structured format
    if (parsed.pastMedicalHistory && typeof parsed.pastMedicalHistory === 'object' && 'selected' in parsed.pastMedicalHistory) {
      // Structured format - fill any missing fields with defaults
      const empty = createEmptyHealthHistory();
      return {
        pastMedicalHistory: {
          selected: Array.isArray(parsed.pastMedicalHistory?.selected) ? parsed.pastMedicalHistory.selected : [],
          othersText: parsed.pastMedicalHistory?.othersText || '',
        },
        previousSurgery: {
          selected: Array.isArray(parsed.previousSurgery?.selected) ? parsed.previousSurgery.selected : [],
          othersText: parsed.previousSurgery?.othersText || '',
        },
        historyOfTrauma: {
          value: parsed.historyOfTrauma?.value || '',
          specify: parsed.historyOfTrauma?.specify || '',
        },
        historyOfBloodTransfusion: {
          value: parsed.historyOfBloodTransfusion?.value || '',
          specify: parsed.historyOfBloodTransfusion?.specify || '',
        },
        familyHistory: {
          value: parsed.familyHistory?.value || '',
          selected: Array.isArray(parsed.familyHistory?.selected) ? parsed.familyHistory.selected : [],
          othersText: parsed.familyHistory?.othersText || '',
        },
        smoking: {
          value: parsed.smoking?.value || '',
          packYears: parsed.smoking?.packYears || '',
        },
        alcoholIntake: {
          value: parsed.alcoholIntake?.value || '',
          drinksPerDay: parsed.alcoholIntake?.drinksPerDay || '',
        },
        drugUse: {
          value: parsed.drugUse?.value || '',
          substance: parsed.drugUse?.substance || '',
        },
        dietaryPattern: {
          value: parsed.dietaryPattern?.value || '',
          specify: parsed.dietaryPattern?.specify || '',
        },
        physicalActivity: parsed.physicalActivity || '',
        sleepPattern: parsed.sleepPattern || '',
      };
    }

    // Old flat-string format - return null (will use empty structure)
    return null;
  } catch {
    return null;
  }
}

/** Convert structured health history to a human-readable summary string */
export function healthHistoryToSummary(data: StructuredHealthHistory): string {
  const parts: string[] = [];

  if (data.pastMedicalHistory.selected.length > 0) {
    const items = [...data.pastMedicalHistory.selected];
    if (data.pastMedicalHistory.othersText) items.push(data.pastMedicalHistory.othersText);
    parts.push(`PMH: ${items.join(', ')}`);
  }

  if (data.previousSurgery.selected.length > 0 && !data.previousSurgery.selected.includes('None')) {
    const items = [...data.previousSurgery.selected.filter(s => s !== 'None')];
    if (data.previousSurgery.othersText) items.push(data.previousSurgery.othersText);
    parts.push(`Surgery: ${items.join(', ')}`);
  }

  if (data.historyOfTrauma.value === 'yes' && data.historyOfTrauma.specify) {
    parts.push(`Trauma: ${data.historyOfTrauma.specify}`);
  }

  if (data.familyHistory.value === 'present' && data.familyHistory.selected.length > 0) {
    const items = [...data.familyHistory.selected];
    if (data.familyHistory.othersText) items.push(data.familyHistory.othersText);
    parts.push(`FH: ${items.join(', ')}`);
  }

  if (data.smoking.value === 'current' || data.smoking.value === 'former') {
    parts.push(`Smoking: ${data.smoking.value}${data.smoking.packYears ? ` (${data.smoking.packYears} pack-yrs)` : ''}`);
  }

  if (data.alcoholIntake.value === 'occasional' || data.alcoholIntake.value === 'regular') {
    parts.push(`Alcohol: ${data.alcoholIntake.value}${data.alcoholIntake.drinksPerDay ? ` (${data.alcoholIntake.drinksPerDay}/day)` : ''}`);
  }

  if (data.drugUse.value === 'past' || data.drugUse.value === 'current') {
    parts.push(`Drug use: ${data.drugUse.value}${data.drugUse.substance ? ` (${data.drugUse.substance})` : ''}`);
  }

  return parts.join(' | ');
}
