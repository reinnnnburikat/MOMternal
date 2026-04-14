'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  Heart,
  Loader2,
  FileText,
  Activity,
  AlertTriangle,
  Cigarette,
  Wine,
  Pill,
  Salad,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MAKATI_BARANGAYS } from '@/data/makati-barangays';
import { useAppStore } from '@/store/app-store';
import { offlineFetch } from '@/lib/offline-fetch';

// ─── Constants (same as new-patient-view.tsx) ─────────────────────────────

const NAME_EXTENSIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV'];

const OCCUPATIONS = [
  'Unemployed',
  'Housewife',
  'Student',
  'Employed \u2014 Non-hazardous',
  'Employed \u2014 Hazardous',
];

const MARITAL_STATUSES = [
  'Single',
  'Married',
  'Common-law',
  'Widowed',
  'Divorced/Separated',
];

const FAMILY_COMPOSITIONS = ['Nuclear', 'Extended', 'Single-parent', 'Blended'];

const INCOME_BRACKETS = [
  'Low Income (< \u20B112,082/month)',
  'Lower-Middle Income (\u20B112,082 \u2013 \u20B124,164/month)',
  'Middle Income (\u20B124,165 \u2013 \u20B172,498/month)',
  'Upper-Middle Income (\u20B172,499 \u2013 \u20B1120,830/month)',
  'High Income (> \u20B1120,830/month)',
];

const PAST_MEDICAL_OPTIONS = [
  'Hypertension',
  'Diabetes Mellitus',
  'Heart Disease',
  'Pulmonary Disease',
  'Rheumatic Fever (RF)',
  'Seizure Disorder',
  'Renal Disease',
  'Others (specify)',
];

const PREVIOUS_SURGERY_OPTIONS = [
  'None',
  'Cesarean section',
  'Abdominal Surgery',
  'Others (specify)',
];

const FAMILY_HISTORY_OPTIONS = [
  'Hypertension',
  'Diabetes Mellitus',
  'Heart Disease',
  'Congenital Anomalies',
  'Twin Pregnancy',
  'Breech Presentation',
  'Others (specify)',
];

const TRAUMA_OPTIONS = [
  { label: 'Yes (specify)', value: 'yes' },
  { label: 'No', value: 'no' },
];

const BLOOD_TRANSFUSION_OPTIONS = [
  { label: 'Yes (specify)', value: 'yes' },
  { label: 'No', value: 'no' },
];

const FAMILY_HISTORY_DROPDOWN_OPTIONS = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Unknown', value: 'unknown' },
];

const SMOKING_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'Former', value: 'former' },
  { label: 'Current', value: 'current' },
];

const ALCOHOL_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Occasional', value: 'occasional' },
  { label: 'Regular', value: 'regular' },
];

const DRUG_USE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Past use', value: 'past' },
  { label: 'Current use', value: 'current' },
];

const DIETARY_PATTERN_OPTIONS = [
  { label: 'Adequate', value: 'adequate' },
  { label: 'Inadequate', value: 'inadequate' },
  { label: 'Special diet (specify)', value: 'special' },
];

const PHYSICAL_ACTIVITY_OPTIONS = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Vigorous', value: 'vigorous' },
];

const SLEEP_PATTERN_OPTIONS = [
  { label: 'Adequate (6-8 hrs)', value: 'adequate' },
  { label: 'Inadequate (<6 hrs)', value: 'inadequate' },
  { label: 'Excessive (>9 hrs)', value: 'excessive' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item)
    ? arr.filter((i) => i !== item)
    : [...arr, item];
}

function safeParseJSON<T>(value: string | null | undefined): T | null {
  if (!value || !value.trim().startsWith('{')) return null;
  try {
    const obj = JSON.parse(value);
    return typeof obj === 'object' && obj !== null ? (obj as T) : null;
  } catch {
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────

interface PatientDataForEdit {
  id: string;
  surname: string;
  firstName: string;
  middleInitial: string | null;
  nameExtension: string | null;
  dateOfBirth: string;
  barangay: string | null;
  blockLotStreet: string | null;
  occupation: string | null;
  religion: string | null;
  maritalStatus: string | null;
  familyComposition: string | null;
  incomeBracket: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  surgicalHistory: string | null;
  familyHistory: string | null;
  socialHistory: string | null;
}

interface EditPatientDialogProps {
  patient: PatientDataForEdit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────

export function EditPatientDialog({ patient, open, onOpenChange, onSaved }: EditPatientDialogProps) {
  const currentNurse = useAppStore((s) => s.currentNurse);
  const [isSaving, setIsSaving] = useState(false);

  // ── Personal Info State ────────────────────────────────────────────────
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [nameExtension, setNameExtension] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [barangay, setBarangay] = useState('');
  const [blockLotStreet, setBlockLotStreet] = useState('');
  const [occupation, setOccupation] = useState('');
  const [religion, setReligion] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [familyComposition, setFamilyComposition] = useState('');
  const [incomeBracket, setIncomeBracket] = useState('');
  const [allergies, setAllergies] = useState('');

  // ── Health History State ───────────────────────────────────────────────
  const [pastMedicalSelected, setPastMedicalSelected] = useState<string[]>([]);
  const [pastMedicalOthersText, setPastMedicalOthersText] = useState('');

  const [previousSurgerySelected, setPreviousSurgerySelected] = useState<string[]>([]);
  const [previousSurgeryOthersText, setPreviousSurgeryOthersText] = useState('');

  const [traumaValue, setTraumaValue] = useState('');
  const [traumaSpecify, setTraumaSpecify] = useState('');

  const [bloodTransfusionValue, setBloodTransfusionValue] = useState('');
  const [bloodTransfusionSpecify, setBloodTransfusionSpecify] = useState('');

  const [familyHistoryDropdown, setFamilyHistoryDropdown] = useState('');
  const [familyHistorySelected, setFamilyHistorySelected] = useState<string[]>([]);
  const [familyHistoryOthersText, setFamilyHistoryOthersText] = useState('');

  const [smokingValue, setSmokingValue] = useState('');
  const [smokingPackYears, setSmokingPackYears] = useState('');

  const [alcoholValue, setAlcoholValue] = useState('');
  const [alcoholDrinksPerDay, setAlcoholDrinksPerDay] = useState('');

  const [drugUseValue, setDrugUseValue] = useState('');
  const [drugUseSubstance, setDrugUseSubstance] = useState('');

  const [dietaryPatternValue, setDietaryPatternValue] = useState('');
  const [dietaryPatternSpecify, setDietaryPatternSpecify] = useState('');

  const [physicalActivity, setPhysicalActivity] = useState('');
  const [sleepPattern, setSleepPattern] = useState('');

  // ── Initialize from patient data ───────────────────────────────────────
  const initForm = useCallback(() => {
    setSurname(patient.surname || '');
    setFirstName(patient.firstName || '');
    setMiddleInitial(patient.middleInitial || '');
    setNameExtension(patient.nameExtension || 'none');
    setDateOfBirth(patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'yyyy-MM-dd') : '');
    setBarangay(patient.barangay || '');
    setBlockLotStreet(patient.blockLotStreet || '');
    setOccupation(patient.occupation || '');
    setReligion(patient.religion || '');
    setMaritalStatus(patient.maritalStatus || '');
    setFamilyComposition(patient.familyComposition || '');
    setIncomeBracket(patient.incomeBracket || '');
    setAllergies(patient.allergies || '');

    // Parse medicalHistory JSON (Past Medical History)
    const medParsed = safeParseJSON<{ selected?: string[]; othersText?: string }>(patient.medicalHistory);
    if (medParsed && Array.isArray(medParsed.selected)) {
      const sel = medParsed.selected.filter(Boolean);
      setPastMedicalSelected(sel);
      setPastMedicalOthersText(medParsed.othersText || '');
      if (medParsed.othersText) sel.push('Others (specify)');
      setPastMedicalSelected(sel);
    } else {
      setPastMedicalSelected([]);
      setPastMedicalOthersText('');
    }

    // Parse surgicalHistory JSON (Previous Surgery)
    const surgParsed = safeParseJSON<{ selected?: string[]; othersText?: string }>(patient.surgicalHistory);
    if (surgParsed && Array.isArray(surgParsed.selected)) {
      const sel = surgParsed.selected.filter(Boolean);
      setPreviousSurgerySelected(sel);
      setPreviousSurgeryOthersText(surgParsed.othersText || '');
      if (surgParsed.othersText) sel.push('Others (specify)');
      setPreviousSurgerySelected(sel);
    } else {
      setPreviousSurgerySelected([]);
      setPreviousSurgeryOthersText('');
    }

    // Parse familyHistory JSON
    const famParsed = safeParseJSON<{ value?: string; selected?: string[]; othersText?: string }>(patient.familyHistory);
    if (famParsed && famParsed.value) {
      setFamilyHistoryDropdown(famParsed.value);
      if (famParsed.value === 'present' && Array.isArray(famParsed.selected)) {
        const sel = famParsed.selected.filter(Boolean);
        setFamilyHistorySelected(sel);
        setFamilyHistoryOthersText(famParsed.othersText || '');
        if (famParsed.othersText) sel.push('Others (specify)');
        setFamilyHistorySelected(sel);
      } else {
        setFamilyHistorySelected([]);
        setFamilyHistoryOthersText('');
      }
    } else {
      setFamilyHistoryDropdown('');
      setFamilyHistorySelected([]);
      setFamilyHistoryOthersText('');
    }

    // Parse socialHistory JSON for remaining sections
    const socialParsed = safeParseJSON<{
      historyOfTrauma?: { value?: string; specify?: string };
      historyOfBloodTransfusion?: { value?: string; specify?: string };
      smoking?: { value?: string; packYears?: string };
      alcoholIntake?: { value?: string; drinksPerDay?: string };
      drugUse?: { value?: string; substance?: string };
      dietaryPattern?: { value?: string; specify?: string };
      physicalActivity?: string;
      sleepPattern?: string;
    }>(patient.socialHistory);

    if (socialParsed) {
      if (socialParsed.historyOfTrauma) {
        setTraumaValue(socialParsed.historyOfTrauma.value || '');
        setTraumaSpecify(socialParsed.historyOfTrauma.specify || '');
      }
      if (socialParsed.historyOfBloodTransfusion) {
        setBloodTransfusionValue(socialParsed.historyOfBloodTransfusion.value || '');
        setBloodTransfusionSpecify(socialParsed.historyOfBloodTransfusion.specify || '');
      }
      if (socialParsed.smoking) {
        setSmokingValue(socialParsed.smoking.value || '');
        setSmokingPackYears(socialParsed.smoking.packYears || '');
      }
      if (socialParsed.alcoholIntake) {
        setAlcoholValue(socialParsed.alcoholIntake.value || '');
        setAlcoholDrinksPerDay(socialParsed.alcoholIntake.drinksPerDay || '');
      }
      if (socialParsed.drugUse) {
        setDrugUseValue(socialParsed.drugUse.value || '');
        setDrugUseSubstance(socialParsed.drugUse.substance || '');
      }
      if (socialParsed.dietaryPattern) {
        setDietaryPatternValue(socialParsed.dietaryPattern.value || '');
        setDietaryPatternSpecify(socialParsed.dietaryPattern.specify || '');
      }
      setPhysicalActivity(socialParsed.physicalActivity || '');
      setSleepPattern(socialParsed.sleepPattern || '');
    } else {
      setTraumaValue('');
      setTraumaSpecify('');
      setBloodTransfusionValue('');
      setBloodTransfusionSpecify('');
      setSmokingValue('');
      setSmokingPackYears('');
      setAlcoholValue('');
      setAlcoholDrinksPerDay('');
      setDrugUseValue('');
      setDrugUseSubstance('');
      setDietaryPatternValue('');
      setDietaryPatternSpecify('');
      setPhysicalActivity('');
      setSleepPattern('');
    }
  }, [patient]);

  useEffect(() => {
    if (open) {
      initForm();
    }
  }, [open, initForm]);

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!currentNurse) {
      toast.error('You must be logged in to edit a patient');
      return;
    }

    if (!surname.trim() || !firstName.trim() || !dateOfBirth) {
      toast.error('Surname, first name, and date of birth are required');
      return;
    }

    setIsSaving(true);
    try {
      // Build distributed health history fields for DB columns
      const pastMedicalHistoryJSON = JSON.stringify({
        selected: pastMedicalSelected.filter((i) => i !== 'Others (specify)'),
        othersText: pastMedicalSelected.includes('Others (specify)')
          ? pastMedicalOthersText
          : '',
      });

      const previousSurgeryJSON = JSON.stringify({
        selected: previousSurgerySelected.filter((i) => i !== 'Others (specify)'),
        othersText: previousSurgerySelected.includes('Others (specify)')
          ? previousSurgeryOthersText
          : '',
      });

      const familyHistoryJSON = JSON.stringify({
        value: familyHistoryDropdown,
        selected:
          familyHistoryDropdown === 'present'
            ? familyHistorySelected.filter((i) => i !== 'Others (specify)')
            : [],
        othersText:
          familyHistoryDropdown === 'present' &&
          familyHistorySelected.includes('Others (specify)')
            ? familyHistoryOthersText
            : '',
      });

      // Store remaining social/lifestyle health history in socialHistory column
      const socialHistoryJSON = JSON.stringify({
        historyOfTrauma: {
          value: traumaValue,
          specify: traumaValue === 'yes' ? traumaSpecify : '',
        },
        historyOfBloodTransfusion: {
          value: bloodTransfusionValue,
          specify: bloodTransfusionValue === 'yes' ? bloodTransfusionSpecify : '',
        },
        smoking: {
          value: smokingValue,
          packYears:
            smokingValue === 'former' || smokingValue === 'current'
              ? smokingPackYears
              : '',
        },
        alcoholIntake: {
          value: alcoholValue,
          drinksPerDay:
            alcoholValue === 'occasional' || alcoholValue === 'regular'
              ? alcoholDrinksPerDay
              : '',
        },
        drugUse: {
          value: drugUseValue,
          substance:
            drugUseValue === 'past' || drugUseValue === 'current'
              ? drugUseSubstance
              : '',
        },
        dietaryPattern: {
          value: dietaryPatternValue,
          specify: dietaryPatternValue === 'special' ? dietaryPatternSpecify : '',
        },
        physicalActivity,
        sleepPattern,
      });

      const payload = {
        nurseId: currentNurse.id,
        surname: surname.trim(),
        firstName: firstName.trim(),
        middleInitial: middleInitial.trim() || null,
        nameExtension: nameExtension === 'none' ? null : (nameExtension || null),
        dateOfBirth,
        blockLotStreet: blockLotStreet.trim() || null,
        barangay: barangay || null,
        occupation: occupation || null,
        religion: religion.trim() || null,
        maritalStatus: maritalStatus || null,
        familyComposition: familyComposition || null,
        incomeBracket: incomeBracket || null,
        allergies: allergies.trim() || null,
        medicalHistory: pastMedicalHistoryJSON,
        surgicalHistory: previousSurgeryJSON,
        familyHistory: familyHistoryJSON,
        socialHistory: socialHistoryJSON,
      };

      const res = await offlineFetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        if (data.offline) {
          toast.info('Patient saved offline. Will sync when online.');
        } else {
          toast.success('Patient updated successfully');
        }
        onSaved();
        onOpenChange(false);
      } else {
        toast.error(data.error || 'Failed to update patient');
      }
    } catch {
      toast.error('Unable to save. Will retry when online.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-rose-500" />
            Edit Patient
          </DialogTitle>
          <DialogDescription>
            Update patient demographics and health history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* ═══════════════════════════════════════════════════════════════
              CARD 1: Personal Information
          ═══════════════════════════════════════════════════════════════ */}
          <div className="rounded-xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
            <div className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-rose-500" />
                Personal Information
              </h3>
            </div>
            <div className="px-4 pb-4 space-y-4">
              {/* Patient Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Surname *</Label>
                  <Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="e.g. Santos" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Maria Clara" className="h-10" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Middle Initial</Label>
                  <Input value={middleInitial} onChange={(e) => setMiddleInitial(e.target.value)} placeholder="e.g. R" maxLength={1} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Name Extension</Label>
                  <Select value={nameExtension || undefined} onValueChange={setNameExtension}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select extension" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {NAME_EXTENSIONS.map((ext) => (
                        <SelectItem key={ext} value={ext}>
                          {ext}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Date of Birth (MM/DD/YYYY) *
                </Label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-10"
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              {/* Address */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Barangay</Label>
                    <Select value={barangay || undefined} onValueChange={setBarangay}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select barangay" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="max-h-64 overflow-y-auto">
                          {MAKATI_BARANGAYS.map((brgy) => (
                            <SelectItem key={brgy} value={brgy}>
                              {brgy}
                            </SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Block No. &ndash; Lot No. &ndash; Street</Label>
                    <Input
                      value={blockLotStreet}
                      onChange={(e) => setBlockLotStreet(e.target.value)}
                      placeholder="e.g. Block 5 Lot 12 Rizal Street"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Occupation & Religion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    Occupation
                  </Label>
                  <Select value={occupation || undefined} onValueChange={setOccupation}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select occupation" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPATIONS.map((occ) => (
                        <SelectItem key={occ} value={occ}>
                          {occ}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Religion</Label>
                  <Input value={religion} onChange={(e) => setReligion(e.target.value)} placeholder="e.g. Catholic, Islam" className="h-10" />
                </div>
              </div>

              {/* Marital Status & Family Composition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Marital Status</Label>
                  <Select value={maritalStatus || undefined} onValueChange={setMaritalStatus}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Family Composition
                  </Label>
                  <Select value={familyComposition || undefined} onValueChange={setFamilyComposition}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select composition" />
                    </SelectTrigger>
                    <SelectContent>
                      {FAMILY_COMPOSITIONS.map((fc) => (
                        <SelectItem key={fc} value={fc}>
                          {fc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Income Bracket */}
              <div className="space-y-1.5">
                <Label>Income</Label>
                <Select value={incomeBracket || undefined} onValueChange={setIncomeBracket}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select income bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_BRACKETS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              CARD 2: Health History
          ═══════════════════════════════════════════════════════════════ */}
          <div className="rounded-xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
            <div className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Health History
              </h3>
            </div>
            <div className="px-4 pb-4 space-y-5">
              {/* Allergies */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Allergies
                </Label>
                <Textarea
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, Latex"
                  className="min-h-[72px] resize-none"
                />
              </div>

              {/* Past Medical History */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Past Medical History
                  <span className="text-xs text-muted-foreground font-normal">(Select all that apply)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAST_MEDICAL_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Checkbox
                        checked={pastMedicalSelected.includes(option)}
                        onCheckedChange={() =>
                          setPastMedicalSelected((prev) => toggleItem(prev, option))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {pastMedicalSelected.includes('Others (specify)') && (
                  <Input
                    placeholder="Please specify..."
                    className="h-9 mt-1"
                    value={pastMedicalOthersText}
                    onChange={(e) => setPastMedicalOthersText(e.target.value)}
                  />
                )}
              </div>

              {/* Previous Surgery */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  Previous Surgery
                  <span className="text-xs text-muted-foreground font-normal">(Select all that apply)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PREVIOUS_SURGERY_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Checkbox
                        checked={previousSurgerySelected.includes(option)}
                        onCheckedChange={() =>
                          setPreviousSurgerySelected((prev) => toggleItem(prev, option))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {previousSurgerySelected.includes('Others (specify)') && (
                  <Input
                    placeholder="Please specify..."
                    className="h-9 mt-1"
                    value={previousSurgeryOthersText}
                    onChange={(e) => setPreviousSurgeryOthersText(e.target.value)}
                  />
                )}
              </div>

              {/* History of Trauma */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">History of Trauma</Label>
                <Select value={traumaValue || undefined} onValueChange={setTraumaValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAUMA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {traumaValue === 'yes' && (
                  <Input
                    placeholder="Please specify the trauma..."
                    className="h-9 mt-1"
                    value={traumaSpecify}
                    onChange={(e) => setTraumaSpecify(e.target.value)}
                  />
                )}
              </div>

              {/* History of Blood Transfusion */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">History of Blood Transfusion</Label>
                <Select value={bloodTransfusionValue || undefined} onValueChange={setBloodTransfusionValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TRANSFUSION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bloodTransfusionValue === 'yes' && (
                  <Input
                    placeholder="Please specify..."
                    className="h-9 mt-1"
                    value={bloodTransfusionSpecify}
                    onChange={(e) => setBloodTransfusionSpecify(e.target.value)}
                  />
                )}
              </div>

              {/* Family History */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Family History (Maternal and Paternal)
                </Label>
                <Select
                  value={familyHistoryDropdown || undefined}
                  onValueChange={(val) => {
                    setFamilyHistoryDropdown(val);
                    if (val !== 'present') {
                      setFamilyHistorySelected([]);
                      setFamilyHistoryOthersText('');
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILY_HISTORY_DROPDOWN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {familyHistoryDropdown === 'present' && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">
                      Select all that apply:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {FAMILY_HISTORY_OPTIONS.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Checkbox
                            checked={familyHistorySelected.includes(option)}
                            onCheckedChange={() =>
                              setFamilyHistorySelected((prev) => toggleItem(prev, option))
                            }
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    {familyHistorySelected.includes('Others (specify)') && (
                      <Input
                        placeholder="Please specify..."
                        className="h-9 mt-1"
                        value={familyHistoryOthersText}
                        onChange={(e) => setFamilyHistoryOthersText(e.target.value)}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Smoking */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Cigarette className="h-3.5 w-3.5 text-muted-foreground" />
                  Smoking
                </Label>
                <Select value={smokingValue || undefined} onValueChange={setSmokingValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {SMOKING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(smokingValue === 'former' || smokingValue === 'current') && (
                  <Input
                    placeholder="No. of Pack Years"
                    className="h-9 mt-1"
                    value={smokingPackYears}
                    onChange={(e) => setSmokingPackYears(e.target.value)}
                  />
                )}
              </div>

              {/* Alcohol Intake */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Wine className="h-3.5 w-3.5 text-muted-foreground" />
                  Alcohol Intake
                </Label>
                <Select value={alcoholValue || undefined} onValueChange={setAlcoholValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALCOHOL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(alcoholValue === 'occasional' || alcoholValue === 'regular') && (
                  <Input
                    placeholder="No. of standard drinks per day"
                    className="h-9 mt-1"
                    value={alcoholDrinksPerDay}
                    onChange={(e) => setAlcoholDrinksPerDay(e.target.value)}
                  />
                )}
              </div>

              {/* Drug Use */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                  Drug Use
                </Label>
                <Select value={drugUseValue || undefined} onValueChange={setDrugUseValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRUG_USE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(drugUseValue === 'past' || drugUseValue === 'current') && (
                  <Input
                    placeholder="Type of Substance"
                    className="h-9 mt-1"
                    value={drugUseSubstance}
                    onChange={(e) => setDrugUseSubstance(e.target.value)}
                  />
                )}
              </div>

              {/* Dietary Pattern */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Salad className="h-3.5 w-3.5 text-muted-foreground" />
                  Dietary Pattern
                </Label>
                <Select value={dietaryPatternValue || undefined} onValueChange={setDietaryPatternValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIETARY_PATTERN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dietaryPatternValue === 'special' && (
                  <Input
                    placeholder="Please specify the special diet..."
                    className="h-9 mt-1"
                    value={dietaryPatternSpecify}
                    onChange={(e) => setDietaryPatternSpecify(e.target.value)}
                  />
                )}
              </div>

              {/* Physical Activity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Physical Activity</Label>
                <Select value={physicalActivity || undefined} onValueChange={setPhysicalActivity}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHYSICAL_ACTIVITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sleep Pattern */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                  Sleep Pattern
                </Label>
                <Select value={sleepPattern || undefined} onValueChange={setSleepPattern}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLEEP_PATTERN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              Action Buttons
          ═══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 hover:bg-rose-50"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
