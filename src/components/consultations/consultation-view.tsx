'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { validateStep } from '@/lib/consultation-validation';
import { generateReferralPdf } from '@/lib/generate-referral-pdf';
import { enqueue, getQueueLength } from '@/lib/offline-queue';
import { setCache, getCache } from '@/lib/offline-cache';
import { generateFallbackSuggestions } from '@/lib/ai-fallback';
import { CodeCombobox, type CodeOption } from '@/components/ui/code-combobox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon } from '@radix-ui/react-icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  ClipboardList,
  Search,
  Stethoscope,
  Activity,
  Brain,
  ShieldAlert,
  Sparkles,
  UserCheck,
  CheckCircle2,
  FileOutput,
  FileText,
  FileHeart,
  ChevronRight,
  ChevronLeft,
  Save,
  AlertTriangle,
  RefreshCw,
  Copy,
  Baby,
  Heart,
  Thermometer,
  Weight,
  Wind,
  Plus,
  Trash2,
  Loader2,
  Shield,
  Info,
  AlertCircle,
  Users,
  X,
  Cigarette,
  Wine,
  Pill,
  Salad,
  Dumbbell,
  Moon,
  CloudOff,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ICD10_MATERNAL_CODES, searchIcd10Codes } from '@/data/icd10-maternal';
import {
  PAST_MEDICAL_OPTIONS,
  PREVIOUS_SURGERY_OPTIONS,
  FAMILY_HISTORY_CONDITIONS,
  TRAUMA_OPTIONS,
  BLOOD_TRANSFUSION_OPTIONS,
  FAMILY_HISTORY_PRESENCE_OPTIONS,
  SMOKING_OPTIONS,
  ALCOHOL_OPTIONS,
  DRUG_USE_OPTIONS,
  DIETARY_PATTERN_OPTIONS,
  PHYSICAL_ACTIVITY_OPTIONS,
  SLEEP_PATTERN_OPTIONS,
  parseHealthHistory,
} from '@/lib/health-history-constants';
import { NANDA_DIAGNOSES, searchNandaDiagnoses } from '@/data/nanda-diagnoses';
import { NIC_INTERVENTIONS, searchNicInterventions, getNicByDomain } from '@/data/nic-interventions';
import { NOC_OUTCOMES, searchNocOutcomes } from '@/data/noc-outcomes';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PatientInfo {
  id: string;
  patientId: string;
  name: string;
  dateOfBirth?: string;
  riskLevel?: string;
}

interface ConsultationData {
  id: string;
  consultationNo: string;
  consultationDate: string;
  stepCompleted: number;
  status: string;
  patientId?: string;
  patient: PatientInfo;
  typeOfVisit?: string | null;
  gravidity?: number | null;
  parity?: number | null;
  lmp?: string | null;
  aog?: string | null;
  height?: string | null;
  weight?: string | null;
  bmi?: string | null;
  subjectiveSymptoms?: string | null;
  chiefComplaint?: string | null;
  objectiveVitals?: string | null;
  fetalHeartRate?: string | null;
  fundalHeight?: string | null;
  allergies?: string | null;
  medications?: string | null;
  physicalExam?: string | null;
  labResults?: string | null;
  notes?: string | null;
  icd10Diagnosis?: string | null;
  nandaDiagnosis?: string | null;
  nandaCode?: string | null;
  nandaName?: string | null;
  riskLevel?: string;
  preventionLevel?: string | null;
  aiSuggestions?: string | null;
  selectedInterventions?: string | null;
  evaluationStatus?: string | null;
  evaluationNotes?: string | null;
  interventionEvaluations?: string | null;
  referralType?: string | null;
  referralPriority?: string | null;
  referralFacility?: string | null;
  referralSummary?: string | null;
  referralStatus?: string;
  healthHistory?: string | null;
  healthHistoryRefCode?: string | null;
  nandaRelatedTo?: string | null;
  icd10AdditionalNotes?: string | null;
}

interface AISuggestion {
  interventions: Array<{
    code?: string | number;
    name: string;
    description: string;
    category: string;
    relatedNanda?: string;
    relatedNoc?: string;
    priority?: string;
  }>;
  priorityIntervention: string;
  priorityCode?: number;
  rationale: string;
  preventionLevel: string;
  riskIndicators?: string[];
  nursingConsiderations?: string[];
  referralNeeded?: boolean;
  referralReason?: string;
  followUpSchedule?: string;
  rawResponse?: string;
}

interface VitalsForm {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  weight: string;
  respiratoryRate: string;
  oxygenSat: string;
  painScale: string;
  height: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STEP_META = [
  { label: 'Assessment', shortLabel: 'Assess', icon: ClipboardList },
  { label: 'Health History', shortLabel: 'History', icon: FileHeart },
  { label: 'Findings', shortLabel: 'Findings', icon: Search },
  { label: 'Diagnosis', shortLabel: 'Dx', icon: Stethoscope },
  { label: 'AI Summary', shortLabel: 'AI', icon: Sparkles },
  { label: 'Care Plan', shortLabel: 'Plan', icon: UserCheck },
  { label: 'Referral', shortLabel: 'Refer', icon: FileOutput },
] as const;

const STEP_BORDER_COLORS: Record<number, string> = {
  0: 'border-l-rose-400',
  1: 'border-l-teal-400',
  2: 'border-l-rose-400',
  3: 'border-l-purple-400',
  4: 'border-l-rose-500',
  5: 'border-l-blue-400',
  6: 'border-l-amber-400',
};

const TOTAL_STEPS = STEP_META.length;

const DEFAULT_VITALS: VitalsForm = {
  bloodPressure: '',
  heartRate: '',
  temperature: '',
  weight: '',
  respiratoryRate: '',
  oxygenSat: '',
  painScale: '',
  height: '',
};

const TYPE_OF_VISIT_OPTIONS = [
  'Routine Prenatal Check-up',
  'Follow-up',
  'Emergency Consultation',
  'Referral',
];

const REFERRAL_PRIORITY_OPTIONS = [
  { value: 'none', label: 'No referral', description: 'No referral needed' },
  { value: 'non_urgent', label: 'Non-urgent', description: 'Routine referral (24-72 hrs)' },
  { value: 'same_day', label: 'Same day referral', description: 'Referral within the day (≤6-12 hrs)' },
  { value: 'urgent', label: 'Urgent referral', description: 'Immediate referral (minutes to <1 hr)' },
  { value: 'emergency', label: 'Emergency referral', description: 'Life-threatening — activate emergency transport' },
];

const REFERRAL_TYPE_OPTIONS = [
  'Refer to Doctor',
  'Refer to Specialist',
  'Transfer to Hospital',
] as const;

// Code-to-color category maps
const NIC_CATEGORY_COLORS: Record<string, string> = {
  Physiological: '#22c55e',
  Psychosocial: '#3b82f6',
  Safety: '#ef4444',
  Educational: '#f59e0b',
};

const NOC_CATEGORY_COLORS: Record<string, string> = {
  physiological: '#22c55e',
  psychosocial: '#3b82f6',
  knowledge: '#f59e0b',
  safety: '#ef4444',
};

const NANDA_CATEGORY_COLORS: Record<string, string> = {
  physiological: '#22c55e',
  psychosocial: '#3b82f6',
  knowledge: '#f59e0b',
  safety: '#ef4444',
};

const ICD10_CATEGORY_COLORS: Record<string, string> = {
  hypertensive: '#ef4444',
  diabetes: '#f59e0b',
  anemia: '#8b5cf6',
  hemorrhage: '#dc2626',
  infection: '#06b6d4',
  labor: '#3b82f6',
  fetal: '#ec4899',
  other: '#6b7280',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseVitals(raw: string | null | undefined): VitalsForm {
  if (!raw) return { ...DEFAULT_VITALS };
  try { return { ...DEFAULT_VITALS, ...JSON.parse(raw) }; } catch { return { ...DEFAULT_VITALS }; }
}

function stringifyVitals(v: VitalsForm): string {
  return JSON.stringify(v);
}

function parseAI(raw: string | null | undefined): AISuggestion | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseSelectedInterventions(raw: string | null | undefined): Array<{ name: string; description?: string; code?: string }> {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

function resolveStartStep(backendStep: number): number {
  if (backendStep < 0) return 0;
  if (backendStep >= 6) return 6;
  return backendStep;
}

function preventionToRisk(level: string): string {
  switch (level) {
    case 'primary': return 'low';
    case 'secondary': return 'moderate';
    case 'tertiary': return 'high';
    default: return 'low';
  }
}

function riskToReferralUrgency(risk: string, emergencySigns: boolean = false): string {
  if (risk === 'high' && emergencySigns) return 'emergency';
  if (risk === 'high') return 'urgent';
  if (risk === 'moderate') return 'non_urgent';
  return 'none';
}

function riskToReferralType(risk: string): string {
  if (risk === 'high') return 'Transfer to Hospital';
  if (risk === 'moderate') return 'Refer to Specialist';
  return 'Refer to Doctor';
}

function riskLabel(risk: string): string {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDALONE SUB-COMPONENTS (defined OUTSIDE ConsultationView to avoid
// re-creation on every render, which causes character reversal bugs)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Icon constants as lazy factory (avoids module-level JSX TDZ in
// production builds where SWC/Terser may reorder initialization)
// ─────────────────────────────────────────────────────────────────────────
function getIcons() {
  return {
    bp: <Activity className="h-3.5 w-3.5 text-muted-foreground" />,
    pulse: <Heart className="h-3.5 w-3.5 text-muted-foreground" />,
    temp: <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />,
    resp: <Wind className="h-3.5 w-3.5 text-muted-foreground" />,
    o2: <Wind className="h-3.5 w-3.5 text-muted-foreground" />,
    pain: <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />,
    fhr: <Baby className="h-3.5 w-3.5 text-muted-foreground" />,
    fh: <Baby className="h-3.5 w-3.5 text-muted-foreground" />,
    weight: <Weight className="h-3.5 w-3.5 text-muted-foreground" />,
    height: <Activity className="h-3.5 w-3.5 text-muted-foreground" />,
  };
}

// Singleton cache — created once on first component mount, reused thereafter
let _cachedIcons: ReturnType<typeof getIcons> | null = null;
function getStableIcons() {
  if (!_cachedIcons) _cachedIcons = getIcons();
  return _cachedIcons;
}

const VitalInput = memo(function VitalInput({ id, label, icon, placeholder, value, colorClass, type = 'text', min, max, onChange, onDirty }: {
  id: string; label: string; icon: React.ReactNode; placeholder: string; value: string;
  colorClass?: string; type?: string; min?: number | string; max?: number | string;
  onChange: (v: string) => void; onDirty?: () => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isInternalChange = useRef(false);

  // Sync external value changes only (not from our own typing)
  useEffect(() => {
    if (!isInternalChange.current && value !== localValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: local state buffering to prevent character reversal
      setLocalValue(value);
    }
    isInternalChange.current = false;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    isInternalChange.current = true;
    setLocalValue(v);
    onChange(v);
    onDirty?.();
  }, [onChange, onDirty]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (max !== undefined) {
      const num = parseInt(e.target.value, 10);
      const maxVal = parseInt(String(max), 10);
      if (!isNaN(num) && !isNaN(maxVal) && num > maxVal) {
        const clamped = String(maxVal);
        isInternalChange.current = true;
        setLocalValue(clamped);
        onChange(clamped);
        onDirty?.();
      }
    }
  }, [max, onChange, onDirty]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">{icon} {label}</Label>
      <Input id={id} type={type} min={min} max={max} placeholder={placeholder} value={localValue}
        className={`${colorClass || ''} transition-colors duration-200`}
        onChange={handleChange}
        onBlur={handleBlur} />
    </div>
  );
});

const HealthInput = memo(function HealthInput({ id, label, placeholder, value, onChange, onDirty }: {
  id: string; label: string; placeholder: string; value: string;
  onChange: (v: string) => void; onDirty?: () => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (!isInternalChange.current && value !== localValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: local state buffering to prevent character reversal
      setLocalValue(value);
    }
    isInternalChange.current = false;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    isInternalChange.current = true;
    setLocalValue(v);
    onChange(v);
    onDirty?.();
  }, [onChange, onDirty]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} placeholder={placeholder} value={localValue}
        onChange={handleChange} />
    </div>
  );
});

const HealthTextarea = memo(function HealthTextarea({ id, label, placeholder, value, onChange, onDirty }: {
  id: string; label: string; placeholder: string; value: string;
  onChange: (v: string) => void; onDirty?: () => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (!isInternalChange.current && value !== localValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: local state buffering to prevent character reversal
      setLocalValue(value);
    }
    isInternalChange.current = false;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    isInternalChange.current = true;
    setLocalValue(v);
    onChange(v);
    onDirty?.();
  }, [onChange, onDirty]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Textarea id={id} placeholder={placeholder} className="min-h-[60px] resize-y"
        value={localValue} onChange={handleChange} />
    </div>
  );
});

function RiskBadgeCard({ label, value, colors }: {
  label: string; value: string;
  colors: { border: string; bg: string; text: string; icon: typeof CheckCircle2 };
}) {
  const Icon = colors.icon;
  return (
    <div className={`rounded-xl border-2 p-4 ${colors.border} ${colors.bg} flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
        <Icon className={`h-5 w-5 ${colors.text}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`font-semibold text-sm ${colors.text}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Toggle helper for checkbox arrays ─────────────────────────────────────

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ConsultationView() {
  const selectedConsultationId = useAppStore((s) => s.selectedConsultationId);
  const goBack = useAppStore((s) => s.goBack);
  const updateActivity = useAppStore((s) => s.updateActivity);
  const isOffline = useAppStore((s) => s.isOffline);
  const setPendingSyncCount = useAppStore((s) => s.setPendingSyncCount);

  // ── Track pending sync count ──
  useEffect(() => {
    const syncCount = () => setPendingSyncCount(getQueueLength());
    syncCount();
    const interval = setInterval(syncCount, 5000);
    return () => clearInterval(interval);
  }, [setPendingSyncCount]);

  // ── State ──
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── AI auto-trigger ref (defined early, used in both fetchConsultation and useEffect) ──
  const aiAutoTriggerRef = useRef(false);
  const [referralLoading, setReferralLoading] = useState(false);
  const [customIntervention, setCustomIntervention] = useState('');
  const [customNicCode, setCustomNicCode] = useState('');
  const [customNicName, setCustomNicName] = useState('');
  const isInitialized = useRef(false);

  // ── Form fields ──
  const [typeOfVisit, setTypeOfVisit] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [vitals, setVitals] = useState<VitalsForm>({ ...DEFAULT_VITALS });
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [fundalHeight, setFundalHeight] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [gravidity, setGravidity] = useState('');
  const [parity, setParity] = useState('');
  const [lmp, setLmp] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [labResults, setLabResults] = useState('');
  const [notes, setNotes] = useState('');
  const [icd10Diagnosis, setIcd10Diagnosis] = useState('');
  const [nandaDiagnosis, setNandaDiagnosis] = useState('');
  const [selectedNandaCodes, setSelectedNandaCodes] = useState<Array<{code: string, name: string}>>([]);
  const [selectedIcd10Codes, setSelectedIcd10Codes] = useState<Array<{code: string, name: string}>>([]);
  const [nandaRelatedTo, setNandaRelatedTo] = useState('');
  const [icd10AdditionalNotes, setIcd10AdditionalNotes] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null);
  const [selectedInterventions, setSelectedInterventions] = useState<Array<{ name: string; description?: string; code?: string }>>([]);
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [referralSummary, setReferralSummary] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [preventionLevel, setPreventionLevel] = useState('');
  const [referralPriority, setReferralPriority] = useState('');
  const [referralType, setReferralType] = useState('Refer to Doctor');
  const [referralFacility, setReferralFacility] = useState('');
  const [interventionEvals, setInterventionEvals] = useState<Array<{
    nicCode: string; status: string; nocOutcome: string; nocOutcomeCode: string; notes: string;
  }>>([]);

  // ── Health History state (structured: dropdowns + checkboxes) ──
  // Past Medical History
  const [pastMedicalSelected, setPastMedicalSelected] = useState<string[]>([]);
  const [pastMedicalOthersText, setPastMedicalOthersText] = useState('');
  // Previous Surgery
  const [previousSurgerySelected, setPreviousSurgerySelected] = useState<string[]>([]);
  const [previousSurgeryOthersText, setPreviousSurgeryOthersText] = useState('');
  // Trauma
  const [traumaValue, setTraumaValue] = useState('');
  const [traumaSpecify, setTraumaSpecify] = useState('');
  // Blood Transfusion
  const [bloodTransfusionValue, setBloodTransfusionValue] = useState('');
  const [bloodTransfusionSpecify, setBloodTransfusionSpecify] = useState('');
  // Family History
  const [familyHistoryDropdown, setFamilyHistoryDropdown] = useState('');
  const [familyHistorySelected, setFamilyHistorySelected] = useState<string[]>([]);
  const [familyHistoryOthersText, setFamilyHistoryOthersText] = useState('');
  // Smoking
  const [smokingValue, setSmokingValue] = useState('');
  const [smokingPackYears, setSmokingPackYears] = useState('');
  // Alcohol
  const [alcoholValue, setAlcoholValue] = useState('');
  const [alcoholDrinksPerDay, setAlcoholDrinksPerDay] = useState('');
  // Drug Use
  const [drugUseValue, setDrugUseValue] = useState('');
  const [drugUseSubstance, setDrugUseSubstance] = useState('');
  // Dietary Pattern
  const [dietaryPatternValue, setDietaryPatternValue] = useState('');
  const [dietaryPatternSpecify, setDietaryPatternSpecify] = useState('');
  // Physical Activity & Sleep
  const [hhPhysicalActivity, setHhPhysicalActivity] = useState('');
  const [hhSleepPattern, setHhSleepPattern] = useState('');
  // Search / load
  const [healthHistoryRefCode, setHealthHistoryRefCode] = useState('');
  const [pastDiagnoses, setPastDiagnoses] = useState<Array<{
    consultationNo: string;
    consultationDate: string;
    status: string;
    nurseName: string;
    icd10Diagnoses: Array<{ code: string; name: string }>;
    nandaDiagnoses: Array<{ code: string; name: string }>;
  }>>([]);

  // ── Computed values (declared before callbacks that reference them) ──
  const nandaSelectedCode = selectedNandaCodes.length > 0 ? selectedNandaCodes.map(c => c.code).join(', ') : '';
  const icd10SelectedCode = selectedIcd10Codes.length > 0 ? selectedIcd10Codes.map(c => c.code).join(', ') : '';

  // ── BMI Calculation ──
  const calculatedBMI = useMemo(() => {
    const w = parseFloat(vitals.weight);
    const h = parseFloat(vitals.height);
    if (isNaN(w) || isNaN(h) || h <= 0 || w <= 0) return null;
    const heightM = h / 100;
    const bmi = w / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
  }, [vitals.weight, vitals.height]);

  const bmiCategory = useMemo(() => {
    if (!calculatedBMI) return null;
    if (calculatedBMI < 18.5) return { label: 'Underweight', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' };
    if (calculatedBMI < 25) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' };
    if (calculatedBMI < 30) return { label: 'Overweight', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' };
    return { label: 'Obese', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20' };
  }, [calculatedBMI]);

  // ── AOG Calculation ──
  const consultationAOG = useMemo(() => {
    if (!lmp) return null;
    try {
      const lmpDate = new Date(lmp);
      const today = new Date();
      const totalDays = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
      if (totalDays < 0) return null;
      const weeks = Math.floor(totalDays / 7);
      const days = totalDays % 7;
      return `${weeks}w ${days}d`;
    } catch { return null; }
  }, [lmp]);

  // ── NANDA domain for NIC filtering (uses first selected code) ──
  const selectedNandaDomain = useMemo(() => {
    if (selectedNandaCodes.length === 0) return null;
    const firstCode = selectedNandaCodes[0].code;
    const found = NANDA_DIAGNOSES.find(d => d.code === firstCode);
    return found ? found.domain : null;
  }, [selectedNandaCodes]);

  const filteredNicOptions = useMemo(() => {
    const base = selectedNandaDomain ? getNicByDomain(selectedNandaDomain) : NIC_INTERVENTIONS;
    return base.map(n => ({
      code: n.code,
      name: n.name,
      description: n.description,
      category: n.category,
    }));
  }, [selectedNandaDomain]);

  // ── Code options for diagnosis step ──
  const nandaOptions: CodeOption[] = useMemo(() => NANDA_DIAGNOSES.map(d => ({ code: d.code, name: d.name, description: d.definition, category: d.category })), []);
  const icd10Options: CodeOption[] = useMemo(() => ICD10_MATERNAL_CODES.map(c => ({ code: c.code, name: c.name, description: c.description, category: c.category })), []);

  // ── Per-intervention eval update ──
  const updateInterventionEval = useCallback((index: number, field: 'status' | 'nocOutcome' | 'nocOutcomeCode' | 'notes', value: string) => {
    setInterventionEvals((prev) => {
      const updated = [...prev];
      if (!updated[index]) {
        const intervention = selectedInterventions[index];
        updated[index] = { nicCode: intervention?.code || '', status: '', nocOutcome: '', nocOutcomeCode: '', notes: '' };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    markDirty();
  }, [selectedInterventions]);

  // ── Dirty state ──
  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Stable onChange handlers for VitalInput (prevents character reversal) ──
  const handleVitalChange = useCallback((field: keyof VitalsForm, value: string) => {
    setVitals(prev => ({ ...prev, [field]: value }));
  }, []);
  const handleOxygenSatChange = useCallback((v: string) => {
    let clamped = v.replace(/[^0-9]/g, '');
    const num = parseInt(clamped, 10);
    if (!isNaN(num) && num > 100) clamped = '100';
    setVitals(prev => ({ ...prev, oxygenSat: clamped }));
  }, []);

  // ── Stable onChange handlers for Assessment step direct inputs ──
  const handleChiefComplaintChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChiefComplaint(e.target.value);
    markDirty();
  }, []);
  const handleAllergiesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAllergies(e.target.value);
    markDirty();
  }, []);
  const handleMedicationsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMedications(e.target.value);
    markDirty();
  }, []);
  const handleTypeOfVisitChange = useCallback((v: string) => {
    setTypeOfVisit(v);
    markDirty();
  }, []);
  const handleGravidityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setGravidity(isNaN(v) ? '' : String(Math.max(0, Math.min(20, v))));
    markDirty();
  }, []);
  const handleParityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setParity(isNaN(v) ? '' : String(Math.max(0, Math.min(20, v))));
    markDirty();
  }, []);
  // ── LMP: Display MM/DD/YYYY, Store YYYY-MM-DD ──
  const [lmpDisplay, setLmpDisplay] = useState('');
  const [prevLmpDisplayLen, setPrevLmpDisplayLen] = useState(0);

  // Convert YYYY-MM-DD (storage) → MM/DD/YYYY (display)
  const lmpStorageToDisplay = useCallback((stored: string): string => {
    if (!stored || !/^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored || '';
    const [y, m, d] = stored.split('-');
    return `${m}/${d}/${y}`;
  }, []);

  // Convert MM/DD/YYYY (display) → YYYY-MM-DD (storage)
  const lmpDisplayToStorage = useCallback((display: string): string => {
    const digits = display.replace(/[^\d]/g, '');
    if (digits.length < 8) return '';
    return `${digits.slice(4, 8)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
  }, []);

  const handleLmpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d/]/g, ''); // strip non-digit non-slash
    const digits = raw.replace(/\//g, '');
    if (digits.length > 8) return;

    // Auto-insert slashes
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += digits[i];
    }
    // Add trailing slash if user just typed 2nd or 4th digit
    if (digits.length === 2 || digits.length === 4) {
      if (raw.length === 2 || raw.length === 5) formatted += '/';
    }

    setLmpDisplay(formatted);
    setPrevLmpDisplayLen(formatted.length);

    // Update the stored lmp value (YYYY-MM-DD) for AOG calculation
    const stored = lmpDisplayToStorage(formatted);
    setLmp(stored);
    markDirty();
  }, [lmpDisplayToStorage]);

  const [lmpCalendarOpen, setLmpCalendarOpen] = useState(false);

  const handleLmpBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const digits = v.replace(/[^\d]/g, '');
    if (digits.length > 0 && digits.length < 8) {
      toast.error('Please enter a complete date: MM/DD/YYYY');
      return;
    }
    if (digits.length === 8) {
      // Validate month 01-12 and day 01-31
      const m = parseInt(digits.slice(0, 2), 10);
      const d = parseInt(digits.slice(2, 4), 10);
      const y = parseInt(digits.slice(4, 8), 10);
      if (m < 1 || m > 12) {
        toast.error('Invalid month. Please enter 01-12.');
        return;
      }
      if (d < 1 || d > 31) {
        toast.error('Invalid day. Please enter 01-31.');
        return;
      }
      if (y < 1900) {
        toast.error('Invalid year. Please enter a valid year.');
        return;
      }
      // ── Future date restriction ──
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const enteredDate = new Date(y, m - 1, d, 23, 59, 59);
      if (enteredDate > today) {
        toast.error('LMP cannot be a future date. Please enter a date on or before today.');
        setLmpDisplay('');
        setLmp('');
        markDirty();
        return;
      }
    }
  }, []);

  const handleLmpKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace to delete the slash along with the preceding digit
    if (e.key === 'Backspace' && lmpDisplay.length > 0) {
      const pos = (e.target as HTMLInputElement).selectionStart || lmpDisplay.length;
      // If cursor is right after a slash, move back one more position
      if (pos > 0 && lmpDisplay[pos - 1] === '/' && pos === lmpDisplay.length) {
        // Let the native backspace handle it, but we'll clean up in onChange
      }
    }
    // Allow: digits, slash, Backspace, Delete, Tab, Arrow keys, Home, End
    if (!/^[\d/]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }
  }, [lmpDisplay]);

  // Parse lmp (YYYY-MM-DD) → Date for calendar
  const lmpAsDate = useMemo((): Date | undefined => {
    if (!lmp) return undefined;
    const parsed = new Date(lmp + 'T00:00:00');
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [lmp]);

  // Calendar select handler
  const handleLmpCalendarSelect = useCallback((date: Date | undefined) => {
    if (!date) return;
    setLmpCalendarOpen(false);
    const display = format(date, 'MM/dd/yyyy');
    const stored = format(date, 'yyyy-MM-dd');
    setLmpDisplay(display);
    setLmp(stored);
    markDirty();
  }, []);

  const handleFetalHeartRateChange = useCallback((v: string) => {
    setFetalHeartRate(v);
  }, []);
  const handleFundalHeightChange = useCallback((v: string) => {
    setFundalHeight(v);
  }, []);

  // ── Stable onChange handlers for Findings step ──
  const handlePhysicalExamChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPhysicalExam(e.target.value); markDirty();
  }, []);
  const handleLabResultsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLabResults(e.target.value); markDirty();
  }, []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value); markDirty();
  }, []);

  // ── Stable onChange handlers for Diagnosis step ──
  const handleNandaRelatedToChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNandaRelatedTo(e.target.value); markDirty();
  }, []);
  const handleIcd10AdditionalNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIcd10AdditionalNotes(e.target.value); markDirty();
  }, []);

  // ── Stable onChange handlers for Care Plan step ──
  const handleEvaluationNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEvaluationNotes(e.target.value); markDirty();
  }, []);

  // ── Stable onChange handlers for Referral step ──
  const handleReferralFacilityChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReferralFacility(e.target.value); markDirty();
  }, []);

  // ── Stable onChange handlers for Health History step ──

  const handlePastMedicalOthersChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPastMedicalOthersText(e.target.value); markDirty();
  }, []);
  const handlePreviousSurgeryOthersChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPreviousSurgeryOthersText(e.target.value); markDirty();
  }, []);
  const handleTraumaSpecifyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTraumaSpecify(e.target.value); markDirty();
  }, []);
  const handleBloodTransfusionSpecifyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBloodTransfusionSpecify(e.target.value); markDirty();
  }, []);
  const handleFamilyHistoryOthersChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFamilyHistoryOthersText(e.target.value); markDirty();
  }, []);
  const handleSmokingPackYearsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSmokingPackYears(e.target.value); markDirty();
  }, []);
  const handleAlcoholDrinksPerDayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAlcoholDrinksPerDay(e.target.value); markDirty();
  }, []);
  const handleDrugUseSubstanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDrugUseSubstance(e.target.value); markDirty();
  }, []);
  const handleDietaryPatternSpecifyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDietaryPatternSpecify(e.target.value); markDirty();
  }, []);

  // ── Stable onChange handlers for custom intervention inputs ──
  const handleCustomInterventionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomIntervention(e.target.value);
    if (e.target.value) { setCustomNicCode(''); setCustomNicName(''); }
  }, []);
  const handleCustomNicCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomNicCode(e.target.value);
  }, []);
  const handleCustomNicNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomNicName(e.target.value);
  }, []);

  // ── Stable field-specific onChange handlers for VitalInput ──
  const handleBloodPressureChange = useCallback((v: string) => { handleVitalChange('bloodPressure', v); }, [handleVitalChange]);
  const handleHeartRateChange = useCallback((v: string) => { handleVitalChange('heartRate', v); }, [handleVitalChange]);
  const handleTemperatureChange = useCallback((v: string) => { handleVitalChange('temperature', v); }, [handleVitalChange]);
  const handleRespiratoryRateChange = useCallback((v: string) => { handleVitalChange('respiratoryRate', v); }, [handleVitalChange]);
  const handlePainScaleChange = useCallback((v: string) => { handleVitalChange('painScale', v); }, [handleVitalChange]);
  const handleWeightChange = useCallback((v: string) => { handleVitalChange('weight', v); }, [handleVitalChange]);
  const handleHeightChange = useCallback((v: string) => { handleVitalChange('height', v); }, [handleVitalChange]);

  // ── Fetch consultation ──
  useEffect(() => {
    if (!selectedConsultationId) { setLoading(false); return; }
    // Reset past diagnoses when switching consultations to avoid stale data
    setPastDiagnoses([]);
    async function fetchConsultation() {
      try {
        const res = await fetch(`/api/consultations/${selectedConsultationId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        console.log('[PastDiagnoses] Consultation loaded:', data.consultationNo, 'patient:', data.patient?.id);
        setConsultation(data);
        setChiefComplaint(data.chiefComplaint || data.subjectiveSymptoms || '');
        setVitals(parseVitals(data.objectiveVitals));
        setFetalHeartRate(data.fetalHeartRate || '');
        setFundalHeight(data.fundalHeight || '');
        setAllergies(data.allergies || '');
        setMedications(data.medications || '');
        setPhysicalExam(data.physicalExam || '');
        setLabResults(data.labResults || '');
        setNotes(data.notes || '');
        setIcd10Diagnosis(data.icd10Diagnosis || '');
        setNandaDiagnosis(data.nandaDiagnosis || '');
        // Parse NANDA codes — backward compatible: JSON array or old single-string format
        if (data.nandaDiagnosis) {
          try {
            const parsed = JSON.parse(data.nandaDiagnosis);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
              setSelectedNandaCodes(parsed.map((c: {code: string, name: string}) => ({ code: c.code, name: c.name })));
            } else {
              // Old single-string format like "00089 — Diagnosis Name"
              const match = data.nandaDiagnosis.match(/^(\d{5})\s*[—\-]\s*(.+)$/);
              if (match) setSelectedNandaCodes([{ code: match[1], name: match[2].trim() }]);
            }
          } catch {
            // Not JSON, try old format
            const match = data.nandaDiagnosis.match(/^(\d{5})\s*[—\-]\s*(.+)$/);
            if (match) setSelectedNandaCodes([{ code: match[1], name: match[2].trim() }]);
          }
        }
        // Parse ICD-10 codes — backward compatible
        if (data.icd10Diagnosis) {
          try {
            const parsed = JSON.parse(data.icd10Diagnosis);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
              setSelectedIcd10Codes(parsed.map((c: {code: string, name: string}) => ({ code: c.code, name: c.name })));
            } else {
              const match = data.icd10Diagnosis.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*\((.+)\)$/);
              if (match) setSelectedIcd10Codes([{ code: match[1], name: match[2].trim() }]);
            }
          } catch {
            const match = data.icd10Diagnosis.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*\((.+)\)$/);
            if (match) setSelectedIcd10Codes([{ code: match[1], name: match[2].trim() }]);
          }
        }
        setNandaRelatedTo(data.nandaRelatedTo || data.nandaName || '');
        setIcd10AdditionalNotes(data.icd10AdditionalNotes || '');
        setRiskLevel(data.riskLevel || '');
        setAiSuggestions(parseAI(data.aiSuggestions));
        setSelectedInterventions(parseSelectedInterventions(data.selectedInterventions));
        setEvaluationNotes(data.evaluationNotes || '');
        setReferralSummary(data.referralSummary || '');
        setTypeOfVisit(data.typeOfVisit || '');
        setGravidity(data.gravidity != null ? String(data.gravidity) : '');
        setParity(data.parity != null ? String(data.parity) : '');
        setLmp(data.lmp ? (typeof data.lmp === 'string' ? data.lmp.slice(0, 10) : new Date(data.lmp).toISOString().slice(0, 10)) : '');
        setLmpDisplay(data.lmp ? lmpStorageToDisplay(typeof data.lmp === 'string' ? data.lmp.slice(0, 10) : new Date(data.lmp).toISOString().slice(0, 10)) : '');
        if (data.height) setVitals(v => ({ ...v, height: data.height }));
        if (data.weight) setVitals(v => ({ ...v, weight: data.weight }));
        setPreventionLevel(data.preventionLevel || '');
        setReferralPriority(data.referralPriority || '');
        setReferralType(data.referralType || 'Refer to Doctor');
        setReferralFacility(data.referralFacility || '');
        if (data.interventionEvaluations) {
          try { setInterventionEvals(JSON.parse(data.interventionEvaluations)); } catch { setInterventionEvals([]); }
        }
        // Parse health history — backward compatible with old flat-string format
        if (data.healthHistory) {
          const parsed = parseHealthHistory(data.healthHistory);
          if (parsed) {
            // Structured format
            setPastMedicalSelected(parsed.pastMedicalHistory.selected);
            setPastMedicalOthersText(parsed.pastMedicalHistory.othersText);
            setPreviousSurgerySelected(parsed.previousSurgery.selected);
            setPreviousSurgeryOthersText(parsed.previousSurgery.othersText);
            setTraumaValue(parsed.historyOfTrauma.value);
            setTraumaSpecify(parsed.historyOfTrauma.specify);
            setBloodTransfusionValue(parsed.historyOfBloodTransfusion.value);
            setBloodTransfusionSpecify(parsed.historyOfBloodTransfusion.specify);
            setFamilyHistoryDropdown(parsed.familyHistory.value);
            setFamilyHistorySelected(parsed.familyHistory.selected);
            setFamilyHistoryOthersText(parsed.familyHistory.othersText);
            setSmokingValue(parsed.smoking.value);
            setSmokingPackYears(parsed.smoking.packYears);
            setAlcoholValue(parsed.alcoholIntake.value);
            setAlcoholDrinksPerDay(parsed.alcoholIntake.drinksPerDay);
            setDrugUseValue(parsed.drugUse.value);
            setDrugUseSubstance(parsed.drugUse.substance);
            setDietaryPatternValue(parsed.dietaryPattern.value);
            setDietaryPatternSpecify(parsed.dietaryPattern.specify);
            setHhPhysicalActivity(parsed.physicalActivity);
            setHhSleepPattern(parsed.sleepPattern);
          } else {
            // Old flat-string format — keep as empty (can't reliably map free text to dropdowns)
            // The old data is still stored and will be available via parseHealthHistory returning null
          }
        }
        setHealthHistoryRefCode(data.healthHistoryRefCode || '');
        const startStep = resolveStartStep(data.stepCompleted);
        setCurrentStep(startStep);
        isInitialized.current = true;
        // Auto-trigger AI if resuming at step 4 with no existing AI suggestions
        if (startStep === 4 && !data.aiSuggestions && !aiAutoTriggerRef.current) {
          aiAutoTriggerRef.current = true;
          setTimeout(() => {
            handleAiSuggestRef.current();
          }, 800);
        }
      } catch (err) {
        console.error('Error fetching consultation:', err);
        toast.error('Failed to load consultation');
      } finally { setLoading(false); }
    }
    fetchConsultation();
  }, [selectedConsultationId]);

  // ── Fetch past consultations' diagnoses (separate useEffect for robustness) ──
  // This runs independently from the consultation fetch so that:
  // 1. A failure in consultation fetch doesn't prevent past diagnoses from loading on retry
  // 2. React Strict Mode double-mount is handled via AbortController cleanup
  // 3. If consultation.patient.id is missing, we fall back to consultation.patientId (foreign key)
  useEffect(() => {
    if (!consultation) return;

    const patientId = consultation.patient?.id || consultation.patientId;
    if (!patientId) {
      console.warn('[PastDiagnoses] No patientId available on consultation:', consultation.id);
      return;
    }

    const controller = new AbortController();

    async function fetchPastDiagnoses() {
      try {
        console.log('[PastDiagnoses] Fetching past diagnoses for patient:', patientId, 'current consultation:', consultation.id);
        const res = await fetch(`/api/patients/${patientId}`, { signal: controller.signal });
        if (!res.ok) {
          console.warn('[PastDiagnoses] Patient API returned non-OK status:', res.status);
          return;
        }
        const data = await res.json();
        console.log('[PastDiagnoses] Patient data success:', data.success, 'consultations:', data.data?.consultations?.length);

        if (data.success && data.data?.consultations) {
          const currentConsultationId = consultation.id;
          // Include ANY consultation with diagnoses (not just completed — many are in_progress with data)
          const pastConsultations = data.data.consultations
            .filter((c: Record<string, unknown>) =>
              c.id !== currentConsultationId &&
              (c.icd10Diagnosis || c.nandaDiagnosis || c.nandaCode || c.nandaName)
            );
          console.log('[PastDiagnoses] Past consultations with diagnoses:', pastConsultations.length);

          const diagnoses: typeof pastDiagnoses = pastConsultations.map((c: Record<string, unknown>) => {
            let icd10Parsed: Array<{ code: string; name: string }> = [];
            let nandaParsed: Array<{ code: string; name: string }> = [];

            // Parse ICD-10: handle both pre-parsed objects and JSON strings
            const icd10Raw = c.icd10Diagnosis;
            if (icd10Raw) {
              try {
                const parsed = typeof icd10Raw === 'string' ? JSON.parse(icd10Raw) : icd10Raw;
                if (Array.isArray(parsed) && parsed[0]?.code) {
                  icd10Parsed = parsed;
                }
              } catch { /* not parseable as JSON — try old string format below */ }
              // Fallback: old string format "O14.0 (Mild to moderate pre-eclampsia)"
              if (icd10Parsed.length === 0) {
                const match = String(icd10Raw).match(/^([A-Z]\d{2}(?:\.\d+)?)\s*\((.+)\)$/);
                if (match) {
                  icd10Parsed = [{ code: match[1], name: match[2].trim() }];
                }
              }
            }

            // Parse NANDA: handle both pre-parsed objects and JSON strings
            const nandaRaw = c.nandaDiagnosis;
            if (nandaRaw) {
              try {
                const parsed = typeof nandaRaw === 'string' ? JSON.parse(nandaRaw) : nandaRaw;
                if (Array.isArray(parsed) && parsed[0]?.code) {
                  nandaParsed = parsed;
                }
              } catch { /* not parseable as JSON — try old formats below */ }
              // Fallback: old string format "00276 — Ineffective Health Self-Management"
              if (nandaParsed.length === 0) {
                const match = String(nandaRaw).match(/^(\d{5})\s*[—\-]\s*(.+)$/);
                if (match) {
                  nandaParsed = [{ code: match[1], name: match[2].trim() }];
                }
              }
            }

            // Last fallback: use nandaCode + nandaName fields (comma-separated codes, semicolon-separated names)
            if (nandaParsed.length === 0 && (c.nandaCode || c.nandaName)) {
              const codes = String(c.nandaCode || '').split(',').map((s: string) => s.trim()).filter(Boolean);
              const names = String(c.nandaName || '').split(';').map((s: string) => s.trim()).filter(Boolean);
              nandaParsed = codes.map((code: string, i: number) => ({
                code,
                name: names[i] || 'Unknown',
              }));
            }

            return {
              consultationNo: (c.consultationNo as string) || 'N/A',
              consultationDate: (c.consultationDate as string) || (c.createdAt as string) || '',
              status: (c.status as string) || 'in_progress',
              nurseName: (c.nurseName as string) || 'Recorded',
              icd10Diagnoses: icd10Parsed,
              nandaDiagnoses: nandaParsed,
            };
          });

          console.log('[PastDiagnoses] Parsed diagnoses:', diagnoses.map(d => ({
            no: d.consultationNo,
            status: d.status,
            icd: d.icd10Diagnoses.length,
            nanda: d.nandaDiagnoses.length,
          })));
          setPastDiagnoses(diagnoses);
        } else {
          console.warn('[PastDiagnoses] Patient API did not return expected format:', data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Fetch was aborted due to cleanup (consultation changed or unmounted) — expected
          return;
        }
        console.error('[PastDiagnoses] Failed to load past diagnoses:', err);
      }
    }

    fetchPastDiagnoses();

    return () => {
      controller.abort();
    };
  }, [consultation]);

  // ── handleAiSuggestRef (defined early to avoid TDZ with useEffect below) ──
  const handleAiSuggestRef = useRef<() => Promise<void>>(async () => {});

  // ── Save payload builder (defined early to avoid TDZ with useEffect below) ──
  const buildSavePayload = useCallback(
    (step: number): Record<string, unknown> => {
      const payload: Record<string, unknown> = {};
      switch (step) {
        case 0: // Assessment
          if (typeOfVisit) payload.typeOfVisit = typeOfVisit;
          if (chiefComplaint) { payload.chiefComplaint = chiefComplaint; payload.subjectiveSymptoms = chiefComplaint; }
          payload.objectiveVitals = stringifyVitals(vitals);
          if (fetalHeartRate) payload.fetalHeartRate = fetalHeartRate;
          if (fundalHeight) payload.fundalHeight = fundalHeight;
          if (allergies) payload.allergies = allergies;
          if (medications) payload.medications = medications;
          if (gravidity) payload.gravidity = parseInt(gravidity, 10) || 0;
          if (parity) payload.parity = parseInt(parity, 10) || 0;
          if (lmp) payload.lmp = lmp;
          if (vitals.height) payload.height = vitals.height;
          if (vitals.weight) payload.weight = vitals.weight;
          if (calculatedBMI) payload.bmi = String(calculatedBMI);
          if (consultationAOG) payload.aog = consultationAOG;
          break;
        case 1: // Health History
          payload.healthHistory = JSON.stringify({
            pastMedicalHistory: {
              selected: pastMedicalSelected.filter(i => i !== 'Others (specify)'),
              othersText: pastMedicalSelected.includes('Others (specify)') ? pastMedicalOthersText : '',
            },
            previousSurgery: {
              selected: previousSurgerySelected.filter(i => i !== 'Others (specify)'),
              othersText: previousSurgerySelected.includes('Others (specify)') ? previousSurgeryOthersText : '',
            },
            historyOfTrauma: { value: traumaValue, specify: traumaValue === 'yes' ? traumaSpecify : '' },
            historyOfBloodTransfusion: { value: bloodTransfusionValue, specify: bloodTransfusionValue === 'yes' ? bloodTransfusionSpecify : '' },
            familyHistory: {
              value: familyHistoryDropdown,
              selected: familyHistoryDropdown === 'present' ? familyHistorySelected.filter(i => i !== 'Others (specify)') : [],
              othersText: familyHistoryDropdown === 'present' && familyHistorySelected.includes('Others (specify)') ? familyHistoryOthersText : '',
            },
            smoking: { value: smokingValue, packYears: (smokingValue === 'former' || smokingValue === 'current') ? smokingPackYears : '' },
            alcoholIntake: { value: alcoholValue, drinksPerDay: (alcoholValue === 'occasional' || alcoholValue === 'regular') ? alcoholDrinksPerDay : '' },
            drugUse: { value: drugUseValue, substance: (drugUseValue === 'past' || drugUseValue === 'current') ? drugUseSubstance : '' },
            dietaryPattern: { value: dietaryPatternValue, specify: dietaryPatternValue === 'special' ? dietaryPatternSpecify : '' },
            physicalActivity: hhPhysicalActivity,
            sleepPattern: hhSleepPattern,
          });
          if (healthHistoryRefCode) payload.healthHistoryRefCode = healthHistoryRefCode;
          break;
        case 2: // Additional Findings
          if (physicalExam) payload.physicalExam = physicalExam;
          if (labResults) payload.labResults = labResults;
          if (notes) payload.notes = notes;
          break;
        case 3: // Diagnosis
          if (selectedNandaCodes.length > 0) {
            payload.nandaDiagnosis = JSON.stringify(selectedNandaCodes);
            payload.nandaCode = selectedNandaCodes.map(c => c.code).join(', ');
            payload.nandaName = selectedNandaCodes.map(c => c.name).join('; ');
          }
          if (selectedIcd10Codes.length > 0) {
            payload.icd10Diagnosis = JSON.stringify(selectedIcd10Codes);
          }
          if (nandaRelatedTo) payload.nandaRelatedTo = nandaRelatedTo;
          if (icd10AdditionalNotes) payload.icd10AdditionalNotes = icd10AdditionalNotes;
          break;
        case 4: // AI Summary
          if (riskLevel) payload.riskLevel = riskLevel;
          if (preventionLevel) payload.preventionLevel = preventionLevel;
          // aiSuggestions saved by the AI endpoint
          break;
        case 5: // Care Plan
          payload.selectedInterventions = JSON.stringify(selectedInterventions);
          if (interventionEvals.length > 0) payload.interventionEvaluations = JSON.stringify(interventionEvals);
          if (evaluationNotes) payload.evaluationNotes = evaluationNotes;
          break;
        case 6: // Referral
          payload.referralType = referralType;
          if (referralPriority) payload.referralPriority = referralPriority;
          if (referralFacility) payload.referralFacility = referralFacility;
          // referralSummary saved by the referral endpoint
          break;
      }
      return payload;
    },
    [typeOfVisit, chiefComplaint, vitals, fetalHeartRate, fundalHeight, allergies, medications,
      gravidity, parity, lmp, calculatedBMI, consultationAOG,
      pastMedicalSelected, pastMedicalOthersText, previousSurgerySelected, previousSurgeryOthersText,
      traumaValue, traumaSpecify, bloodTransfusionValue, bloodTransfusionSpecify,
      familyHistoryDropdown, familyHistorySelected, familyHistoryOthersText,
      smokingValue, smokingPackYears, alcoholValue, alcoholDrinksPerDay,
      drugUseValue, drugUseSubstance, dietaryPatternValue, dietaryPatternSpecify,
      hhPhysicalActivity, hhSleepPattern, healthHistoryRefCode,
      physicalExam, labResults, notes, selectedNandaCodes, selectedIcd10Codes,
      nandaRelatedTo, icd10AdditionalNotes,
      riskLevel, preventionLevel, selectedInterventions, interventionEvals, evaluationNotes,
      referralPriority, referralType, referralFacility,
    ]
  );

  const saveStep = useCallback(async (step: number): Promise<boolean> => {
    if (!selectedConsultationId) return false;
    const payload = buildSavePayload(step);
    if (Object.keys(payload).length === 0) return true;
    setSaving(true);
    try {
      const res = await fetch(`/api/consultations/${selectedConsultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setConsultation(updated);
      toast.success('Progress saved');
      updateActivity();
      return true;
    } catch {
      // Offline — enqueue the action for later sync
      enqueue('update-consultation', `/api/consultations/${selectedConsultationId}`, 'PUT', payload);
      toast.warning('Saved locally — will sync when online');
      return true; // Return true so navigation isn't blocked
    } finally { setSaving(false); }
  }, [selectedConsultationId, buildSavePayload, updateActivity]);

  // ── Silent save (no toast) for auto-save ──
  const saveCurrentStepSilent = useCallback(async () => {
    if (!selectedConsultationId) return;
    const payload = buildSavePayload(currentStep);
    if (Object.keys(payload).length === 0) return;
    try {
      await fetch(`/api/consultations/${selectedConsultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch { /* silent */ }
  }, [selectedConsultationId, buildSavePayload, currentStep]);

  // ── Auto-save: keep saveRef in sync with latest saveCurrentStepSilent ──
  const saveRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    saveRef.current = saveCurrentStepSilent;
  }); // intentionally no deps — always update ref with latest function

  // ── Auto-save on unmount ──
  useEffect(() => {
    return () => {
      if (isInitialized.current && selectedConsultationId) saveRef.current();
    };
  }, []);

  // ── Auto-trigger AI when navigating TO step 4 (covers forward navigation) ──
  // Note: Resume-from-pause is handled directly in fetchConsultation below
  useEffect(() => {
    if (currentStep === 4 && !aiSuggestions && !aiLoading && !aiError && !aiAutoTriggerRef.current) {
      aiAutoTriggerRef.current = true;
      const timer = setTimeout(() => {
        handleAiSuggestRef.current();
      }, 600);
      return () => clearTimeout(timer);
    }
    // Reset only when navigating AWAY from step 4
    if (currentStep !== 4) aiAutoTriggerRef.current = false;
  }, [currentStep]);

  // ── Navigation ──
  const goToStep = useCallback(async (targetStep: number) => {
    await saveStep(currentStep);
    setCurrentStep(targetStep);
    updateActivity();
  }, [currentStep, saveStep, updateActivity]);

  const handleNext = useCallback(async () => {
    // Run step-level validation before navigating
    const formData: Record<string, unknown> = {
      typeOfVisit,
      chiefComplaint,
      selectedNandaCodesCount: selectedNandaCodes.length,
      aiSuggestions,
      aiError,
      selectedInterventions,
      referralPriority,
    };
    const validationError = validateStep(currentStep, formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (currentStep < TOTAL_STEPS - 1) await goToStep(currentStep + 1);
  }, [currentStep, goToStep, typeOfVisit, chiefComplaint, selectedNandaCodes, aiSuggestions, aiError, selectedInterventions, referralPriority]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const handleExitWizard = useCallback(async () => {
    setShowExitDialog(false);
    await saveCurrentStepSilent();
    setIsDirty(false);
    goBack();
  }, [goBack, saveCurrentStepSilent]);

  const handleBackClick = useCallback(() => {
    if (currentStep === 0 && isDirty) setShowExitDialog(true);
    else if (currentStep > 0) goToStep(currentStep - 1);
    else goBack();
  }, [currentStep, isDirty, goToStep, goBack]);

  const handleComplete = useCallback(() => {
    setShowCompleteDialog(true);
  }, []);

  const confirmComplete = useCallback(async () => {
    setShowCompleteDialog(false);
    const success = await saveStep(currentStep);
    if (success) {
      toast.success('Consultation completed!');
    }
    goBack();
  }, [currentStep, saveStep, goBack]);

  // ── AI Suggest ──
  const handleAiSuggest = useCallback(async () => {
    handleAiSuggestRef.current = handleAiSuggest;
    if (!selectedConsultationId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      // Save assessment data first so AI has latest data
      await saveStep(currentStep);
      const res = await fetch(`/api/consultations/${selectedConsultationId}/ai-suggest`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || data.details || 'AI suggestion failed');
        throw new Error(data.error || 'AI suggestion failed');
      }
      setAiSuggestions(data.aiSuggestions);
      // Derive risk level from prevention level
      if (data.aiSuggestions?.preventionLevel) {
        const pl = data.aiSuggestions.preventionLevel;
        const newRisk = preventionToRisk(pl);
        setPreventionLevel(pl);
        setRiskLevel(newRisk);
        // Auto-set referral priority and type based on risk level
        const newUrgency = riskToReferralUrgency(newRisk);
        const newType = riskToReferralType(newRisk);
        setReferralPriority(prev => prev || newUrgency);
        setReferralType(newType);
        // Save risk level and prevention level
        try {
          await fetch(`/api/consultations/${selectedConsultationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              riskLevel: newRisk,
              preventionLevel: pl,
            }),
          });
        } catch { /* non-critical */ }
      }
      toast.success('AI summary generated');
      updateActivity();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI summary';
      // Check if offline — use AI fallback engine
      const isOfflineNow = !navigator.onLine;
      if (isOfflineNow) {
        try {
          // Build assessment data for fallback engine
          const assessmentData = {
            subjectiveSymptoms: chiefComplaint,
            objectiveVitals: stringifyVitals(vitals),
            fetalHeartRate: fetalHeartRate || undefined,
            labResults: labResults || undefined,
            physicalExam: physicalExam || undefined,
            icd10Diagnosis: icd10SelectedCode || undefined,
            nandaDiagnosis: nandaSelectedCode || undefined,
            clinicalContext: {
              riskLevel: riskLevel || undefined,
              aog: consultationAOG || undefined,
              age: consultation?.patient?.age || undefined,
              bmi: calculatedBMI ? parseFloat(calculatedBMI) : undefined,
              smoking: smokingValue || undefined,
              alcohol: alcoholValue || undefined,
              drugUse: drugUseValue || undefined,
            },
          };
          const fallbackResult = generateFallbackSuggestions(assessmentData);
          // Map fallback result to AISuggestion format
          const mappedSuggestions: AISuggestion = {
            interventions: fallbackResult.interventions.map(i => ({
              code: i.code,
              name: i.name,
              description: i.description,
              category: i.category,
              relatedNanda: i.relatedNanda,
              relatedNoc: i.relatedNoc,
              priority: i.priority,
            })),
            priorityIntervention: fallbackResult.priorityIntervention,
            priorityCode: fallbackResult.priorityCode,
            rationale: fallbackResult.rationale,
            preventionLevel: fallbackResult.preventionLevel,
            riskIndicators: fallbackResult.riskIndicators,
            nursingConsiderations: fallbackResult.nursingConsiderations,
            referralNeeded: fallbackResult.referralNeeded,
            referralReason: fallbackResult.referralReason,
            followUpSchedule: fallbackResult.followUpSchedule,
            rawResponse: '[Generated in offline mode using evidence-based nursing guidelines]',
          };
          setAiSuggestions(mappedSuggestions);
          if (fallbackResult.preventionLevel) {
            const pl = fallbackResult.preventionLevel;
            const newRisk = preventionToRisk(pl);
            setPreventionLevel(pl);
            setRiskLevel(newRisk);
            // Auto-set referral priority and type based on risk level
            const newUrgency = riskToReferralUrgency(newRisk);
            const newType = riskToReferralType(newRisk);
            setReferralPriority(prev => prev || newUrgency);
            setReferralType(newType);
            // Apply fallback-specific urgency if available
            const fbAny = fallbackResult as any;
            if (fbAny.referralUrgency) setReferralPriority(prev => prev || fbAny.referralUrgency);
            if (fbAny.referralType) setReferralType(fbAny.referralType);
          }
          toast.success('AI summary generated (offline mode)', {
            description: 'Suggestions generated using local clinical guidelines. Will update when back online.',
            duration: 5000,
          });
          // Cache the fallback suggestions
          setCache(`consultation-ai-${selectedConsultationId}`, mappedSuggestions);
        } catch {
          setAiError('Offline AI generation failed. Please try again when online.');
          toast.error('Unable to generate suggestions offline', { duration: 5000 });
        }
      } else {
        setAiError(msg);
        toast.error(msg, { duration: 5000 });
      }
    } finally { setAiLoading(false); }
  }, [selectedConsultationId, updateActivity, aiError, saveStep, currentStep, chiefComplaint, vitals, fetalHeartRate, labResults, physicalExam, icd10SelectedCode, nandaSelectedCode, riskLevel, consultationAOG, calculatedBMI, smokingValue, alcoholValue, drugUseValue]);

  // ── Generate Referral ──
  const handleGenerateReferral = useCallback(async () => {
    if (!selectedConsultationId) return;
    setReferralLoading(true);
    try {
      await saveStep(currentStep);
      const res = await fetch(`/api/consultations/${selectedConsultationId}/referral`, { method: 'POST' });
      if (!res.ok) throw new Error('Referral generation failed');
      const data = await res.json();
      setReferralSummary(data.referralSummary);
      toast.success('Referral generated');
      updateActivity();
    } catch { toast.error('Failed to generate referral'); }
    finally { setReferralLoading(false); }
  }, [selectedConsultationId, currentStep, saveStep, updateActivity]);

  // ── Intervention Management ──
  const toggleAiIntervention = useCallback((intervention: { name: string; description: string; code?: string | number }) => {
    setSelectedInterventions((prev) => {
      const exists = prev.some(i => i.name === intervention.name);
      if (exists) return prev.filter(i => i.name !== intervention.name);
      return [...prev, { name: intervention.name, description: intervention.description, code: intervention.code ? String(intervention.code) : undefined }];
    });
    markDirty();
  }, []);

  const addCustomInterventionWithCode = useCallback(() => {
    const trimmed = customIntervention.trim() || customNicName.trim();
    if (!trimmed) return;
    if (selectedInterventions.some(i => i.name === trimmed)) { toast.error('Already selected'); return; }
    setSelectedInterventions(prev => [...prev, { name: trimmed, description: '', code: customNicCode || undefined }]);
    setCustomIntervention('');
    setCustomNicCode('');
    setCustomNicName('');
  }, [customIntervention, customNicCode, customNicName, selectedInterventions]);

  const removeIntervention = useCallback((name: string) => {
    setSelectedInterventions(prev => prev.filter(i => i.name !== name));
    markDirty();
  }, []);

  const handleNicCodeSelect = useCallback((opt: CodeOption | null) => {
    if (opt) { setCustomNicCode(opt.code); setCustomNicName(opt.name); }
    else { setCustomNicCode(''); setCustomNicName(''); }
  }, []);

  // ── Clipboard & Download ──
  const handleCopyToClipboard = useCallback(async () => {
    if (!referralSummary) return;
    try { await navigator.clipboard.writeText(referralSummary); toast.success('Copied to clipboard'); }
    catch { toast.error('Failed to copy'); }
  }, [referralSummary]);

  const handleDownloadPdf = useCallback(async () => {
    if (!consultation) return;
    try {
      toast.loading('Generating comprehensive PDF...', { id: 'pdf-gen' });
      const blob = await generateReferralPdf({
        consultationNo: consultation.consultationNo,
        consultationDate: consultation.consultationDate,
        patientName: consultation.patient?.name || 'N/A',
        patientId: consultation.patient?.patientId || 'N/A',
        patientDateOfBirth: consultation.patient?.dateOfBirth,
        // Step 1: Assessment
        typeOfVisit: typeOfVisit || undefined,
        chiefComplaint: chiefComplaint || undefined,
        gravida: gravidity || undefined,
        para: parity || undefined,
        aog: consultationAOG || undefined,
        lmp: lmp || undefined,
        riskLevel: riskLevel || undefined,
        preventionLevel: preventionLevel || undefined,
        bloodPressure: vitals.bloodPressure || undefined,
        heartRate: vitals.heartRate || undefined,
        temperature: vitals.temperature || undefined,
        weight: vitals.weight || undefined,
        height: vitals.height || undefined,
        bmi: calculatedBMI ? String(calculatedBMI) : undefined,
        respiratoryRate: vitals.respiratoryRate || undefined,
        oxygenSat: vitals.oxygenSat || undefined,
        painScale: vitals.painScale || undefined,
        fetalHeartRate: fetalHeartRate || undefined,
        fundalHeight: fundalHeight || undefined,
        allergies: allergies || undefined,
        medications: medications || undefined,
        // Step 2: Health History (convert structured to flat strings for PDF)
        healthHistory: {
          pastMedicalHistory: pastMedicalSelected.length > 0 ? [...pastMedicalSelected.filter(i => i !== 'Others (specify)'), ...(pastMedicalSelected.includes('Others (specify)') && pastMedicalOthersText ? [pastMedicalOthersText] : [])].join(', ') : '',
          previousSurgery: previousSurgerySelected.length > 0 ? [...previousSurgerySelected.filter(i => i !== 'Others (specify)'), ...(previousSurgerySelected.includes('Others (specify)') && previousSurgeryOthersText ? [previousSurgeryOthersText] : [])].join(', ') : '',
          historyOfTrauma: traumaValue === 'yes' ? (traumaSpecify || 'Yes') : (traumaValue === 'no' ? 'No' : ''),
          historyOfBloodTransfusion: bloodTransfusionValue === 'yes' ? (bloodTransfusionSpecify || 'Yes') : (bloodTransfusionValue === 'no' ? 'No' : ''),
          familyHistoryPaternal: familyHistoryDropdown === 'present' ? [...familyHistorySelected.filter(i => i !== 'Others (specify)'), ...(familyHistorySelected.includes('Others (specify)') && familyHistoryOthersText ? [familyHistoryOthersText] : [])].join(', ') : familyHistoryDropdown ? familyHistoryDropdown.charAt(0).toUpperCase() + familyHistoryDropdown.slice(1) : '',
          familyHistoryMaternal: '',
          smokingHistory: smokingValue ? (smokingValue.charAt(0).toUpperCase() + smokingValue.slice(1)) + (smokingPackYears ? ` (${smokingPackYears} pack-yrs)` : '') : '',
          alcoholIntake: alcoholValue ? (alcoholValue.charAt(0).toUpperCase() + alcoholValue.slice(1)) + (alcoholDrinksPerDay ? ` (${alcoholDrinksPerDay}/day)` : '') : '',
          drugUse: drugUseValue ? (drugUseValue.charAt(0).toUpperCase() + drugUseValue.slice(1)) + (drugUseSubstance ? ` (${drugUseSubstance})` : '') : '',
          dietaryPattern: dietaryPatternValue ? (dietaryPatternValue.charAt(0).toUpperCase() + dietaryPatternValue.slice(1)) + (dietaryPatternSpecify ? ` — ${dietaryPatternSpecify}` : '') : '',
          physicalActivity: hhPhysicalActivity ? hhPhysicalActivity.charAt(0).toUpperCase() + hhPhysicalActivity.slice(1) : '',
          sleepPattern: hhSleepPattern || '',
          allergies: '',
          currentMedications: '',
          immunizationStatus: '',
          mentalHealthHistory: '',
        },
        healthHistoryRefCode: healthHistoryRefCode || undefined,
        // Step 3: Findings
        physicalExam: physicalExam || undefined,
        labResults: labResults || undefined,
        notes: notes || undefined,
        // Step 4: Diagnosis
        icd10Diagnosis: selectedIcd10Codes.length > 0 ? selectedIcd10Codes.map(c => `${c.code} (${c.name})`).join('\n') : undefined,
        nandaDiagnosis: selectedNandaCodes.length > 0 ? selectedNandaCodes.map(c => `${c.code} — ${c.name}`).join('\n') : undefined,
        nandaCode: nandaSelectedCode || undefined,
        nandaRelatedTo: nandaRelatedTo || undefined,
        icd10AdditionalNotes: icd10AdditionalNotes || undefined,
        // Step 5: AI Summary
        aiRationale: aiSuggestions?.rationale || undefined,
        aiRiskIndicators: aiSuggestions?.riskIndicators?.length ? aiSuggestions.riskIndicators : undefined,
        aiNursingConsiderations: aiSuggestions?.nursingConsiderations?.length ? aiSuggestions.nursingConsiderations : undefined,
        aiPriorityIntervention: aiSuggestions?.priorityIntervention || undefined,
        aiFollowUpSchedule: aiSuggestions?.followUpSchedule || undefined,
        aiReferralNeeded: aiSuggestions?.referralNeeded,
        aiReferralReason: aiSuggestions?.referralReason || undefined,
        // Step 6: Care Plan
        interventions: selectedInterventions,
        interventionEvals: interventionEvals.length > 0 ? interventionEvals : undefined,
        evaluationNotes: evaluationNotes || undefined,
        // Step 7: Referral
        referralPriority: referralPriority || undefined,
        referralFacility: referralFacility || undefined,
        referralType: referralType || 'Refer to Doctor',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `referral-${consultation.consultationNo}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!', { id: 'pdf-gen' });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF.', { id: 'pdf-gen' });
    }
  }, [consultation, typeOfVisit, chiefComplaint, gravidity, parity, lmp, consultationAOG, riskLevel, preventionLevel, vitals, calculatedBMI, fetalHeartRate, fundalHeight, allergies, medications,
    pastMedicalSelected, pastMedicalOthersText, previousSurgerySelected, previousSurgeryOthersText,
    traumaValue, traumaSpecify, bloodTransfusionValue, bloodTransfusionSpecify,
    familyHistoryDropdown, familyHistorySelected, familyHistoryOthersText,
    smokingValue, smokingPackYears, alcoholValue, alcoholDrinksPerDay,
    drugUseValue, drugUseSubstance, dietaryPatternValue, dietaryPatternSpecify,
    hhPhysicalActivity, hhSleepPattern, healthHistoryRefCode,
    physicalExam, labResults, notes, selectedIcd10Codes, selectedNandaCodes, nandaSelectedCode, nandaRelatedTo, icd10AdditionalNotes, aiSuggestions, selectedInterventions, interventionEvals, evaluationNotes, referralPriority, referralFacility, referralType]);

  // ─── Vital sign color coding ────────────────────────────────────────
  const getVitalColor = (field: string, value: string): string => {
    if (!value) return '';
    const num = parseFloat(value.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return '';
    switch (field) {
      case 'heartRate':
        return (num > 100 || num < 60) ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
      case 'temperature':
        return num > 37.5 ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20'
          : num < 36.5 ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
          : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
      case 'respiratoryRate':
        return (num > 20 || num < 12) ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
      case 'oxygenSat':
        return num < 95 ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20' : num >= 98 ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' : '';
      case 'painScale':
        return num >= 7 ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20'
          : num >= 4 ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
          : num > 0 ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' : '';
      case 'fetalHeartRate':
        return (num < 110 || num > 160) ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20'
          : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
      case 'bloodPressure': {
        const parts = value.split('/').map(Number);
        if (parts.length !== 2 || parts.some(isNaN)) return '';
        const [sys, dia] = parts;
        return (sys > 120 || dia > 80) ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20'
          : (sys < 90 || dia < 60) ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
          : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
      }
      default: return '';
    }
  };

  const canProceed = (): boolean => {
    const formData: Record<string, unknown> = {
      typeOfVisit,
      chiefComplaint,
      selectedNandaCodesCount: selectedNandaCodes.length,
      aiSuggestions,
      aiError,
      selectedInterventions,
      referralPriority,
    };
    return validateStep(currentStep, formData) === null;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Step 0: Assessment ─────────────────────────────────────────────
  const renderAssessment = () => (
    <div className="space-y-6">
      {/* Type of Visit */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-muted-foreground" /> Type of Visit</Label>
        <Select value={typeOfVisit || undefined} onValueChange={handleTypeOfVisitChange}>
          <SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Select visit type" /></SelectTrigger>
          <SelectContent>{TYPE_OF_VISIT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Separator />

      {/* Chief Complaint */}
      <div className="space-y-2">
        <Label htmlFor="chiefComplaint" className="flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-rose-500" /> Chief Complaint
        </Label>
        <Textarea id="chiefComplaint" placeholder="Patient reports: e.g., headache, nausea, swelling..." className="min-h-[80px] resize-y"
          value={chiefComplaint} onChange={handleChiefComplaintChange} />
      </div>

      {/* Allergies & Medications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="allergies" className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-muted-foreground" /> Allergies</Label>
          <Input id="allergies" placeholder="e.g. Penicillin, Sulfa drugs" value={allergies}
            onChange={handleAllergiesChange} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medications">Current Medications</Label>
          <Textarea id="medications" placeholder="List current medications..." className="min-h-[60px] resize-y"
            value={medications} onChange={handleMedicationsChange} />
        </div>
      </div>
      <Separator />

      {/* Vital Signs */}
      <div>
        <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-gradient-to-r from-rose-50/60 to-rose-50/20 dark:from-rose-950/20 dark:to-rose-950/10 border border-rose-100/60 dark:border-rose-800/30">
          <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
            <Stethoscope className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="font-semibold text-foreground dark:text-gray-100">Vital Signs</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <VitalInput id="bloodPressure" label="Blood Pressure" icon={getStableIcons().bp}
            placeholder="e.g. 120/80" value={vitals.bloodPressure} colorClass={getVitalColor('bloodPressure', vitals.bloodPressure)}
            onChange={handleBloodPressureChange} onDirty={markDirty} />
          <VitalInput id="heartRate" label="Pulse Rate" icon={getStableIcons().pulse}
            placeholder="e.g. 72 bpm" value={vitals.heartRate} colorClass={getVitalColor('heartRate', vitals.heartRate)}
            onChange={handleHeartRateChange} onDirty={markDirty} />
          <VitalInput id="temperature" label="Temperature" icon={getStableIcons().temp}
            placeholder="e.g. 36.8°C" value={vitals.temperature} colorClass={getVitalColor('temperature', vitals.temperature)}
            onChange={handleTemperatureChange} onDirty={markDirty} />
          <VitalInput id="respiratoryRate" label="Resp. Rate" icon={getStableIcons().resp}
            placeholder="e.g. 18 cpm" value={vitals.respiratoryRate} colorClass={getVitalColor('respiratoryRate', vitals.respiratoryRate)}
            onChange={handleRespiratoryRateChange} onDirty={markDirty} />
          <VitalInput id="oxygenSat" label="O₂ Saturation (%)" icon={getStableIcons().o2}
            placeholder="e.g. 98%" value={vitals.oxygenSat} colorClass={getVitalColor('oxygenSat', vitals.oxygenSat)} max="100"
            onChange={handleOxygenSatChange}
            onDirty={markDirty} />
          <VitalInput id="painScale" label="Pain Scale (0-10)" icon={getStableIcons().pain}
            placeholder="e.g. 3" type="number" min="0" max="10" value={vitals.painScale} colorClass={getVitalColor('painScale', vitals.painScale)}
            onChange={handlePainScaleChange} onDirty={markDirty} />
          <VitalInput id="fetalHeartRate" label="Fetal Heart Rate" icon={getStableIcons().fhr}
            placeholder="e.g. 140 bpm" value={fetalHeartRate} colorClass={getVitalColor('fetalHeartRate', fetalHeartRate)}
            onChange={handleFetalHeartRateChange} onDirty={markDirty} />
          <VitalInput id="fundalHeight" label="Fundal Height" icon={getStableIcons().fh}
            placeholder="e.g. 24 cm" value={fundalHeight} onChange={handleFundalHeightChange} onDirty={markDirty} />
          <VitalInput id="weight" label="Weight (kg)" icon={getStableIcons().weight}
            placeholder="e.g. 65 kg" value={vitals.weight} onChange={handleWeightChange} onDirty={markDirty} />
          <VitalInput id="height" label="Height (cm)" icon={getStableIcons().height}
            placeholder="e.g. 158 cm" value={vitals.height} onChange={handleHeightChange} onDirty={markDirty} />
        </div>
        {/* BMI */}
        {calculatedBMI && bmiCategory && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border mt-3 ${bmiCategory.bg}`}>
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">BMI: <strong className={bmiCategory.color}>{calculatedBMI}</strong> — <span className={bmiCategory.color}>{bmiCategory.label}</span></span>
          </div>
        )}
      </div>
      <Separator />

      {/* OB History */}
      <div>
        <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-gradient-to-r from-pink-50/60 to-pink-50/20 dark:from-pink-950/20 dark:to-pink-950/10 border border-pink-100/60 dark:border-pink-800/30">
          <div className="w-6 h-6 rounded-md bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
            <Baby className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="font-semibold text-foreground dark:text-gray-100">OB History</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="gravidity">Gravidity (G)</Label>
            <Input id="gravidity" type="number" min="0" max="20" placeholder="0" value={gravidity}
              onChange={handleGravidityChange} />
            <p className="text-[11px] text-muted-foreground">No. of pregnancies</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parity">Parity (P)</Label>
            <Input id="parity" type="number" min="0" max="20" placeholder="0" value={parity}
              onChange={handleParityChange} />
            <p className="text-[11px] text-muted-foreground">No. of births</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lmp">LMP</Label>
            <div className="flex gap-1.5">
              <Input id="lmp" type="text" placeholder="MM/DD/YYYY" value={lmpDisplay}
                maxLength={10}
                onChange={handleLmpChange}
                onBlur={handleLmpBlur}
                onKeyDown={handleLmpKeyDown}
                inputMode="numeric"
                autoComplete="off"
                className="flex-1" />
              <Popover open={lmpCalendarOpen} onOpenChange={setLmpCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9"
                    aria-label="Pick LMP date from calendar">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={lmpAsDate}
                    onSelect={handleLmpCalendarSelect}
                    disabled={(date) => date > new Date()}
                    defaultMonth={lmpAsDate || undefined}
                    captionLayout="dropdown"
                    fromYear={2010}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-[11px] text-muted-foreground">Type or pick from calendar · No future dates</p>
          </div>
          <div className="space-y-1.5">
            <Label>Age of Gestation</Label>
            <div className={`h-9 rounded-md border px-3 flex items-center text-sm ${consultationAOG ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800' : 'bg-muted text-muted-foreground border-transparent'}`}>
              {consultationAOG || 'Enter LMP above'}
            </div>
            <p className="text-[11px] text-muted-foreground">Auto-calculated from LMP</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Step 1: Health History ────────────────────────────────────────
  const renderHealthHistory = () => (
    <div className="space-y-6">
      {/* Section header */}
      <div className="bg-gradient-to-r from-teal-50/70 to-teal-50/20 dark:from-teal-950/30 dark:to-teal-950/10 border border-teal-200 dark:border-teal-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            <FileHeart className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="text-sm font-semibold text-teal-800 dark:text-teal-300">HEALTH HISTORY</h3>
        </div>
        <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5 ml-8">Record current health status and medical background</p>
      </div>

      {/* Past Diagnoses from Previous Consultations */}
      {pastDiagnoses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-foreground">Past Diagnoses</h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-50 text-rose-600 border-rose-200">
              {pastDiagnoses.length} previous consultation{pastDiagnoses.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {pastDiagnoses.map((past, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-gray-300 text-gray-600">
                      {past.consultationNo}
                    </Badge>
                    {/* Completed / In Progress status indicator */}
                    <Badge className={`text-[10px] px-1.5 py-0 border-0 ${
                      past.status === 'completed'
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                    }`}>
                      {past.status === 'completed' ? '✓ Completed' : '◷ In Progress'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(past.consultationDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                    by {past.nurseName}
                  </span>
                </div>

                {/* ICD-10 Diagnoses */}
                {past.icd10Diagnoses.length > 0 && (
                  <div className="mb-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">ICD-10</p>
                    <div className="flex flex-wrap gap-1">
                      {past.icd10Diagnoses.map((d, di) => (
                        <span key={di} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[11px] font-medium border border-blue-200 dark:border-blue-800">
                          <span className="font-mono">{d.code}</span>
                          <span className="text-blue-400 dark:text-blue-500">·</span>
                          <span>{d.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* NANDA Diagnoses */}
                {past.nandaDiagnoses.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">NANDA</p>
                    <div className="flex flex-wrap gap-1">
                      {past.nandaDiagnoses.map((d, di) => (
                        <span key={di} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[11px] font-medium border border-amber-200 dark:border-amber-800">
                          <span className="font-mono">{d.code}</span>
                          <span className="text-amber-400 dark:text-amber-500">·</span>
                          <span>{d.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Separator />
        </div>
      )}

      {/* ── Past Medical History (checkboxes) ───────────────────────── */}
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
                onCheckedChange={() => {
                  setPastMedicalSelected((prev) => toggleItem(prev, option));
                  markDirty();
                }}
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
            onChange={handlePastMedicalOthersChange}
          />
        )}
      </div>

      {/* ── Previous Surgery (checkboxes) ───────────────────────────── */}
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
                onCheckedChange={() => {
                  setPreviousSurgerySelected((prev) => toggleItem(prev, option));
                  markDirty();
                }}
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
            onChange={handlePreviousSurgeryOthersChange}
          />
        )}
      </div>
      <Separator />

      {/* ── History of Trauma (dropdown) ─────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">History of Trauma</Label>
        <Select value={traumaValue || undefined} onValueChange={(v) => { setTraumaValue(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {TRAUMA_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {traumaValue === 'yes' && (
          <Input placeholder="Please specify the trauma..." className="h-9 mt-1"
            value={traumaSpecify} onChange={handleTraumaSpecifyChange} />
        )}
      </div>

      {/* ── History of Blood Transfusion (dropdown) ─────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">History of Blood Transfusion</Label>
        <Select value={bloodTransfusionValue || undefined} onValueChange={(v) => { setBloodTransfusionValue(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {BLOOD_TRANSFUSION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {bloodTransfusionValue === 'yes' && (
          <Input placeholder="Please specify..." className="h-9 mt-1"
            value={bloodTransfusionSpecify} onChange={handleBloodTransfusionSpecifyChange} />
        )}
      </div>
      <Separator />

      {/* ── Family History (dropdown + conditional checkboxes) ───────── */}
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
            markDirty();
          }}
        >
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {FAMILY_HISTORY_PRESENCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {familyHistoryDropdown === 'present' && (
          <>
            <p className="text-xs text-muted-foreground mt-2">Select all that apply:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FAMILY_HISTORY_CONDITIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Checkbox
                    checked={familyHistorySelected.includes(option)}
                    onCheckedChange={() => {
                      setFamilyHistorySelected((prev) => toggleItem(prev, option));
                      markDirty();
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {familyHistorySelected.includes('Others (specify)') && (
              <Input placeholder="Please specify..." className="h-9 mt-1"
                value={familyHistoryOthersText} onChange={handleFamilyHistoryOthersChange} />
            )}
          </>
        )}
      </div>
      <Separator />

      {/* ── Smoking (dropdown + conditional) ─────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Cigarette className="h-3.5 w-3.5 text-muted-foreground" />
          Smoking
        </Label>
        <Select value={smokingValue || undefined} onValueChange={(v) => { setSmokingValue(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {SMOKING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(smokingValue === 'former' || smokingValue === 'current') && (
          <Input placeholder="No. of Pack Years" className="h-9 mt-1"
            value={smokingPackYears} onChange={handleSmokingPackYearsChange} />
        )}
      </div>

      {/* ── Alcohol Intake (dropdown + conditional) ──────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Wine className="h-3.5 w-3.5 text-muted-foreground" />
          Alcohol Intake
        </Label>
        <Select value={alcoholValue || undefined} onValueChange={(v) => { setAlcoholValue(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {ALCOHOL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(alcoholValue === 'occasional' || alcoholValue === 'regular') && (
          <Input placeholder="No. of standard drinks per day" className="h-9 mt-1"
            value={alcoholDrinksPerDay} onChange={handleAlcoholDrinksPerDayChange} />
        )}
      </div>

      {/* ── Drug Use (dropdown + conditional) ────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Pill className="h-3.5 w-3.5 text-muted-foreground" />
          Drug Use
        </Label>
        <Select value={drugUseValue || undefined} onValueChange={(v) => { setDrugUseValue(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {DRUG_USE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(drugUseValue === 'past' || drugUseValue === 'current') && (
          <Input placeholder="Type of Substance" className="h-9 mt-1"
            value={drugUseSubstance} onChange={handleDrugUseSubstanceChange} />
        )}
      </div>

      {/* ── Dietary Pattern (dropdown + conditional) ─────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Salad className="h-3.5 w-3.5 text-muted-foreground" />
          Dietary Pattern
        </Label>
        <Select value={dietaryPatternValue || undefined} onValueChange={(v) => { setDietaryPatternValue(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {DIETARY_PATTERN_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dietaryPatternValue === 'special' && (
          <Input placeholder="Please specify the special diet..." className="h-9 mt-1"
            value={dietaryPatternSpecify} onChange={handleDietaryPatternSpecifyChange} />
        )}
      </div>

      {/* ── Physical Activity (dropdown) ─────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
          Physical Activity
        </Label>
        <Select value={hhPhysicalActivity || undefined} onValueChange={(v) => { setHhPhysicalActivity(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {PHYSICAL_ACTIVITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Sleep Pattern (dropdown) ─────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Moon className="h-3.5 w-3.5 text-muted-foreground" />
          Sleep Pattern
        </Label>
        <Select value={hhSleepPattern || undefined} onValueChange={(v) => { setHhSleepPattern(v); markDirty(); }}>
          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select option" /></SelectTrigger>
          <SelectContent>
            {SLEEP_PATTERN_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ─── Step 2: Additional Findings ──────────────────────────────────
  const renderFindings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2 p-3 rounded-lg bg-gradient-to-r from-rose-50/60 to-rose-50/20 dark:from-rose-950/20 dark:to-rose-950/10 border border-rose-100/60 dark:border-rose-800/30">
        <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
          <Search className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
        </div>
        <h3 className="font-semibold text-sm text-foreground dark:text-gray-100">Additional Findings</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="physicalExam">Physical Examination Findings</Label>
        <Textarea id="physicalExam" placeholder="General appearance, fundal assessment, edema, etc." className="min-h-[100px] resize-y"
          value={physicalExam} onChange={handlePhysicalExamChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="labResults">Laboratory Results</Label>
        <Textarea id="labResults" placeholder="CBC, Urinalysis, Blood typing, etc." className="min-h-[100px] resize-y"
          value={labResults} onChange={handleLabResultsChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea id="notes" placeholder="Any additional observations or notes..." className="min-h-[80px] resize-y"
          value={notes} onChange={handleNotesChange} />
      </div>
    </div>
  );

  // ─── Step 3: Diagnosis ─────────────────────────────────────────────
  const renderDiagnosis = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-50/60 to-purple-50/20 dark:from-purple-950/20 dark:to-purple-950/10 border border-purple-100/60 dark:border-purple-800/30">
        <div className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
          <Stethoscope className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="font-semibold text-sm text-foreground dark:text-gray-100">Diagnosis</h3>
      </div>
      {/* Past Diagnoses Reference */}
      {pastDiagnoses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-foreground">Previous Diagnoses</h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-50 text-rose-600 border-rose-200">
              {pastDiagnoses.length} prior
            </Badge>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {pastDiagnoses.map((past, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-gray-300 text-gray-600">
                    {past.consultationNo}
                  </Badge>
                  <Badge className={`text-[10px] px-1.5 py-0 border-0 ${
                    past.status === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                  }`}>
                    {past.status === 'completed' ? '✓ Completed' : '◷ In Progress'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(past.consultationDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {past.icd10Diagnoses.map((d, di) => (
                    <span key={`icd-${di}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[10px] font-medium border border-blue-200 dark:border-blue-800">
                      <span className="font-mono">{d.code}</span>
                    </span>
                  ))}
                  {past.nandaDiagnoses.map((d, di) => (
                    <span key={`nanda-${di}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-medium border border-amber-200 dark:border-amber-800">
                      <span className="font-mono">{d.code}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Separator />
        </div>
      )}

      {/* NANDA Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Stethoscope className="h-3.5 w-3.5 text-purple-500" />
          NANDA-I Nursing Diagnoses
        </Label>
        <p className="text-xs text-muted-foreground">Search and select one or more NANDA codes.</p>

        <CodeCombobox
          label="Search NANDA"
          value=""
          onSelect={opt => {
            if (opt && !selectedNandaCodes.some(c => c.code === opt.code)) {
              setSelectedNandaCodes(prev => [...prev, { code: opt.code, name: opt.name }]);
              markDirty();
            }
          }}
          options={nandaOptions}
          searchFn={(q) => searchNandaDiagnoses(q).map(d => ({ code: d.code, name: d.name, description: d.definition, category: d.category }))}
          placeholder="Type NANDA code or keyword..."
          emptyMessage="No NANDA diagnoses found."
          categoryColors={NANDA_CATEGORY_COLORS}
          id="nanda-search"
          prominentCode
        />

        {selectedNandaCodes.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            {selectedNandaCodes.map((code) => (
              <Badge key={code.code} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                <span className="font-mono text-xs font-semibold">{code.code}</span>
                <span className="text-xs">{code.name}</span>
                <button onClick={() => { setSelectedNandaCodes(prev => prev.filter(c => c.code !== code.code)); markDirty(); }} className="ml-1 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Textarea id="nandaRelatedTo" placeholder="Related to: (e.g., preeclampsia, pregnancy-induced hypertension)..."
          className="min-h-[60px] resize-y mt-2" value={nandaRelatedTo}
          onChange={handleNandaRelatedToChange} />
      </div>
      <Separator />

      {/* ICD-10 Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Activity className="h-3.5 w-3.5 text-rose-500" />
          ICD-10 Diagnoses
        </Label>
        <p className="text-xs text-muted-foreground">Search and select one or more ICD-10 codes.</p>

        <CodeCombobox
          label="Search ICD-10"
          value=""
          onSelect={opt => {
            if (opt && !selectedIcd10Codes.some(c => c.code === opt.code)) {
              setSelectedIcd10Codes(prev => [...prev, { code: opt.code, name: opt.name }]);
              markDirty();
            }
          }}
          options={icd10Options}
          searchFn={(q) => searchIcd10Codes(q).map(c => ({ code: c.code, name: c.name, description: c.description, category: c.category }))}
          placeholder="Type ICD-10 code or keyword..."
          emptyMessage="No ICD-10 codes found."
          categoryColors={ICD10_CATEGORY_COLORS}
          id="icd10-search"
          prominentCode
        />

        {selectedIcd10Codes.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            {selectedIcd10Codes.map((code) => (
              <Badge key={code.code} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                <span className="font-mono text-xs font-semibold">{code.code}</span>
                <span className="text-xs">{code.name}</span>
                <button onClick={() => { setSelectedIcd10Codes(prev => prev.filter(c => c.code !== code.code)); markDirty(); }} className="ml-1 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Textarea id="icd10AdditionalNotes" placeholder="Additional notes or multiple codes..."
          className="min-h-[60px] resize-y mt-2" value={icd10AdditionalNotes}
          onChange={handleIcd10AdditionalNotesChange} />
      </div>
    </div>
  );

  // ─── Step 4: AI Summary ───────────────────────────────────────────
  const renderAiSummary = () => {
    const riskColorMap: Record<string, { border: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
      low: { border: 'border-green-400', bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-800 dark:text-green-200', icon: CheckCircle2 },
      moderate: { border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/20', text: 'text-yellow-800 dark:text-yellow-200', icon: AlertTriangle },
      high: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-800 dark:text-red-200', icon: ShieldAlert },
    };

    return (
      <div className="space-y-4">
        {/* Loading */}
        {aiLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-rose-200/50 dark:border-rose-700/30">
              <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">AI is analyzing assessment data...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
          </div>
        )}

        {/* Error */}
        {aiError && !aiLoading && !aiSuggestions && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-amber-200/50 dark:border-amber-700/30">
              <AlertCircle className="h-7 w-7 text-amber-500" />
            </div>
            <h3 className="font-semibold text-base mb-2">Unable to Generate AI Summary</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4 leading-relaxed">{aiError}</p>
            <Button onClick={handleAiSuggest} variant="outline" className="gap-2 shadow-sm shadow-amber-200/40 hover:shadow-md transition-all duration-200"><RefreshCw className="h-4 w-4" /> Try Again</Button>
          </div>
        )}

        {/* Empty State — no AI data yet and not loading */}
        {!aiLoading && !aiError && !aiSuggestions && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-rose-200/50 dark:border-rose-700/30">
              <Sparkles className="h-7 w-7 text-rose-500" />
            </div>
            <h3 className="font-semibold text-base mb-2">AI Risk Assessment</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
              Generate an AI-powered risk classification, nursing interventions, and care recommendations based on the assessment data.
            </p>
            <Button onClick={handleAiSuggest} size="lg" className="gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/30 active:scale-[0.97] transition-all duration-200">
              <Sparkles className="h-4.5 w-4.5" /> Generate AI Summary
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-4">
              <Shield className="h-3 w-3" /> AI only receives clinical data, no patient identifiers
            </div>
          </div>
        )}

        {/* AI Results — read-only display */}
        {aiSuggestions && !aiLoading && (
          <div className="space-y-4">
            {/* Risk Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RiskBadgeCard label="Risk Classification" value={riskLabel(riskLevel || preventionToRisk(aiSuggestions.preventionLevel))}
                colors={riskColorMap[riskLevel || 'low'] || riskColorMap.low} />
              <RiskBadgeCard label="Prevention Level" value={aiSuggestions.preventionLevel === 'primary' ? 'Primary Prevention'
                : aiSuggestions.preventionLevel === 'secondary' ? 'Secondary Prevention' : 'Tertiary Prevention'}
                colors={{
                  border: 'border-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20',
                  text: 'text-purple-800 dark:text-purple-200', icon: Shield,
                }} />
            </div>

            {/* Risk Indicators */}
            {aiSuggestions.riskIndicators && aiSuggestions.riskIndicators.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Risk Indicators
                </h4>
                <ul className="space-y-1">
                  {aiSuggestions.riskIndicators.map((ind, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span> {ind}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rationale */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <Brain className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                Rationale
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSuggestions.rationale}</p>
            </div>

            {/* Suggested Interventions */}
            {aiSuggestions.interventions && aiSuggestions.interventions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                    <ClipboardList className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  </div>
                  Suggested Interventions ({aiSuggestions.interventions.length})
                </h4>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {aiSuggestions.interventions.map((intervention, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {intervention.code && (
                          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            NIC {String(intervention.code)}
                          </Badge>
                        )}
                        <span className="text-sm font-medium">{intervention.name}</span>
                        {intervention.priority && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${intervention.priority === 'high' ? 'border-red-300 text-red-600' : intervention.priority === 'medium' ? 'border-amber-300 text-amber-600' : 'border-green-300 text-green-600'}`}>
                            {intervention.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{intervention.description}</p>
                      {intervention.relatedNanda && <p className="text-xs text-muted-foreground"><span className="font-medium">NANDA:</span> {intervention.relatedNanda}</p>}
                      {intervention.relatedNoc && <p className="text-xs text-muted-foreground"><span className="font-medium">NOC:</span> {intervention.relatedNoc}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Priority Intervention */}
            {aiSuggestions.priorityIntervention && (
              <div className="rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-200 dark:border-rose-800 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="font-semibold text-sm text-rose-800 dark:text-rose-200">Priority Intervention</span>
                </div>
                <p className="font-medium text-rose-900 dark:text-rose-100">{aiSuggestions.priorityIntervention}</p>
              </div>
            )}

            {/* Nursing Considerations */}
            {aiSuggestions.nursingConsiderations && aiSuggestions.nursingConsiderations.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                    <UserCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  Nursing Considerations
                </h4>
                <ul className="space-y-1">{aiSuggestions.nursingConsiderations.map((c, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-teal-500 mt-0.5">•</span>{c}</li>)}</ul>
              </div>
            )}

            {/* Follow-up Schedule */}
            {aiSuggestions.followUpSchedule && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Follow-up: <span className="text-foreground font-semibold">{aiSuggestions.followUpSchedule}</span></p>
              </div>
            )}

            {/* Reassess Button */}
            <div className="flex justify-center pt-2">
              <Button onClick={handleAiSuggest} disabled={aiLoading} size="lg" variant="outline" className="gap-2 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/20 shadow-sm shadow-rose-200/40 hover:shadow-md transition-all duration-200">
                <RefreshCw className={`h-4.5 w-4.5 ${aiLoading ? 'animate-spin' : ''}`} /> Reassess
              </Button>
            </div>

            {/* Privacy notice */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3" /> AI only receives clinical data, no patient identifiers
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Step 5: Care Plan ────────────────────────────────────────────
  const nocOptions: CodeOption[] = useMemo(() => NOC_OUTCOMES.map(n => ({ code: n.code, name: n.name, description: n.description, category: n.category })), []);

  const renderCarePlan = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
            <UserCheck className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="font-semibold">Nursing Care Plan</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-8">
          Select NIC interventions for the patient. {selectedNandaDomain && <span className="text-rose-600">Filtered by NANDA domain {selectedNandaDomain}.</span>}
        </p>
      </div>

      {/* AI suggestions as checkboxes */}
      {aiSuggestions && aiSuggestions.interventions && aiSuggestions.interventions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">AI-Suggested Interventions</p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {aiSuggestions.interventions.map((intervention, idx) => {
              const isChecked = selectedInterventions.some(i => i.name === intervention.name);
              const intCode = intervention.code ? String(intervention.code) : '';
              return (
                <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isChecked ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300'}`}>
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleAiIntervention(intervention)} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {intCode && <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">NIC {intCode}</Badge>}
                      <p className="text-sm font-medium">{intervention.name}</p>
                    </div>
                    {intervention.description && <p className="text-xs text-muted-foreground mt-0.5">{intervention.description}</p>}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Add Custom NIC Intervention */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Add Custom Intervention</p>
        <div className="space-y-3">
          <CodeCombobox
            label="NIC Intervention Code (Optional)"
            helperText={`Search NIC interventions${selectedNandaDomain ? ` (filtered by NANDA domain ${selectedNandaDomain})` : ''}`}
            value={customNicCode} onSelect={handleNicCodeSelect}
            options={filteredNicOptions}
            searchFn={(query) => searchNicInterventions(query).map(n => ({ code: n.code, name: n.name, description: n.description, category: n.category }))}
            placeholder="Type NIC code or keyword..." emptyMessage="No NIC interventions found."
            categoryColors={NIC_CATEGORY_COLORS} id="nic-custom-combobox" prominentCode />
          <div className="flex gap-2">
            <Input placeholder={customNicName ? `Using: ${customNicName}` : 'Or type custom intervention name...'}
              value={customNicName ? '' : customIntervention} onChange={handleCustomInterventionChange} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomInterventionWithCode(); } }} className="flex-1" />
            <Button onClick={addCustomInterventionWithCode} disabled={!customIntervention.trim() && !customNicCode} size="icon" className="bg-rose-600 hover:bg-rose-700">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selected interventions with inline evaluation */}
      {selectedInterventions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Selected Interventions ({selectedInterventions.length})</p>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {selectedInterventions.map((intervention, idx) => {
              const eval_ = interventionEvals[idx] || { nicCode: intervention.code || '', status: '', nocOutcome: '', nocOutcomeCode: '', notes: '' };
              return (
                <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {intervention.code && <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">NIC {intervention.code}</Badge>}
                      <span className="text-sm font-medium truncate">{intervention.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 flex-shrink-0"
                      onClick={() => removeIntervention(intervention.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  {/* Inline evaluation + NOC */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Evaluation</Label>
                      <Select value={eval_.status || undefined} onValueChange={v => updateInterventionEval(idx, 'status', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="met">Met</SelectItem>
                          <SelectItem value="partially_met">Partially Met</SelectItem>
                          <SelectItem value="unmet">Unmet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">NOC Outcome</Label>
                                      <CodeCombobox
                        label="NOC Outcome"
                        value={eval_.nocOutcomeCode || ''} onSelect={opt => {
                          if (opt) { updateInterventionEval(idx, 'nocOutcomeCode', opt.code); if (!eval_.nocOutcome) updateInterventionEval(idx, 'nocOutcome', opt.name); }
                          else updateInterventionEval(idx, 'nocOutcomeCode', '');
                        }} options={nocOptions}
                        searchFn={(query) => searchNocOutcomes(query).map(n => ({ code: n.code, name: n.name, description: n.description, category: n.category }))}
                        placeholder="Search NOC code or keyword..." emptyMessage="No NOC outcomes found."
                        categoryColors={NOC_CATEGORY_COLORS} />
                    </div>
                  </div>
                  {/* Notes per intervention */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Input placeholder="Notes for this intervention..." className="h-9 text-xs"
                      value={eval_.notes} onChange={e => updateInterventionEval(idx, 'notes', e.target.value)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedInterventions.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p>No interventions selected yet. Select from AI suggestions or add custom ones above.</p>
        </div>
      )}

      {/* Free-text Outcome Panel */}
      <div className="space-y-2">
        <Label htmlFor="evaluationNotes">Outcome Summary</Label>
        <Textarea id="evaluationNotes" placeholder="Document the overall outcomes, patient response, and follow-up plan..."
          className="min-h-[80px] resize-y" value={evaluationNotes}
          onChange={handleEvaluationNotesChange} />
      </div>
    </div>
  );

  // ─── Step 6: Referral ─────────────────────────────────────────────
  const renderReferral = () => {
    if (!consultation) return null;
    const ReferralSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div><h5 className="text-sm font-semibold text-rose-700 dark:text-rose-300 border-b border-rose-100 dark:border-rose-800 pb-1 mb-2">{title}</h5><div className="space-y-1.5 pl-1">{children}</div></div>
    );
    const ReferralRow = ({ label, value }: { label: string; value: string }) => (
      <div><span className="text-xs font-medium text-muted-foreground">{label}</span><p className="text-sm font-medium whitespace-pre-wrap">{value}</p></div>
    );

    return (
      <div className="space-y-4">
        {!referralSummary && !referralLoading && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-rose-200/50 dark:border-rose-700/30">
                <FileText className="h-7 w-7 text-rose-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Referral Details</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">Configure the referral details before generating the referral summary document.</p>
            </div>
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Referral Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><FileOutput className="h-3.5 w-3.5 text-muted-foreground" /> Type of Referral</Label>
                <Select value={referralType} onValueChange={v => { setReferralType(v); markDirty(); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select referral type" /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
                {riskLevel && (
                  <p className="text-[11px] text-muted-foreground">
                    Auto-suggested based on risk level: <span className={riskLevel === 'high' ? 'text-red-600 dark:text-red-400 font-medium' : riskLevel === 'moderate' ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}>{riskToReferralType(riskLevel)}</span>
                  </p>
                )}
              </div>
              {/* Priority */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" /> Referral Priority</Label>
                <Select value={referralPriority || undefined} onValueChange={v => { setReferralPriority(v); markDirty(); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select priority level" /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_PRIORITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label} — {opt.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Facility */}
              <div className="space-y-2">
                <Label htmlFor="referralFacility" className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-muted-foreground" /> Referral Facility</Label>
                <Textarea id="referralFacility" placeholder="Facility name, address, contact information..."
                  className="min-h-[80px] resize-y" value={referralFacility}
                  onChange={handleReferralFacilityChange} />
              </div>
              {/* Pre-filled notes from assessment */}
              {(chiefComplaint || vitals.bloodPressure || riskLevel) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assessment Summary (Pre-filled)</h4>
                  {chiefComplaint && <p className="text-sm"><span className="font-medium">Chief Complaint:</span> {chiefComplaint}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {vitals.bloodPressure && <span><strong>BP:</strong> {vitals.bloodPressure}</span>}
                    {vitals.heartRate && <span><strong>HR:</strong> {vitals.heartRate}</span>}
                    {vitals.temperature && <span><strong>Temp:</strong> {vitals.temperature}</span>}
                    {fetalHeartRate && <span><strong>FHR:</strong> {fetalHeartRate}</span>}
                    {riskLevel && <span><strong>Risk:</strong> {riskLabel(riskLevel)}</span>}
                    {consultationAOG && <span><strong>AOG:</strong> {consultationAOG}</span>}
                  </div>
                </div>
              )}
              <Button onClick={handleGenerateReferral} size="lg" className="w-full gap-2 bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 hover:shadow-md hover:shadow-rose-600/30 active:scale-[0.97] transition-all duration-200">
                <FileText className="h-4.5 w-4.5" /> Generate Referral Summary
              </Button>
            </div>
          </div>
        )}

        {referralLoading && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-7 w-7 text-rose-500 animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Generating referral summary...</p>
          </div>
        )}

        {referralSummary && !referralLoading && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={handleCopyToClipboard} className="gap-2 hover:border-rose-300 transition-all duration-200"><Copy className="h-3.5 w-3.5" /> Copy to Clipboard</Button>
              <Button variant="outline" onClick={handleDownloadPdf} className="gap-2 hover:border-rose-300 transition-all duration-200"><FileOutput className="h-3.5 w-3.5" /> Download PDF</Button>
              <Button variant="outline" onClick={handleGenerateReferral} className="gap-2 hover:border-rose-300 transition-all duration-200"><RefreshCw className={`h-3.5 w-3.5 ${referralLoading ? 'animate-spin' : ''}`} /> Regenerate</Button>
            </div>

            {/* Formatted Referral Card */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
              <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white px-6 py-4">
                <div className="flex items-center gap-3"><Baby className="h-6 w-6" /><div><h4 className="font-bold text-base tracking-wide">MOMTERNAL</h4><p className="text-rose-100 text-xs">Maternal Health Referral Summary</p></div></div>
              </div>
              <div className="p-6 space-y-5">
                <ReferralSection title="Patient Information">
                  <ReferralRow label="Name" value={consultation.patient.name} />
                  <ReferralRow label="Patient ID" value={consultation.patient.patientId} />
                  {consultation.patient.dateOfBirth && <ReferralRow label="Date of Birth" value={consultation.patient.dateOfBirth} />}
                  {consultationAOG && <ReferralRow label="Age of Gestation" value={consultationAOG} />}
                  {gravidity && <ReferralRow label="Gravidity" value={gravidity} />}
                  {parity && <ReferralRow label="Parity" value={parity} />}
                  {riskLevel && <ReferralRow label="Risk Level" value={riskLabel(riskLevel)} />}
                </ReferralSection>

                <ReferralSection title="Clinical Assessment">
                  {chiefComplaint && <ReferralRow label="Chief Complaint" value={chiefComplaint} />}
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Vital Signs</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-1">
                      {vitals.bloodPressure && <span className="text-xs"><strong>BP:</strong> {vitals.bloodPressure}</span>}
                      {vitals.heartRate && <span className="text-xs"><strong>HR:</strong> {vitals.heartRate}</span>}
                      {vitals.temperature && <span className="text-xs"><strong>Temp:</strong> {vitals.temperature}</span>}
                      {vitals.weight && <span className="text-xs"><strong>Weight:</strong> {vitals.weight}</span>}
                      {vitals.respiratoryRate && <span className="text-xs"><strong>RR:</strong> {vitals.respiratoryRate}</span>}
                      {fetalHeartRate && <span className="text-xs"><strong>FHR:</strong> {fetalHeartRate}</span>}
                      {fundalHeight && <span className="text-xs"><strong>Fundal Height:</strong> {fundalHeight}</span>}
                      {calculatedBMI && <span className="text-xs"><strong>BMI:</strong> {calculatedBMI}</span>}
                    </div>
                  </div>
                  {allergies && <ReferralRow label="Allergies" value={allergies} />}
                  {medications && <ReferralRow label="Current Medications" value={medications} />}
                </ReferralSection>

                {(physicalExam || labResults || notes) && (
                  <ReferralSection title="Additional Findings">
                    {physicalExam && <ReferralRow label="Physical Examination" value={physicalExam} />}
                    {labResults && <ReferralRow label="Laboratory Results" value={labResults} />}
                    {notes && <ReferralRow label="Additional Notes" value={notes} />}
                  </ReferralSection>
                )}

                {(selectedIcd10Codes.length > 0 || selectedNandaCodes.length > 0) && (
                  <ReferralSection title="Diagnosis">
                    {selectedNandaCodes.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">NANDA-I Nursing Diagnoses</span>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                          {selectedNandaCodes.map((code) => (
                            <li key={code.code} className="text-sm">
                              <span className="font-mono text-xs font-semibold">{code.code}</span> — {code.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedIcd10Codes.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">ICD-10 Diagnoses</span>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                          {selectedIcd10Codes.map((code) => (
                            <li key={code.code} className="text-sm">
                              <span className="font-mono text-xs font-semibold">{code.code}</span> — {code.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {nandaRelatedTo && <ReferralRow label="Related to" value={nandaRelatedTo} />}
                    {icd10AdditionalNotes && <ReferralRow label="Additional Diagnosis Notes" value={icd10AdditionalNotes} />}
                  </ReferralSection>
                )}

                {selectedInterventions.length > 0 && (
                  <ReferralSection title="Nursing Interventions (NIC)">
                    <ul className="list-disc list-inside space-y-1">
                      {selectedInterventions.map((intervention, idx) => (
                        <li key={idx} className="text-sm">{intervention.name}
                          {intervention.description && <span className="text-muted-foreground"> — {intervention.description}</span>}
                        </li>
                      ))}
                    </ul>
                    {aiSuggestions?.priorityIntervention && (
                      <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-800">
                        <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Priority: </span>
                        <span className="text-xs text-rose-800 dark:text-rose-200">{aiSuggestions.priorityIntervention}</span>
                      </div>
                    )}
                  </ReferralSection>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-4">
                  <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>Consultation: {consultation.consultationNo}</span>
                    <span>Date: {new Date(consultation.consultationDate).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Generated by MOMternal — Maternal Health Nursing Assessment System</div>
                </div>
              </div>
            </div>

            {/* Complete button */}
            <div className="flex justify-center pt-4">
              <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-sm shadow-emerald-600/20 hover:shadow-md hover:shadow-emerald-600/30 active:scale-[0.97] transition-all duration-200" onClick={handleComplete}>
                <CheckCircle2 className="h-4.5 w-4.5" /> Complete Consultation
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Step Renderer ──────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderAssessment();
      case 1: return renderHealthHistory();
      case 2: return renderFindings();
      case 3: return renderDiagnosis();
      case 4: return renderAiSummary();
      case 5: return renderCarePlan();
      case 6: return renderReferral();
      default: return null;
    }
  };

  const stepDescriptions: Record<number, string> = {
    0: 'Document the type of visit, chief complaint, vitals, OB history, and anthropometric measurements.',
    1: "Document the patient's past medical, surgical, family, and social history.",
    2: 'Record physical examination findings, laboratory results, and additional notes.',
    3: 'Enter NANDA-I nursing diagnosis and ICD-10 medical diagnosis codes.',
    4: 'AI-generated risk classification, prevention level, rationale, and suggested interventions.',
    5: 'Select NIC interventions, evaluate outcomes, and document the care plan.',
    6: 'Generate and finalize the referral summary document.',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING / EMPTY STATES
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-72" /></div></div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Card className="shadow-sm"><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!consultation) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 flex items-center justify-center mx-auto mb-3 border-2 border-dashed border-amber-200/50 dark:border-amber-700/30">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <p className="text-amber-800 dark:text-amber-200 font-medium">No consultation selected</p>
          <p className="text-amber-600 text-sm mt-1 leading-relaxed">Please select a consultation to continue.</p>
          <Button variant="outline" className="mt-4 hover:border-amber-300 transition-all duration-200" onClick={goBack}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const stepMeta = STEP_META[currentStep];
  const StepIcon = stepMeta.icon;

  return (
    <div className="space-y-0">
      {/* Patient Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-200 to-pink-200 dark:from-rose-900/40 dark:to-pink-900/40 flex items-center justify-center flex-shrink-0 ring-2 ring-rose-200/60 dark:ring-rose-700/40 shadow-sm">
          <Baby className="h-6 w-6 text-rose-700 dark:text-rose-300" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{consultation.patient.name}</h2>
          <p className="text-sm text-muted-foreground">
            {consultation.patient.patientId}
            {consultationAOG && <span className="ml-2"><Badge variant="secondary" className="text-[10px] px-1.5 py-0">{consultationAOG}</Badge></span>}
            {riskLevel && (
              <span className="ml-1">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                  riskLevel === 'high' ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-950/20' :
                  riskLevel === 'moderate' ? 'border-yellow-300 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20' :
                  'border-green-300 text-green-600 bg-green-50 dark:bg-green-950/20'
                }`}>{riskLevel} risk</Badge>
              </span>
            )}
          </p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">{consultation.consultationNo}</p>
          <p className="text-xs text-muted-foreground">{new Date(consultation.consultationDate).toLocaleDateString()}</p>
          {/* Pending Sync Badge */}
          {getQueueLength() > 0 && (
            <Badge variant="outline" className="mt-1 border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-[10px] gap-1">
              <CloudOff className="h-3 w-3" />
              {getQueueLength()} Pending Sync
            </Badge>
          )}
        </div>
      </div>

      {/* Resume Banner */}
      {consultation.stepCompleted > 0 && consultation.stepCompleted < 6 && (
        <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/60 dark:from-amber-950/20 dark:to-amber-950/10 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm"><span className="font-semibold">Assessment Paused</span> — Last Activity: Step {consultation.stepCompleted} ({STEP_META[consultation.stepCompleted]?.label})</p>
        </div>
      )}

      {/* Step Progress Bar — Sticky */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm p-3 sm:p-4 mb-4">
        <div className="flex items-center">
          {STEP_META.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            const isFuture = idx > currentStep;
            return (
              <div key={idx} className="flex items-center flex-1 last:flex-initial">
                <button onClick={() => { if (idx <= currentStep) goToStep(idx); }} disabled={idx > currentStep}
                  className="flex flex-col items-center gap-1 min-w-0" aria-label={`Step ${idx + 1}: ${step.label}`}
                  title={step.label}>
                  <div className={`flex items-center justify-center rounded-full transition-all duration-200 h-8 w-8 sm:h-9 sm:w-9
                    ${isCompleted ? 'bg-rose-600 text-white shadow-sm shadow-rose-200' : ''}
                    ${isCurrent ? 'bg-rose-600 text-white ring-4 ring-rose-100 dark:ring-rose-900 shadow-sm shadow-rose-200 scale-110' : ''}
                    ${isFuture ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500' : ''}
                    ${idx <= currentStep ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`}>
                    {isCompleted
                      ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      : <Icon className={`h-4 w-4 sm:h-4.5 ${isCurrent ? 'text-white' : isFuture ? 'text-gray-400 dark:text-gray-500' : ''}`} />}
                  </div>
                  <span className={`hidden sm:block text-[10px] lg:text-xs text-center leading-tight truncate max-w-[56px] lg:max-w-[80px]
                    ${isCurrent ? 'text-rose-700 font-semibold dark:text-rose-300' : ''}
                    ${isCompleted ? 'text-rose-600 font-medium dark:text-rose-400' : ''}
                    ${isFuture ? 'text-gray-400' : ''}`}>
                    {step.label}
                  </span>
                </button>
                {idx < TOTAL_STEPS - 1 && (
                  <div className="flex-1 mx-1 sm:mx-2 h-0.5 min-w-[8px] sm:min-w-[16px]">
                    <div className={`h-full rounded-full transition-colors duration-200 ${idx < currentStep ? 'bg-rose-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Consultation?</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved progress. Are you sure you want to leave?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitWizard} className="bg-red-600 hover:bg-red-700 text-white">Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-rose-600" />
              <AlertDialogTitle>Complete Consultation?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will mark the consultation as completed. You can still update evaluations later from the patient profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving...</> : 'Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step Card */}
      <Card className="overflow-hidden border-gray-200/80 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 flex items-center justify-center flex-shrink-0 ring-1 ring-rose-200/60 dark:ring-rose-700/30">
              <StepIcon className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <CardTitle className="text-base">Step {currentStep + 1}: {stepMeta.label}</CardTitle>
              <CardDescription>{stepDescriptions[currentStep]}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar py-2">{renderStep()}</div>
        </CardContent>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50/80 to-gray-50/40 dark:from-gray-900/80 dark:to-gray-900/60">
          <Button variant="ghost" onClick={handleBackClick} disabled={saving}
            className="gap-2 text-muted-foreground hover:text-foreground transition-all duration-200">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {saving && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /><span>Saving...</span></div>}
            {!saving && isInitialized.current && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Save className="h-3 w-3" /><span>Auto-saved</span></div>}
          </div>
          {currentStep < TOTAL_STEPS - 1 ? (
            <Button onClick={handleNext} disabled={saving || !canProceed()} className="gap-2 bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 hover:shadow-md hover:shadow-rose-600/30 active:scale-[0.97] transition-all duration-200">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving || !canProceed()} className="gap-2 bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 hover:shadow-md hover:shadow-rose-600/30 active:scale-[0.97] transition-all duration-200">
              <CheckCircle2 className="h-4 w-4" /> Complete
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
