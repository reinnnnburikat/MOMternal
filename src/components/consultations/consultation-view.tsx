'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { validateStep } from '@/lib/consultation-validation';
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
  { value: 'urgent', label: 'Urgent referral', description: 'Immediate referral required' },
  { value: 'non_urgent', label: 'Non-urgent', description: 'Routine referral' },
  { value: 'same_day', label: 'Same day referral', description: 'Referral within the day' },
];

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

function riskLabel(risk: string): string {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ConsultationView() {
  const selectedConsultationId = useAppStore((s) => s.selectedConsultationId);
  const goBack = useAppStore((s) => s.goBack);
  const updateActivity = useAppStore((s) => s.updateActivity);

  // ── State ──
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [customIntervention, setCustomIntervention] = useState('');
  const [customNicCode, setCustomNicCode] = useState('');
  const [customNicName, setCustomNicName] = useState('');
  const isInitialized = useRef(false);

  // ── Focus preservation ──
  const focusedFieldIdRef = useRef<string | null>(null);
  const handleFieldFocus = useCallback((fieldId: string) => {
    focusedFieldIdRef.current = fieldId;
  }, []);

  useEffect(() => {
    const fieldId = focusedFieldIdRef.current;
    if (fieldId) {
      const el = document.getElementById(fieldId);
      if (el && document.activeElement !== el) {
        el.focus({ preventScroll: true });
      }
    }
  });

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
  const [referralFacility, setReferralFacility] = useState('');
  const [interventionEvals, setInterventionEvals] = useState<Array<{
    nicCode: string; status: string; nocOutcome: string; nocOutcomeCode: string; notes: string;
  }>>([]);

  // ── Health History state ──
  const [healthHistoryData, setHealthHistoryData] = useState({
    pastMedicalHistory: '', previousSurgery: '', historyOfTrauma: '',
    historyOfBloodTransfusion: '', familyHistoryPaternal: '', familyHistoryMaternal: '',
    smokingHistory: '', alcoholIntake: '', drugUse: '', dietaryPattern: '',
    physicalActivity: '', sleepPattern: '', allergies: '', currentMedications: '',
    immunizationStatus: '', mentalHealthHistory: '',
  });
  const [healthHistoryRefCode, setHealthHistoryRefCode] = useState('');
  const [healthHistoryExisting, setHealthHistoryExisting] = useState<string | null>(null);
  const [healthHistorySearchQuery, setHealthHistorySearchQuery] = useState('');
  const [healthHistorySearchResults, setHealthHistorySearchResults] = useState<Array<{
    id: string; referenceCode: string; createdAt: string;
  }>>([]);

  // ── Computed values (declared before callbacks that reference them) ──
  const nandaSelectedCode = (() => {
    if (!nandaDiagnosis) return '';
    const match = nandaDiagnosis.match(/^(\d{5})\b/);
    return match ? match[1] : '';
  })();

  const icd10SelectedCode = (() => {
    if (!icd10Diagnosis) return '';
    const match = icd10Diagnosis.match(/^([A-Z]\d{2}(?:\.\d+)?)\b/);
    return match ? match[1] : '';
  })();

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

  // ── NANDA domain for NIC filtering ──
  const selectedNandaDomain = useMemo(() => {
    if (!nandaSelectedCode) return null;
    const found = NANDA_DIAGNOSES.find(d => d.code === nandaSelectedCode);
    return found ? found.domain : null;
  }, [nandaSelectedCode]);

  const filteredNicOptions = useMemo(() => {
    const base = selectedNandaDomain ? getNicByDomain(selectedNandaDomain) : NIC_INTERVENTIONS;
    return base.map(n => ({
      code: n.code,
      name: n.name,
      description: n.description,
      category: n.category,
    }));
  }, [selectedNandaDomain]);

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

  // ── Fetch consultation ──
  useEffect(() => {
    if (!selectedConsultationId) { setLoading(false); return; }
    async function fetchConsultation() {
      try {
        const res = await fetch(`/api/consultations/${selectedConsultationId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
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
        setRiskLevel(data.riskLevel || '');
        setAiSuggestions(parseAI(data.aiSuggestions));
        setSelectedInterventions(parseSelectedInterventions(data.selectedInterventions));
        setEvaluationNotes(data.evaluationNotes || '');
        setReferralSummary(data.referralSummary || '');
        setTypeOfVisit(data.typeOfVisit || '');
        setGravidity(data.gravidity != null ? String(data.gravidity) : '');
        setParity(data.parity != null ? String(data.parity) : '');
        setLmp(data.lmp ? (typeof data.lmp === 'string' ? data.lmp.slice(0, 10) : new Date(data.lmp).toISOString().slice(0, 10)) : '');
        if (data.height) setVitals(v => ({ ...v, height: data.height }));
        if (data.weight) setVitals(v => ({ ...v, weight: data.weight }));
        setPreventionLevel(data.preventionLevel || '');
        setReferralPriority(data.referralPriority || '');
        setReferralFacility(data.referralFacility || '');
        if (data.interventionEvaluations) {
          try { setInterventionEvals(JSON.parse(data.interventionEvaluations)); } catch { setInterventionEvals([]); }
        }
        if (data.healthHistory) {
          try { setHealthHistoryData(prev => ({ ...prev, ...JSON.parse(data.healthHistory) })); } catch { /* ignore */ }
        }
        setHealthHistoryRefCode(data.healthHistoryRefCode || '');
        setCurrentStep(resolveStartStep(data.stepCompleted));
        isInitialized.current = true;
      } catch (err) {
        console.error('Error fetching consultation:', err);
        toast.error('Failed to load consultation');
      } finally { setLoading(false); }
    }
    fetchConsultation();
  }, [selectedConsultationId]);

  // ── Auto-save on unmount (use ref to avoid stale closure) ──
  const saveRef = useRef(saveCurrentStepSilent);
  saveRef.current = saveCurrentStepSilent;
  useEffect(() => {
    return () => {
      if (isInitialized.current && selectedConsultationId) saveRef.current();
    };
  }, []);

  // ── Save payload builder ──
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
          payload.healthHistory = JSON.stringify(healthHistoryData);
          if (healthHistoryRefCode) payload.healthHistoryRefCode = healthHistoryRefCode;
          break;
        case 2: // Additional Findings
          if (physicalExam) payload.physicalExam = physicalExam;
          if (labResults) payload.labResults = labResults;
          if (notes) payload.notes = notes;
          break;
        case 3: // Diagnosis
          if (icd10Diagnosis) payload.icd10Diagnosis = icd10Diagnosis;
          if (nandaDiagnosis) payload.nandaDiagnosis = nandaDiagnosis;
          if (nandaSelectedCode) payload.nandaCode = nandaSelectedCode;
          if (nandaDiagnosis.includes('—')) payload.nandaName = nandaDiagnosis.split('—')[1]?.trim() || '';
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
          payload.referralType = 'Refer to Doctor';
          if (referralPriority) payload.referralPriority = referralPriority;
          if (referralFacility) payload.referralFacility = referralFacility;
          // referralSummary saved by the referral endpoint
          break;
      }
      return payload;
    },
    [typeOfVisit, chiefComplaint, vitals, fetalHeartRate, fundalHeight, allergies, medications,
      gravidity, parity, lmp, calculatedBMI, consultationAOG, healthHistoryData, healthHistoryRefCode,
      physicalExam, labResults, notes, icd10Diagnosis, nandaDiagnosis, nandaSelectedCode,
      riskLevel, preventionLevel, selectedInterventions, interventionEvals, evaluationNotes,
      referralPriority, referralFacility,
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
      toast.error('Failed to save progress');
      return false;
    } finally { setSaving(false); }
  }, [selectedConsultationId, buildSavePayload, updateActivity]);

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
      nandaDiagnosis,
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
  }, [currentStep, goToStep, typeOfVisit, chiefComplaint, nandaDiagnosis, aiSuggestions, aiError, selectedInterventions, referralPriority]);

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
    await saveStep(currentStep);
    goBack();
    toast.success('Consultation completed!');
  }, [currentStep, saveStep, goBack]);

  // ── AI Suggest ──
  const handleAiSuggest = useCallback(async () => {
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
        setPreventionLevel(pl);
        setRiskLevel(preventionToRisk(pl));
        // Save risk level and prevention level
        try {
          await fetch(`/api/consultations/${selectedConsultationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              riskLevel: preventionToRisk(pl),
              preventionLevel: pl,
            }),
          });
        } catch { /* non-critical */ }
      }
      toast.success('AI summary generated');
      updateActivity();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI summary';
      setAiError(msg);
      toast.error(msg, { duration: 5000 });
    } finally { setAiLoading(false); }
  }, [selectedConsultationId, updateActivity, aiError, saveStep, currentStep]);

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

  const handleDownloadPdf = useCallback(() => {
    if (!referralSummary || !consultation) return;
    try {
      const lines: string[] = [];
      const sep = '─'.repeat(60);
      lines.push('MOMTERNAL MATERNAL HEALTH SYSTEM', 'REFERRAL DOCUMENT', sep, '',
        `Consultation No: ${consultation.consultationNo}`,
        `Date: ${new Date(consultation.consultationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        `Patient: ${consultation.patient?.name || 'N/A'}`,
        `Patient ID: ${consultation.patient?.patientId || 'N/A'}`,
        ...(consultationAOG ? [`AOG: ${consultationAOG}`] : []),
        ...(riskLevel ? [`Risk Level: ${riskLabel(riskLevel)}`] : []),
        '', '─'.repeat(30) + ' REFERRAL DETAILS ' + '─'.repeat(30), '', referralSummary, '', sep,
        `Generated on: ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        'This document was generated by MOMternal Maternal Health System.');
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `referral-${consultation.consultationNo}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Referral document downloaded');
    } catch { toast.error('Failed to generate document.'); }
  }, [referralSummary, consultation, consultationAOG, riskLevel]);

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
      nandaDiagnosis,
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
  const StepAssessment = () => (
    <div className="space-y-6">
      {/* Type of Visit */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-muted-foreground" /> Type of Visit</Label>
        <Select value={typeOfVisit || undefined} onValueChange={v => { setTypeOfVisit(v); markDirty(); }}>
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
          value={chiefComplaint} onFocus={() => handleFieldFocus('chiefComplaint')} onChange={e => { setChiefComplaint(e.target.value); markDirty(); }} />
      </div>

      {/* Allergies & Medications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="allergies" className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-muted-foreground" /> Allergies</Label>
          <Input id="allergies" placeholder="e.g. Penicillin, Sulfa drugs" value={allergies}
            onFocus={() => handleFieldFocus('allergies')} onChange={e => { setAllergies(e.target.value); markDirty(); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medications">Current Medications</Label>
          <Textarea id="medications" placeholder="List current medications..." className="min-h-[60px] resize-y"
            value={medications} onFocus={() => handleFieldFocus('medications')} onChange={e => { setMedications(e.target.value); markDirty(); }} />
        </div>
      </div>
      <Separator />

      {/* Vital Signs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-4.5 w-4.5 text-rose-500" />
          <h3 className="font-semibold text-foreground dark:text-gray-100">Vital Signs</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <VitalInput id="bloodPressure" label="Blood Pressure" icon={<Activity className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 120/80" value={vitals.bloodPressure} colorClass={getVitalColor('bloodPressure', vitals.bloodPressure)}
            onChange={v => { setVitals(p => ({ ...p, bloodPressure: v })); markDirty(); }} />
          <VitalInput id="heartRate" label="Heart Rate" icon={<Heart className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 72 bpm" value={vitals.heartRate} colorClass={getVitalColor('heartRate', vitals.heartRate)}
            onChange={v => { setVitals(p => ({ ...p, heartRate: v })); markDirty(); }} />
          <VitalInput id="temperature" label="Temperature" icon={<Thermometer className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 36.8°C" value={vitals.temperature} colorClass={getVitalColor('temperature', vitals.temperature)}
            onChange={v => { setVitals(p => ({ ...p, temperature: v })); markDirty(); }} />
          <VitalInput id="respiratoryRate" label="Resp. Rate" icon={<Wind className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 18 cpm" value={vitals.respiratoryRate} colorClass={getVitalColor('respiratoryRate', vitals.respiratoryRate)}
            onChange={v => { setVitals(p => ({ ...p, respiratoryRate: v })); markDirty(); }} />
          <VitalInput id="oxygenSat" label="O₂ Saturation (%)" icon={<Wind className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 98%" value={vitals.oxygenSat} colorClass={getVitalColor('oxygenSat', vitals.oxygenSat)}
            onChange={v => { setVitals(p => ({ ...p, oxygenSat: v })); markDirty(); }} />
          <VitalInput id="painScale" label="Pain Scale (0-10)" icon={<AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 3" type="number" min="0" max="10" value={vitals.painScale} colorClass={getVitalColor('painScale', vitals.painScale)}
            onChange={v => { setVitals(p => ({ ...p, painScale: v })); markDirty(); }} />
          <VitalInput id="fetalHeartRate" label="Fetal Heart Rate" icon={<Baby className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 140 bpm" value={fetalHeartRate} colorClass={getVitalColor('fetalHeartRate', fetalHeartRate)}
            onChange={v => { setFetalHeartRate(v); markDirty(); }} />
          <VitalInput id="fundalHeight" label="Fundal Height" icon={<Baby className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 24 cm" value={fundalHeight} onChange={v => { setFundalHeight(v); markDirty(); }} />
          <VitalInput id="weight" label="Weight (kg)" icon={<Weight className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 65 kg" value={vitals.weight} onChange={v => { setVitals(p => ({ ...p, weight: v })); markDirty(); }} />
          <VitalInput id="height" label="Height (cm)" icon={<Activity className="h-3.5 w-3.5 text-muted-foreground" />}
            placeholder="e.g. 158 cm" value={vitals.height} onChange={v => { setVitals(p => ({ ...p, height: v })); markDirty(); }} />
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
        <div className="flex items-center gap-2 mb-3">
          <Baby className="h-4.5 w-4.5 text-rose-500" />
          <h3 className="font-semibold text-foreground dark:text-gray-100">OB History</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="gravidity">Gravidity (G)</Label>
            <Input id="gravidity" type="number" min="0" max="20" placeholder="0" value={gravidity}
              onFocus={() => handleFieldFocus('gravidity')}
              onChange={e => { const v = parseInt(e.target.value, 10); setGravidity(isNaN(v) ? '' : String(Math.max(0, Math.min(20, v)))); markDirty(); }} />
            <p className="text-[11px] text-muted-foreground">No. of pregnancies</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parity">Parity (P)</Label>
            <Input id="parity" type="number" min="0" max="20" placeholder="0" value={parity}
              onFocus={() => handleFieldFocus('parity')}
              onChange={e => { const v = parseInt(e.target.value, 10); setParity(isNaN(v) ? '' : String(Math.max(0, Math.min(20, v)))); markDirty(); }} />
            <p className="text-[11px] text-muted-foreground">No. of births</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lmp">LMP</Label>
            <Input id="lmp" type="date" value={lmp} max={new Date().toISOString().slice(0, 10)}
              onFocus={() => handleFieldFocus('lmp')} onChange={e => { setLmp(e.target.value); markDirty(); }} />
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
  const StepHealthHistory = () => (
    <div className="space-y-6">
      {/* Reference Code header */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-teal-800">HEALTH HISTORY</h3>
            {healthHistoryRefCode && <p className="text-xs text-teal-600 font-mono mt-0.5">Ref: {healthHistoryRefCode}</p>}
          </div>
          {healthHistoryExisting && <Badge variant="outline" className="bg-teal-100 text-teal-700 border-teal-300">Loaded from record</Badge>}
        </div>
      </div>

      {/* Search existing health history */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5 text-muted-foreground" /> Search Existing Health History</Label>
        <div className="flex gap-2">
          <Input placeholder="Enter reference code (e.g., HH-20260409-001)..." value={healthHistorySearchQuery}
            onChange={e => setHealthHistorySearchQuery(e.target.value)} className="flex-1" />
          <Button variant="outline" onClick={async () => {
            if (!healthHistorySearchQuery.trim()) return;
            try {
              const res = await fetch(`/api/health-history/search?q=${encodeURIComponent(healthHistorySearchQuery.trim())}`);
              if (res.ok) setHealthHistorySearchResults((await res.json()) || []);
            } catch { /* ignore */ }
          }}><Search className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => {
            setHealthHistorySearchQuery(''); setHealthHistorySearchResults([]);
            setHealthHistoryData({ pastMedicalHistory: '', previousSurgery: '', historyOfTrauma: '', historyOfBloodTransfusion: '', familyHistoryPaternal: '', familyHistoryMaternal: '', smokingHistory: '', alcoholIntake: '', drugUse: '', dietaryPattern: '', physicalActivity: '', sleepPattern: '', allergies: '', currentMedications: '', immunizationStatus: '', mentalHealthHistory: '' });
            setHealthHistoryRefCode(''); setHealthHistoryExisting(null);
          }}><Plus className="h-4 w-4" /> New</Button>
        </div>
        {healthHistorySearchResults.length > 0 && (
          <div className="border rounded-lg max-h-40 overflow-y-auto">
            {healthHistorySearchResults.map(r => (
              <button key={r.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0 flex justify-between items-center"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/health-history/${r.id}`);
                    if (res.ok) {
                      const data = await res.json();
                      setHealthHistoryData(prev => ({ ...prev, pastMedicalHistory: data.pastMedicalHistory || '', previousSurgery: data.previousSurgery || '', historyOfTrauma: data.historyOfTrauma || '', historyOfBloodTransfusion: data.historyOfBloodTransfusion || '', familyHistoryPaternal: data.familyHistoryPaternal || '', familyHistoryMaternal: data.familyHistoryMaternal || '', smokingHistory: data.smokingHistory || '', alcoholIntake: data.alcoholIntake || '', drugUse: data.drugUse || '', dietaryPattern: data.dietaryPattern || '', physicalActivity: data.physicalActivity || '', sleepPattern: data.sleepPattern || '', allergies: data.allergies || '', currentMedications: data.currentMedications || '', immunizationStatus: data.immunizationStatus || '', mentalHealthHistory: data.mentalHealthHistory || '' }));
                      setHealthHistoryRefCode(data.referenceCode); setHealthHistoryExisting(r.id);
                      setHealthHistorySearchResults([]); setHealthHistorySearchQuery('');
                    }
                  } catch { /* ignore */ }
                }}>
                <span className="font-mono font-medium">{r.referenceCode}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Separator />

      {/* Past Medical History & Previous Surgery */}
      <div className="space-y-4">
        <HealthTextarea id="hh-pastMedical" label="Past Medical History" placeholder="Previous medical conditions (diabetes, hypertension, heart disease, etc.)"
          value={healthHistoryData.pastMedicalHistory} onChange={v => setHealthHistoryData(p => ({ ...p, pastMedicalHistory: v }))} />
        <HealthTextarea id="hh-surgery" label="Previous Surgery" placeholder="Previous surgical procedures with dates if known"
          value={healthHistoryData.previousSurgery} onChange={v => setHealthHistoryData(p => ({ ...p, previousSurgery: v }))} />
        <HealthInput id="hh-trauma" label="History of Trauma" placeholder="Any history of physical trauma..."
          value={healthHistoryData.historyOfTrauma} onChange={v => setHealthHistoryData(p => ({ ...p, historyOfTrauma: v }))} />
        <HealthInput id="hh-transfusion" label="History of Blood Transfusion" placeholder="Any previous blood transfusions..."
          value={healthHistoryData.historyOfBloodTransfusion} onChange={v => setHealthHistoryData(p => ({ ...p, historyOfBloodTransfusion: v }))} />
      </div>
      <Separator />

      {/* Family History */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-teal-600" /> Family History</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HealthTextarea id="hh-familyPat" label="Paternal Side" placeholder="Health conditions on father's side..."
            value={healthHistoryData.familyHistoryPaternal} onChange={v => setHealthHistoryData(p => ({ ...p, familyHistoryPaternal: v }))} />
          <HealthTextarea id="hh-familyMat" label="Maternal Side" placeholder="Health conditions on mother's side..."
            value={healthHistoryData.familyHistoryMaternal} onChange={v => setHealthHistoryData(p => ({ ...p, familyHistoryMaternal: v }))} />
        </div>
      </div>
      <Separator />

      {/* Personal and Social History */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-teal-600" /> Personal and Social History</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HealthInput id="hh-smoking" label="Smoking" placeholder="Smoker/Non-smoker, pack-years..."
            value={healthHistoryData.smokingHistory} onChange={v => setHealthHistoryData(p => ({ ...p, smokingHistory: v }))} />
          <HealthInput id="hh-alcohol" label="Alcohol Intake" placeholder="None/Occasional/Regular..."
            value={healthHistoryData.alcoholIntake} onChange={v => setHealthHistoryData(p => ({ ...p, alcoholIntake: v }))} />
          <HealthInput id="hh-drugs" label="Drug Use" placeholder="Any substance use..."
            value={healthHistoryData.drugUse} onChange={v => setHealthHistoryData(p => ({ ...p, drugUse: v }))} />
          <HealthInput id="hh-diet" label="Dietary Pattern" placeholder="Diet description..."
            value={healthHistoryData.dietaryPattern} onChange={v => setHealthHistoryData(p => ({ ...p, dietaryPattern: v }))} />
          <HealthInput id="hh-activity" label="Physical Activity" placeholder="Sedentary/Moderate/Active..."
            value={healthHistoryData.physicalActivity} onChange={v => setHealthHistoryData(p => ({ ...p, physicalActivity: v }))} />
          <HealthInput id="hh-sleep" label="Sleep Pattern" placeholder="Hours per night, quality..."
            value={healthHistoryData.sleepPattern} onChange={v => setHealthHistoryData(p => ({ ...p, sleepPattern: v }))} />
        </div>
      </div>
      <Separator />

      {/* Additional Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-teal-600" /> Additional Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HealthInput id="hh-allergies" label="Allergies" placeholder="Known allergies..."
            value={healthHistoryData.allergies} onChange={v => setHealthHistoryData(p => ({ ...p, allergies: v }))} />
          <HealthInput id="hh-meds" label="Current Medications" placeholder="Ongoing medications..."
            value={healthHistoryData.currentMedications} onChange={v => setHealthHistoryData(p => ({ ...p, currentMedications: v }))} />
          <HealthInput id="hh-immuno" label="Immunization Status" placeholder="Tetanus, flu vaccine, etc."
            value={healthHistoryData.immunizationStatus} onChange={v => setHealthHistoryData(p => ({ ...p, immunizationStatus: v }))} />
          <HealthInput id="hh-mental" label="Mental Health History" placeholder="Any mental health conditions..."
            value={healthHistoryData.mentalHealthHistory} onChange={v => setHealthHistoryData(p => ({ ...p, mentalHealthHistory: v }))} />
        </div>
      </div>
    </div>
  );

  // ─── Step 2: Additional Findings ──────────────────────────────────
  const StepFindings = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="physicalExam">Physical Examination Findings</Label>
        <Textarea id="physicalExam" placeholder="General appearance, fundal assessment, edema, etc." className="min-h-[100px] resize-y"
          value={physicalExam} onFocus={() => handleFieldFocus('physicalExam')} onChange={e => { setPhysicalExam(e.target.value); markDirty(); }} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="labResults">Laboratory Results</Label>
        <Textarea id="labResults" placeholder="CBC, Urinalysis, Blood typing, etc." className="min-h-[100px] resize-y"
          value={labResults} onFocus={() => handleFieldFocus('labResults')} onChange={e => { setLabResults(e.target.value); markDirty(); }} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea id="notes" placeholder="Any additional observations or notes..." className="min-h-[80px] resize-y"
          value={notes} onFocus={() => handleFieldFocus('notes')} onChange={e => { setNotes(e.target.value); markDirty(); }} />
      </div>
    </div>
  );

  // ─── Step 3: Diagnosis ─────────────────────────────────────────────
  const icd10Options: CodeOption[] = ICD10_MATERNAL_CODES.map(c => ({ code: c.code, name: c.name, description: c.description, category: c.category }));
  const nandaOptions: CodeOption[] = NANDA_DIAGNOSES.map(d => ({ code: d.code, name: d.name, description: d.definition, category: d.category }));

  const StepDiagnosis = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <CodeCombobox label="NANDA-I Nursing Diagnosis" helperText="Search by code number (e.g., 00089) or keyword."
          value={nandaSelectedCode}
          onSelect={opt => { if (opt) setNandaDiagnosis(`${opt.code} — ${opt.name}`); else setNandaDiagnosis(''); markDirty(); }}
          options={nandaOptions}
          searchFn={(q) => searchNandaDiagnoses(q).map(d => ({ code: d.code, name: d.name, description: d.definition, category: d.category }))}
          placeholder="Type NANDA code or keyword..." emptyMessage="No NANDA diagnoses found."
          categoryColors={NANDA_CATEGORY_COLORS} id="nandaDiagnosis-combobox" prominentCode />
        <Textarea id="nandaDiagnosis-notes" placeholder="Related to: (e.g., preeclampsia, pregnancy-induced hypertension)..."
          className="min-h-[60px] resize-y mt-2" value={nandaDiagnosis.includes('—') ? '' : nandaDiagnosis}
          onFocus={() => handleFieldFocus('nandaDiagnosis-notes')}
          onChange={e => { const v = e.target.value; if (v.trim() && !nandaSelectedCode) setNandaDiagnosis(v); markDirty(); }} />
      </div>
      <Separator />
      <div className="space-y-2">
        <CodeCombobox label="ICD-10 Diagnosis" helperText="ICD-10 Maternal codes (e.g., O14 for preeclampsia)."
          value={icd10SelectedCode}
          onSelect={opt => { if (opt) setIcd10Diagnosis(`${opt.code} (${opt.name})`); else setIcd10Diagnosis(''); markDirty(); }}
          options={icd10Options}
          searchFn={(q) => searchIcd10Codes(q).map(c => ({ code: c.code, name: c.name, description: c.description, category: c.category }))}
          placeholder="Type ICD-10 code or keyword..." emptyMessage="No ICD-10 codes found."
          categoryColors={ICD10_CATEGORY_COLORS} id="icd10Diagnosis-combobox" prominentCode />
        <Textarea id="icd10Diagnosis-notes" placeholder="Additional notes or multiple codes (e.g., O14.1 + O99.0)..."
          className="min-h-[60px] resize-y mt-2" value={icd10Diagnosis.includes('(') ? '' : icd10Diagnosis}
          onFocus={() => handleFieldFocus('icd10Diagnosis-notes')}
          onChange={e => { const v = e.target.value; if (v.trim() && !icd10SelectedCode) setIcd10Diagnosis(v); markDirty(); }} />
      </div>
    </div>
  );

  // ─── Step 4: AI Summary ───────────────────────────────────────────
  const StepAiSummary = () => {
    // Auto-trigger AI when entering this step (if no data yet)
    useEffect(() => {
      if (!aiSuggestions && !aiLoading && !aiError) {
        // Auto-trigger after a short delay to let the UI render
        const timer = setTimeout(() => handleAiSuggest(), 500);
        return () => clearTimeout(timer);
      }
    }, []);

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
            <Loader2 className="h-10 w-10 text-rose-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-medium">AI is analyzing assessment data...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
          </div>
        )}

        {/* Error */}
        {aiError && !aiLoading && !aiSuggestions && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="font-semibold text-base mb-2">Unable to Generate AI Summary</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">{aiError}</p>
            <Button onClick={handleAiSuggest} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Try Again</Button>
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
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Risk Indicators</h4>
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
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-rose-500" /> Rationale</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSuggestions.rationale}</p>
            </div>

            {/* Suggested Interventions */}
            {aiSuggestions.interventions && aiSuggestions.interventions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-rose-500" /> Suggested Interventions ({aiSuggestions.interventions.length})</h4>
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
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 p-4">
                <div className="flex items-center gap-2 mb-1"><ShieldAlert className="h-4 w-4 text-rose-600" /><span className="font-semibold text-sm text-rose-800 dark:text-rose-200">Priority Intervention</span></div>
                <p className="font-medium text-rose-900 dark:text-rose-100">{aiSuggestions.priorityIntervention}</p>
              </div>
            )}

            {/* Nursing Considerations */}
            {aiSuggestions.nursingConsiderations && aiSuggestions.nursingConsiderations.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                <h4 className="text-sm font-semibold">Nursing Considerations</h4>
                <ul className="space-y-1">{aiSuggestions.nursingConsiderations.map((c, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-teal-500 mt-0.5">•</span>{c}</li>)}</ul>
              </div>
            )}

            {/* Follow-up Schedule */}
            {aiSuggestions.followUpSchedule && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs font-medium text-muted-foreground">Follow-up: <span className="text-foreground">{aiSuggestions.followUpSchedule}</span></p>
              </div>
            )}

            {/* Reassess Button */}
            <div className="flex justify-center pt-2">
              <Button onClick={handleAiSuggest} disabled={aiLoading} size="lg" variant="outline" className="gap-2 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/20">
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
  const nocOptions: CodeOption[] = NOC_OUTCOMES.map(n => ({ code: n.code, name: n.name, description: n.description, category: n.category }));

  const StepCarePlan = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-1">Nursing Care Plan</h3>
        <p className="text-sm text-muted-foreground">
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
              value={customNicName ? '' : customIntervention} onChange={e => {
                setCustomIntervention(e.target.value);
                if (e.target.value) { setCustomNicCode(''); setCustomNicName(''); }
              }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomInterventionWithCode(); } }} className="flex-1" />
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
        <p className="text-sm text-muted-foreground text-center py-4">No interventions selected yet. Select from AI suggestions or add custom ones above.</p>
      )}

      {/* Free-text Outcome Panel */}
      <div className="space-y-2">
        <Label htmlFor="evaluationNotes">Outcome Summary</Label>
        <Textarea id="evaluationNotes" placeholder="Document the overall outcomes, patient response, and follow-up plan..."
          className="min-h-[80px] resize-y" value={evaluationNotes}
          onFocus={() => handleFieldFocus('evaluationNotes')} onChange={e => { setEvaluationNotes(e.target.value); markDirty(); }} />
      </div>
    </div>
  );

  // ─── Step 6: Referral ─────────────────────────────────────────────
  const StepReferral = () => {
    const ReferralSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div><h5 className="text-sm font-semibold text-rose-700 dark:text-rose-300 border-b border-rose-100 dark:border-rose-800 pb-1 mb-2">{title}</h5><div className="space-y-1.5 pl-1">{children}</div></div>
    );
    const ReferralRow = ({ label, value }: { label: string; value: string }) => (
      <div><span className="text-xs font-medium text-muted-foreground">{label}</span><p className="text-sm whitespace-pre-wrap">{value}</p></div>
    );

    return (
      <div className="space-y-4">
        {!referralSummary && !referralLoading && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <FileText className="h-12 w-12 text-rose-300 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">Referral Details</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Configure the referral details before generating the referral summary document.</p>
            </div>
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Fixed Referral Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><FileOutput className="h-3.5 w-3.5 text-muted-foreground" /> Type of Referral</Label>
                <div className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-muted px-3 flex items-center text-sm font-medium">
                  Refer to Doctor
                </div>
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
                  onFocus={() => handleFieldFocus('referralFacility')} onChange={e => { setReferralFacility(e.target.value); markDirty(); }} />
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
              <Button onClick={handleGenerateReferral} size="lg" className="w-full gap-2 bg-rose-600 hover:bg-rose-700">
                <FileText className="h-4.5 w-4.5" /> Generate Referral Summary
              </Button>
            </div>
          </div>
        )}

        {referralLoading && (
          <div className="text-center py-12"><Loader2 className="h-10 w-10 text-rose-500 animate-spin mx-auto mb-4" /><p className="text-sm text-muted-foreground font-medium">Generating referral summary...</p></div>
        )}

        {referralSummary && !referralLoading && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={handleCopyToClipboard} className="gap-2"><Copy className="h-3.5 w-3.5" /> Copy to Clipboard</Button>
              <Button variant="outline" onClick={handleDownloadPdf} className="gap-2"><FileOutput className="h-3.5 w-3.5" /> Download Document</Button>
              <Button variant="outline" onClick={handleGenerateReferral} className="gap-2"><RefreshCw className={`h-3.5 w-3.5 ${referralLoading ? 'animate-spin' : ''}`} /> Regenerate</Button>
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

                {(icd10Diagnosis || nandaDiagnosis) && (
                  <ReferralSection title="Diagnosis">
                    {icd10Diagnosis && <ReferralRow label="ICD-10 Diagnosis" value={icd10Diagnosis} />}
                    {nandaDiagnosis && <ReferralRow label="NANDA-I Nursing Diagnosis" value={nandaDiagnosis} />}
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
              <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8" onClick={handleComplete}>
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
      case 0: return <StepAssessment />;
      case 1: return <StepHealthHistory />;
      case 2: return <StepFindings />;
      case 3: return <StepDiagnosis />;
      case 4: return <StepAiSummary />;
      case 5: return <StepCarePlan />;
      case 6: return <StepReferral />;
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
  // SUB-COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Vital Input ───────────────────────────────────────────────────
  const VitalInput = ({ id, label, icon, placeholder, value, colorClass, type = 'text', min, max, onChange }: {
    id: string; label: string; icon: React.ReactNode; placeholder: string; value: string;
    colorClass?: string; type?: string; min?: number | string; max?: number | string;
    onChange: (v: string) => void;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">{icon} {label}</Label>
      <Input id={id} type={type} min={min} max={max} placeholder={placeholder} value={value}
        className={colorClass || ''} onFocus={() => handleFieldFocus(id)}
        onChange={e => { onChange(e.target.value); markDirty(); }} />
    </div>
  );

  // ─── Health History Field Helpers ─────────────────────────────────
  const HealthInput = ({ id, label, placeholder, value, onChange }: {
    id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} placeholder={placeholder} value={value}
        onFocus={() => handleFieldFocus(id)} onChange={e => { onChange(e.target.value); markDirty(); }} />
    </div>
  );

  const HealthTextarea = ({ id, label, placeholder, value, onChange }: {
    id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Textarea id={id} placeholder={placeholder} className="min-h-[60px] resize-y"
        value={value} onFocus={() => handleFieldFocus(id)} onChange={e => { onChange(e.target.value); markDirty(); }} />
    </div>
  );

  // ─── Risk Badge Card ───────────────────────────────────────────────
  const RiskBadgeCard = ({ label, value, colors }: {
    label: string; value: string;
    colors: { border: string; bg: string; text: string; icon: typeof CheckCircle2 };
  }) => {
    const Icon = colors.icon;
    return (
      <div className={`rounded-xl border-2 p-4 ${colors.border} ${colors.bg} flex items-center gap-3`}>
        <Icon className={`h-6 w-6 ${colors.text} flex-shrink-0`} />
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={`font-semibold text-sm ${colors.text}`}>{value}</p>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING / EMPTY STATES
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-72" /></div></div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Card><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!consultation) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="text-amber-800 dark:text-amber-200 font-medium">No consultation selected</p>
          <p className="text-amber-600 text-sm mt-1">Please select a consultation to continue.</p>
          <Button variant="outline" className="mt-4" onClick={goBack}>Go Back</Button>
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
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-200 to-pink-200 flex items-center justify-center flex-shrink-0">
          <Baby className="h-6 w-6 text-rose-700" />
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
        </div>
      </div>

      {/* Resume Banner */}
      {consultation.stepCompleted > 0 && consultation.stepCompleted < 6 && (
        <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <Info className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm"><span className="font-semibold">Assessment Paused</span> — Last Activity: Step {consultation.stepCompleted} ({STEP_META[consultation.stepCompleted]?.label})</p>
        </div>
      )}

      {/* Step Progress Bar — Sticky */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm p-3 sm:p-4 mb-4">
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
      <Card className="overflow-hidden border-gray-200/80 dark:border-gray-700/60 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/80">
          <Button variant="ghost" onClick={handleBackClick} disabled={saving}
            className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {saving && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /><span>Saving...</span></div>}
            {!saving && isInitialized.current && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Save className="h-3 w-3" /><span>Auto-saved</span></div>}
          </div>
          {currentStep < TOTAL_STEPS - 1 ? (
            <Button onClick={handleNext} disabled={saving || !canProceed()} className="gap-2 bg-rose-600 hover:bg-rose-700">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving || !canProceed()} className="gap-2 bg-rose-600 hover:bg-rose-700">
              <CheckCircle2 className="h-4 w-4" /> Complete
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
