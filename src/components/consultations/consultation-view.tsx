'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
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
import { NIC_INTERVENTIONS, searchNicInterventions } from '@/data/nic-interventions';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PatientInfo {
  id: string;
  patientId: string;
  name: string;
  dateOfBirth?: string;
  bloodType?: string | null;
  gravidity?: number;
  parity?: number;
  aog?: string | null;
  riskLevel?: string;
}

interface ConsultationData {
  id: string;
  consultationNo: string;
  consultationDate: string;
  stepCompleted: number;
  status: string;
  patient: PatientInfo;
  // Visit type
  typeOfVisit?: string | null;
  // SOAP Assessment
  subjectiveSymptoms?: string | null;
  objectiveVitals?: string | null;
  fetalHeartRate?: string | null;
  fundalHeight?: string | null;
  allergies?: string | null;
  medications?: string | null;
  // Additional Findings
  physicalExam?: string | null;
  labResults?: string | null;
  notes?: string | null;
  // Diagnosis
  icd10Diagnosis?: string | null;
  nandaDiagnosis?: string | null;
  nandaCode?: string | null;
  nandaName?: string | null;
  // Risk
  riskLevel?: string;
  preventionLevel?: string | null;
  // AI
  aiSuggestions?: string | null;
  selectedInterventions?: string | null;
  // Evaluation
  evaluationStatus?: string | null;
  evaluationNotes?: string | null;
  interventionEvaluations?: string | null;
  // Referral
  referralType?: string | null;
  referralPriority?: string | null;
  referralFacility?: string | null;
  referralSummary?: string | null;
  referralStatus?: string;
}

interface AISuggestion {
  interventions: Array<{
    code?: string | number;
    name: string;
    description: string;
    category: string;
  }>;
  priorityIntervention: string;
  rationale: string;
  preventionLevel: string;
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
  { label: 'Assessment', shortLabel: 'SOAP', icon: ClipboardList },
  { label: 'Findings', shortLabel: 'Findings', icon: Search },
  { label: 'Diagnosis', shortLabel: 'Dx', icon: Stethoscope },
  { label: 'Risk Level', shortLabel: 'Risk', icon: ShieldAlert },
  { label: 'AI Suggest', shortLabel: 'AI', icon: Sparkles },
  { label: 'Nurse Select', shortLabel: 'HITL', icon: UserCheck },
  { label: 'Evaluation', shortLabel: 'Eval', icon: CheckCircle2 },
  { label: 'Referral', shortLabel: 'Refer', icon: FileOutput },
] as const;

// Step color accents (border-l colors for step cards)
const STEP_BORDER_COLORS: Record<number, string> = {
  0: 'border-l-rose-400',
  1: 'border-l-rose-400',
  2: 'border-l-purple-400',
  3: 'border-l-rose-400', // Dynamic based on risk
  4: 'border-l-rose-500',
  5: 'border-l-blue-400',
  6: 'border-l-emerald-400',
  7: 'border-l-amber-400',
};

const STEP_GLOW_CLASSES: Record<number, string> = {
  4: 'shadow-rose-100/50 dark:shadow-rose-950/30',
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseVitals(raw: string | null | undefined): VitalsForm {
  if (!raw) return { ...DEFAULT_VITALS };
  try {
    return { ...DEFAULT_VITALS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_VITALS };
  }
}

function stringifyVitals(v: VitalsForm): string {
  return JSON.stringify(v);
}

function parseAI(raw: string | null | undefined): AISuggestion | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseSelectedInterventions(raw: string | null | undefined): Array<{ name: string; description?: string; code?: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Map backend stepCompleted to frontend step index
function resolveStartStep(backendStep: number): number {
  if (backendStep <= 0) return 0;
  // The backend step 1=subjective, 2=objective (both part of FE step 0)
  // Backend step 3=findings (FE step 1), etc.
  // When backend step is 1 or 2, user finished SOAP → start at FE step 1
  if (backendStep <= 2) return 1;
  if (backendStep <= 3) return 2;
  if (backendStep <= 4) return 3;
  if (backendStep <= 5) return 4;
  if (backendStep <= 6) return 5;
  return 7;
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
  // Tracks which form field is focused by element ID (not reference),
  // and restores focus after every render using that ID.
  // This is more robust than element-reference tracking because it
  // survives DOM recreation (e.g., from conditional rendering or
  // AnimatePresence transitions).
  const focusedFieldIdRef = useRef<string | null>(null);

  // Update tracked ID whenever focus moves to a form field
  const handleFieldFocus = useCallback((fieldId: string) => {
    focusedFieldIdRef.current = fieldId;
  }, []);

  useEffect(() => {
    // After React commits DOM changes, restore focus to the tracked field
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
  const [subjectiveSymptoms, setSubjectiveSymptoms] = useState('');
  const [vitals, setVitals] = useState<VitalsForm>({ ...DEFAULT_VITALS });
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [fundalHeight, setFundalHeight] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [labResults, setLabResults] = useState('');
  const [notes, setNotes] = useState('');
  const [icd10Diagnosis, setIcd10Diagnosis] = useState('');
  const [nandaDiagnosis, setNandaDiagnosis] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null);
  const [selectedInterventions, setSelectedInterventions] = useState<Array<{ name: string; description?: string; code?: string }>>([]);
  const [evaluationStatus, setEvaluationStatus] = useState('');
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [referralSummary, setReferralSummary] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [preventionLevel, setPreventionLevel] = useState('');
  const [referralType, setReferralType] = useState('');
  const [referralPriority, setReferralPriority] = useState('');
  const [referralFacility, setReferralFacility] = useState('');
  const [interventionEvals, setInterventionEvals] = useState<Array<{nicCode: string; status: string; nocOutcome: string; notes: string}>>([]);

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
    if (calculatedBMI < 18.5) return { label: 'Underweight', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (calculatedBMI < 25) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50' };
    if (calculatedBMI < 30) return { label: 'Overweight', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Obese', color: 'text-red-600', bg: 'bg-red-50' };
  }, [calculatedBMI]);

  // ── Per-intervention eval update ──
  const updateInterventionEval = useCallback((index: number, field: 'status' | 'nocOutcome' | 'notes', value: string) => {
    setInterventionEvals((prev) => {
      const updated = [...prev];
      if (!updated[index]) {
        const intervention = selectedInterventions[index];
        updated[index] = { nicCode: intervention?.code || '', status: '', nocOutcome: '', notes: '' };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    markDirty();
  }, [selectedInterventions]);

  // ── Dirty state tracking ──
  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Fetch consultation on mount ──
  useEffect(() => {
    if (!selectedConsultationId) {
      setLoading(false);
      return;
    }

    async function fetchConsultation() {
      try {
        const res = await fetch(`/api/consultations/${selectedConsultationId}`);
        if (!res.ok) throw new Error('Failed to fetch consultation');
        const data = await res.json();
        setConsultation(data);

        // Populate form fields from existing data
        setSubjectiveSymptoms(data.subjectiveSymptoms || '');
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
        setEvaluationStatus(data.evaluationStatus || '');
        setEvaluationNotes(data.evaluationNotes || '');
        setReferralSummary(data.referralSummary || '');
        setTypeOfVisit(data.typeOfVisit || '');
        setPreventionLevel(data.preventionLevel || '');
        setReferralType(data.referralType || '');
        setReferralPriority(data.referralPriority || '');
        setReferralFacility(data.referralFacility || '');
        // Parse intervention evaluations
        if (data.interventionEvaluations) {
          try {
            setInterventionEvals(JSON.parse(data.interventionEvaluations));
          } catch { setInterventionEvals([]); }
        }

        // Set current step from stepCompleted
        const startStep = resolveStartStep(data.stepCompleted);
        setCurrentStep(startStep);
        isInitialized.current = true;
      } catch (err) {
        console.error('Error fetching consultation:', err);
        toast.error('Failed to load consultation');
      } finally {
        setLoading(false);
      }
    }

    fetchConsultation();
  }, [selectedConsultationId]);

  // ── Auto-save on unmount / navigate away ──
  useEffect(() => {
    return () => {
      // Only save if initialized
      if (isInitialized.current && selectedConsultationId) {
        saveCurrentStepSilent();
      }
    };
  }, []);

  // ── Computed values (must be declared before callbacks that reference them) ──
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

  // ── Save function ──
  const buildSavePayload = useCallback(
    (step: number): Record<string, unknown> => {
      const payload: Record<string, unknown> = {};
      switch (step) {
        case 0:
          if (typeOfVisit) payload.typeOfVisit = typeOfVisit;
          if (subjectiveSymptoms) payload.subjectiveSymptoms = subjectiveSymptoms;
          payload.objectiveVitals = stringifyVitals(vitals);
          if (fetalHeartRate) payload.fetalHeartRate = fetalHeartRate;
          if (fundalHeight) payload.fundalHeight = fundalHeight;
          if (allergies) payload.allergies = allergies;
          if (medications) payload.medications = medications;
          break;
        case 1:
          if (physicalExam) payload.physicalExam = physicalExam;
          if (labResults) payload.labResults = labResults;
          if (notes) payload.notes = notes;
          break;
        case 2:
          if (icd10Diagnosis) payload.icd10Diagnosis = icd10Diagnosis;
          if (nandaDiagnosis) payload.nandaDiagnosis = nandaDiagnosis;
          // Save NANDA code and name separately for structured data
          if (nandaSelectedCode) payload.nandaCode = nandaSelectedCode;
          if (nandaDiagnosis.includes('—')) {
            payload.nandaName = nandaDiagnosis.split('—')[1]?.trim() || '';
          }
          break;
        case 3:
          if (riskLevel) payload.riskLevel = riskLevel;
          if (preventionLevel) payload.preventionLevel = preventionLevel;
          break;
        case 4:
          // AI suggestions are saved by the AI endpoint
          break;
        case 5:
          payload.selectedInterventions = JSON.stringify(selectedInterventions);
          break;
        case 6:
          if (evaluationStatus) payload.evaluationStatus = evaluationStatus;
          if (evaluationNotes) payload.evaluationNotes = evaluationNotes;
          if (interventionEvals.length > 0) {
            payload.interventionEvaluations = JSON.stringify(interventionEvals);
          }
          break;
        case 7:
          if (referralType) payload.referralType = referralType;
          if (referralPriority) payload.referralPriority = referralPriority;
          if (referralFacility) payload.referralFacility = referralFacility;
          // Referral summary is saved by the referral endpoint
          break;
      }
      return payload;
    },
    [
      typeOfVisit,
      subjectiveSymptoms,
      vitals,
      fetalHeartRate,
      fundalHeight,
      allergies,
      medications,
      physicalExam,
      labResults,
      notes,
      icd10Diagnosis,
      nandaDiagnosis,
      nandaSelectedCode,
      riskLevel,
      preventionLevel,
      selectedInterventions,
      evaluationStatus,
      evaluationNotes,
      interventionEvals,
      referralType,
      referralPriority,
      referralFacility,
    ]
  );

  const saveStep = useCallback(
    async (step: number): Promise<boolean> => {
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
      } finally {
        setSaving(false);
      }
    },
    [selectedConsultationId, buildSavePayload, updateActivity]
  );

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
    } catch {
      // Silent save — don't show errors
    }
  }, [selectedConsultationId, buildSavePayload, currentStep]);

  // ── Navigation ──
  const goToStep = useCallback(
    async (targetStep: number) => {
      // Save current step before navigating
      await saveStep(currentStep);
      setCurrentStep(targetStep);
      updateActivity();
    },
    [currentStep, saveStep, updateActivity]
  );

  const handleNext = useCallback(async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      await goToStep(currentStep + 1);
    }
  }, [currentStep, goToStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleExitWizard = useCallback(() => {
    setShowExitDialog(false);
    setIsDirty(false);
    saveCurrentStepSilent();
    goBack();
  }, [goBack, saveCurrentStepSilent]);

  const handleBackClick = useCallback(() => {
    if (currentStep === 0 && isDirty) {
      setShowExitDialog(true);
    } else if (currentStep > 0) {
      goToStep(currentStep - 1);
    } else {
      goBack();
    }
  }, [currentStep, isDirty, goToStep, goBack]);

  const handleComplete = useCallback(async () => {
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
      const res = await fetch(`/api/consultations/${selectedConsultationId}/ai-suggest`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || data.details || 'AI suggestion failed');
        throw new Error(data.error || 'AI suggestion failed');
      }
      setAiSuggestions(data.aiSuggestions);
      setAiError(null);
      toast.success('AI suggestions generated');
      updateActivity();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI suggestions';
      if (!aiError) setAiError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setAiLoading(false);
    }
  }, [selectedConsultationId, updateActivity, aiError]);

  // ── Generate Referral ──
  const handleGenerateReferral = useCallback(async () => {
    if (!selectedConsultationId) return;
    setReferralLoading(true);
    try {
      // Save evaluation first
      await saveStep(currentStep);
      const res = await fetch(`/api/consultations/${selectedConsultationId}/referral`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Referral generation failed');
      const data = await res.json();
      setReferralSummary(data.referralSummary);
      toast.success('Referral generated');
      updateActivity();
    } catch {
      toast.error('Failed to generate referral');
    } finally {
      setReferralLoading(false);
    }
  }, [selectedConsultationId, currentStep, saveStep, updateActivity]);

  // ── HITL Intervention Management ──
  const toggleAiIntervention = useCallback(
    (intervention: { name: string; description: string; code?: string | number }) => {
      setSelectedInterventions((prev) => {
        const exists = prev.some((i) => i.name === intervention.name);
        if (exists) return prev.filter((i) => i.name !== intervention.name);
        return [...prev, { name: intervention.name, description: intervention.description, code: intervention.code ? String(intervention.code) : undefined }];
      });
    },
    []
  );

  const addCustomIntervention = useCallback(() => {
    const trimmed = customIntervention.trim();
    if (!trimmed) return;
    setSelectedInterventions((prev) => [...prev, { name: trimmed }]);
    setCustomIntervention('');
  }, [customIntervention]);

  const removeIntervention = useCallback((name: string) => {
    setSelectedInterventions((prev) => prev.filter((i) => i.name !== name));
  }, []);

  // ── Clipboard & Download ──
  const handleCopyToClipboard = useCallback(async () => {
    if (!referralSummary) return;
    try {
      await navigator.clipboard.writeText(referralSummary);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [referralSummary]);

  const handleDownloadTxt = useCallback(() => {
    if (!referralSummary) return;
    const blob = new Blob([referralSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-${consultation?.consultationNo || 'consultation'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  }, [referralSummary, consultation]);

  const handleDownloadPdf = useCallback(() => {
    if (!referralSummary || !consultation) return;

    try {
      // Build a structured text document for the referral
      const lines: string[] = [];
      const separator = '─'.repeat(60);

      lines.push('MOMTERNAL MATERNAL HEALTH SYSTEM');
      lines.push('REFERRAL DOCUMENT');
      lines.push(separator);
      lines.push('');
      lines.push(`Consultation No: ${consultation.consultationNo}`);
      lines.push(`Date: ${new Date(consultation.consultationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
      lines.push(`Patient: ${consultation.patient?.name || 'N/A'}`);
      lines.push(`Patient ID: ${consultation.patient?.patientId || 'N/A'}`);
      if (consultation.patient?.aog) lines.push(`AOG: ${consultation.patient.aog}`);
      if (consultation.patient?.riskLevel) lines.push(`Risk Level: ${consultation.patient.riskLevel}`);
      lines.push('');
      lines.push('─'.repeat(30) + ' REFERRAL DETAILS ' + '─'.repeat(30));
      lines.push('');
      lines.push(referralSummary);
      lines.push('');
      lines.push(separator);
      lines.push(`Generated on: ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
      lines.push('This document was generated by MOMternal Maternal Health System.');

      const content = lines.join('\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `referral-${consultation.consultationNo}-${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Referral document downloaded');
    } catch (err) {
      console.error('Document generation error:', err);
      toast.error('Failed to generate document.');
    }
  }, [referralSummary, consultation]);

  // ── NIC custom intervention helpers (state declared above with other useState) ──

  const handleNicCodeSelect = useCallback((opt: CodeOption | null) => {
    if (opt) {
      setCustomNicCode(opt.code);
      setCustomNicName(opt.name);
    } else {
      setCustomNicCode('');
      setCustomNicName('');
    }
  }, []);

  const addCustomInterventionWithCode = useCallback(() => {
    const trimmed = customIntervention.trim() || customNicName.trim();
    if (!trimmed) return;
    // Check for duplicates
    if (selectedInterventions.some((i) => i.name === trimmed)) {
      toast.error('This intervention is already selected');
      return;
    }
    setSelectedInterventions((prev) => [
      ...prev,
      {
        name: trimmed,
        description: '',
        code: customNicCode || undefined,
      },
    ]);
    setCustomIntervention('');
    setCustomNicCode('');
    setCustomNicName('');
  }, [customIntervention, customNicCode, customNicName, selectedInterventions]);

  // ── Render helpers ──
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 3:
        return riskLevel.length > 0;
      case 4:
        // Allow proceeding if AI suggestions were generated OR if AI failed (user can add manual interventions)
        return aiSuggestions !== null || aiError !== null;
      default:
        return true;
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!consultation) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="text-amber-800 font-medium">No consultation selected</p>
          <p className="text-amber-600 text-sm mt-1">Please select a consultation to continue.</p>
          <Button variant="outline" className="mt-4" onClick={goBack}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Step Progress Indicator ─────────────────────────────────────────────

  // ─── Exit Confirmation Dialog ──────────────────────────────────────

  const ExitConfirmDialog = () => (
    <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Consultation?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved progress. Are you sure you want to leave?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExitWizard}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ─── Step Progress Indicator ─────────────────────────────────────────────

  const StepProgress = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-rose-100 dark:border-gray-800 shadow-sm p-4 mb-4">
      <div className="flex items-center">
        {STEP_META.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isFuture = idx > currentStep;

          return (
            <div key={idx} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <button
                onClick={() => {
                  if (idx <= currentStep) goToStep(idx);
                }}
                disabled={idx > currentStep}
                className="flex flex-col items-center gap-1 min-w-0"
              >
                <div
                  className={`
                    flex items-center justify-center rounded-full transition-all duration-200
                    ${isCompleted ? 'bg-rose-600 text-white shadow-sm shadow-rose-200' : ''}
                    ${isCurrent ? 'bg-rose-600 text-white ring-4 ring-rose-100 shadow-sm shadow-rose-200 scale-110' : ''}
                    ${isFuture ? 'bg-gray-100 text-gray-400' : ''}
                    ${idx <= currentStep ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
                    h-8 w-8 sm:h-9 sm:w-9 text-xs sm:text-sm font-semibold
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                {/* Label: hidden on very small screens, short on mobile, full on desktop */}
                <span
                  className={`
                    text-[9px] sm:text-[10px] lg:text-xs text-center leading-tight truncate max-w-[56px] lg:max-w-[72px]
                    ${isCurrent ? 'text-rose-700 font-semibold' : ''}
                    ${isCompleted ? 'text-rose-600 font-medium' : ''}
                    ${isFuture ? 'text-gray-400' : ''}
                  `}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </span>
              </button>

              {/* Connector line */}
              {idx < TOTAL_STEPS - 1 && (
                <div className="flex-1 mx-1 sm:mx-2 h-0.5 min-w-[8px] sm:min-w-[16px]">
                  <div
                    className={`h-full rounded-full transition-colors duration-200 ${
                      idx < currentStep ? 'bg-rose-400' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Resume Banner ──────────────────────────────────────────────────────

  const ResumeBanner = () => {
    const sc = consultation.stepCompleted;
    if (sc <= 0 || sc >= 7) return null;
    const lastStepMeta = STEP_META[sc] || STEP_META[0];
    return (
      <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
        <Info className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">Assessment Paused</span> — Last Activity: Step {sc} (
          {lastStepMeta.label})
        </p>
      </div>
    );
  };

  // ─── Patient Header ─────────────────────────────────────────────────────

  const PatientHeader = () => (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-200 to-pink-200 flex items-center justify-center flex-shrink-0">
        <Baby className="h-6 w-6 text-rose-700" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground truncate">
          {consultation.patient.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {consultation.patient.patientId}
          {consultation.patient.aog && (
            <span className="ml-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {consultation.patient.aog}
              </Badge>
            </span>
          )}
          {consultation.patient.riskLevel && (
            <span className="ml-1">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  consultation.patient.riskLevel === 'high'
                    ? 'border-red-300 text-red-600 bg-red-50'
                    : consultation.patient.riskLevel === 'moderate'
                      ? 'border-yellow-300 text-yellow-600 bg-yellow-50'
                      : 'border-green-300 text-green-600 bg-green-50'
                }`}
              >
                {consultation.patient.riskLevel} risk
              </Badge>
            </span>
          )}
        </p>
      </div>
      <div className="ml-auto text-right hidden sm:block">
        <p className="text-xs text-muted-foreground">{consultation.consultationNo}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(consultation.consultationDate).toLocaleDateString()}
        </p>
      </div>
    </div>
  );

  // ─── Vital sign color coding ────────────────────────────────────────
  const getVitalColor = (field: string, value: string): string => {
    if (!value) return '';
    const num = parseFloat(value.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return '';
    switch (field) {
      case 'temperature':
        return num > 37.5 || num < 36.0 ? 'border-amber-300 bg-amber-50 dark:border-amber-700' : 'border-green-200 bg-green-50 dark:border-green-800';
      case 'heartRate': {
        const hr = num;
        return hr > 100 || hr < 60 ? 'border-amber-300 bg-amber-50 dark:border-amber-700' : 'border-green-200 bg-green-50 dark:border-green-800';
      }
      case 'respiratoryRate':
        return num > 20 || num < 12 ? 'border-amber-300 bg-amber-50 dark:border-amber-700' : 'border-green-200 bg-green-50 dark:border-green-800';
      case 'oxygenSat':
        return num < 95 ? 'border-red-300 bg-red-50 dark:border-red-700' : num >= 98 ? 'border-green-200 bg-green-50 dark:border-green-800' : '';
      case 'painScale':
        return num >= 7 ? 'border-red-300 bg-red-50 dark:border-red-700' : num >= 4 ? 'border-amber-300 bg-amber-50 dark:border-amber-700' : num > 0 ? 'border-green-200 bg-green-50 dark:border-green-800' : '';
      default:
        return '';
    }
  };

  const TYPE_OF_VISIT_OPTIONS = [
    'Prenatal Checkup',
    'Follow-up',
    'Emergency',
    'Postpartum',
    'New Patient Screening',
  ];

  const PREVENTION_LEVEL_OPTIONS = [
    { value: 'primary', label: 'Primary Prevention', description: 'Prevent disease/risk before it occurs' },
    { value: 'secondary', label: 'Secondary Prevention', description: 'Early detection and treatment' },
    { value: 'tertiary', label: 'Tertiary Prevention', description: 'Reduce complications and disability' },
  ];

  const REFERRAL_TYPE_OPTIONS = [
    'Refer to Doctor',
    'Refer to Specialist (OB-GYN)',
    'Refer to Hospital',
    'Transfer to Higher Facility',
    'Refer to Laboratory',
  ];

  const REFERRAL_PRIORITY_OPTIONS = [
    { value: 'routine', label: 'Routine', description: 'Within 1-2 weeks' },
    { value: 'non_urgent', label: 'Non-urgent', description: 'Within 3-5 days' },
    { value: 'urgent', label: 'Urgent', description: 'Within 24 hours' },
    { value: 'same_day', label: 'Same Day', description: 'Immediate attention needed' },
  ];

  const StepAssessment = () => (
    <div className="space-y-6">
      {/* Type of Visit */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
          Type of Visit
        </Label>
        <Select value={typeOfVisit} onValueChange={(v) => { setTypeOfVisit(v); markDirty(); }}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Select visit type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OF_VISIT_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Subjective */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-4.5 w-4.5 text-rose-500" />
          <h3 className="font-semibold text-foreground dark:text-gray-100">Subjective</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subjectiveSymptoms">Symptoms / Chief Complaint</Label>
          <Textarea
            id="subjectiveSymptoms"
            placeholder="Patient reports: e.g., headache, nausea, swelling..."
            className="min-h-[100px] resize-y"
            value={subjectiveSymptoms}
            onFocus={() => handleFieldFocus('subjectiveSymptoms')}
            onChange={(e) => { setSubjectiveSymptoms(e.target.value); markDirty(); }}
          />
        </div>
      </div>

      <Separator />

      {/* Objective */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-4.5 w-4.5 text-rose-500" />
          <h3 className="font-semibold text-foreground dark:text-gray-100">Objective — Vital Signs</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bloodPressure" className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              Blood Pressure
            </Label>
            <Input
              id="bloodPressure"
              placeholder="e.g. 120/80 mmHg"
              value={vitals.bloodPressure}
              onFocus={() => handleFieldFocus('bloodPressure')}
              onChange={(e) => { setVitals((v) => ({ ...v, bloodPressure: e.target.value })); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="heartRate" className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-muted-foreground" />
              Heart Rate
            </Label>
            <Input
              id="heartRate"
              placeholder="e.g. 72 bpm"
              value={vitals.heartRate}
              className={getVitalColor('heartRate', vitals.heartRate)}
              onFocus={() => handleFieldFocus('heartRate')}
              onChange={(e) => { setVitals((v) => ({ ...v, heartRate: e.target.value })); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="temperature" className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              Temperature
            </Label>
            <Input
              id="temperature"
              placeholder="e.g. 36.8°C"
              value={vitals.temperature}
              className={getVitalColor('temperature', vitals.temperature)}
              onFocus={() => handleFieldFocus('temperature')}
              onChange={(e) => { setVitals((v) => ({ ...v, temperature: e.target.value })); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight" className="flex items-center gap-1.5">
              <Weight className="h-3.5 w-3.5 text-muted-foreground" />
              Weight (kg)
            </Label>
            <Input
              id="weight"
              placeholder="e.g. 65 kg"
              value={vitals.weight}
              onFocus={() => handleFieldFocus('weight')}
              onChange={(e) => { setVitals((v) => ({ ...v, weight: e.target.value })); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height" className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              Height (cm)
            </Label>
            <Input
              id="height"
              placeholder="e.g. 158 cm"
              value={vitals.height}
              onFocus={() => handleFieldFocus('height')}
              onChange={(e) => { setVitals((v) => ({ ...v, height: e.target.value })); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="respiratoryRate" className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              Respiratory Rate
            </Label>
            <Input
              id="respiratoryRate"
              placeholder="e.g. 18 cpm"
              value={vitals.respiratoryRate}
              className={getVitalColor('respiratoryRate', vitals.respiratoryRate)}
              onFocus={() => handleFieldFocus('respiratoryRate')}
              onChange={(e) => { setVitals((v) => ({ ...v, respiratoryRate: e.target.value })); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oxygenSat" className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              O₂ Saturation (%)
            </Label>
            <Input
              id="oxygenSat"
              placeholder="e.g. 98%"
              value={vitals.oxygenSat}
              className={getVitalColor('oxygenSat', vitals.oxygenSat)}
              onFocus={() => handleFieldFocus('oxygenSat')}
              onChange={(e) => { setVitals((v) => ({ ...v, oxygenSat: e.target.value })); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="painScale" className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Pain Scale (0-10)
            </Label>
            <Input
              id="painScale"
              placeholder="e.g. 3"
              type="number"
              min="0"
              max="10"
              value={vitals.painScale}
              className={getVitalColor('painScale', vitals.painScale)}
              onFocus={() => handleFieldFocus('painScale')}
              onChange={(e) => { setVitals((v) => ({ ...v, painScale: e.target.value })); markDirty(); }}
            />
          </div>
        </div>

        {/* BMI Display */}
        {calculatedBMI && bmiCategory && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${bmiCategory.bg}`}>
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">BMI: <strong className={bmiCategory.color}>{calculatedBMI}</strong> — <span className={bmiCategory.color}>{bmiCategory.label}</span></span>
          </div>
        )}
      </div>

      <Separator />

      {/* Obstetric-specific */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Baby className="h-4.5 w-4.5 text-rose-500" />
          <h3 className="font-semibold text-foreground dark:text-gray-100">Obstetric Assessment</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fetalHeartRate">Fetal Heart Rate</Label>
            <Input
              id="fetalHeartRate"
              placeholder="e.g. 140 bpm"
              value={fetalHeartRate}
              onFocus={() => handleFieldFocus('fetalHeartRate')}
              onChange={(e) => { setFetalHeartRate(e.target.value); markDirty(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fundalHeight">Fundal Height</Label>
            <Input
              id="fundalHeight"
              placeholder="e.g. 24 cm"
              value={fundalHeight}
              onFocus={() => handleFieldFocus('fundalHeight')}
              onChange={(e) => { setFundalHeight(e.target.value); markDirty(); }}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Allergies & Medications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="allergies" className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            Allergies
          </Label>
          <Input
            id="allergies"
            placeholder="e.g. Penicillin, Sulfa drugs"
            value={allergies}
            onFocus={() => handleFieldFocus('allergies')}
            onChange={(e) => { setAllergies(e.target.value); markDirty(); }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medications">Current Medications</Label>
          <Textarea
            id="medications"
            placeholder="List current medications..."
            className="min-h-[60px] resize-y"
            value={medications}
            onFocus={() => handleFieldFocus('medications')}
            onChange={(e) => { setMedications(e.target.value); markDirty(); }}
          />
        </div>
      </div>
    </div>
  );

  // ─── Step 1: Additional Findings ────────────────────────────────────────

  const StepFindings = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="physicalExam">Physical Examination Findings</Label>
        <Textarea
          id="physicalExam"
          placeholder="General appearance, fundal assessment, edema, etc."
          className="min-h-[100px] resize-y"
          value={physicalExam}
          onFocus={() => handleFieldFocus('physicalExam')}
          onChange={(e) => { setPhysicalExam(e.target.value); markDirty(); }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="labResults">Laboratory Results</Label>
        <Textarea
          id="labResults"
          placeholder="CBC, Urinalysis, Blood typing, etc."
          className="min-h-[100px] resize-y"
          value={labResults}
          onFocus={() => handleFieldFocus('labResults')}
          onChange={(e) => { setLabResults(e.target.value); markDirty(); }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional observations or notes..."
          className="min-h-[80px] resize-y"
          value={notes}
          onFocus={() => handleFieldFocus('notes')}
          onChange={(e) => { setNotes(e.target.value); markDirty(); }}
        />
      </div>
    </div>
  );

  // ─── ICD-10 Search Function ─────────────────────────────────────
  const icd10Options: CodeOption[] = ICD10_MATERNAL_CODES.map((c) => ({
    code: c.code,
    name: c.name,
    description: c.description,
    category: c.category,
  }));

  const icd10CategoryColors: Record<string, string> = {
    hypertensive: '#ef4444',
    diabetes: '#f59e0b',
    anemia: '#8b5cf6',
    hemorrhage: '#dc2626',
    infection: '#06b6d4',
    labor: '#3b82f6',
    fetal: '#ec4899',
    other: '#6b7280',
  };

  // ─── NANDA Search Function ──────────────────────────────────────
  const nandaOptions: CodeOption[] = NANDA_DIAGNOSES.map((d) => ({
    code: d.code,
    name: d.name,
    description: d.definition,
    category: d.category,
  }));

  const nandaCategoryColors: Record<string, string> = {
    physiological: '#22c55e',
    psychosocial: '#3b82f6',
    knowledge: '#f59e0b',
    safety: '#ef4444',
  };

  // ─── NIC Search Function ────────────────────────────────────────
  const nicOptions: CodeOption[] = NIC_INTERVENTIONS.map((n) => ({
    code: n.code,
    name: n.name,
    description: n.description,
    category: n.category,
  }));

  const nicCategoryColors: Record<string, string> = {
    Physiological: '#22c55e',
    Psychosocial: '#3b82f6',
    Safety: '#ef4444',
    Educational: '#f59e0b',
  };

  // (icd10SelectedCode and nandaSelectedCode moved earlier — before buildSavePayload — to avoid TDZ)

  // ─── Step 2: Diagnosis ──────────────────────────────────────────────────

  const StepDiagnosis = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <CodeCombobox
          label="ICD-10 Diagnosis — Code Search"
          helperText="ICD-10 Ref: Type the code to find a diagnosis (e.g., 'O' for obstetric codes, 'O14' for preeclampsia). Search by code or keyword."
          value={icd10SelectedCode}
          onSelect={(opt) => {
            if (opt) {
              setIcd10Diagnosis(`${opt.code} (${opt.name})`);
            } else {
              setIcd10Diagnosis('');
            }
            markDirty();
          }}
          options={icd10Options}
          searchFn={(query, opts) => searchIcd10Codes(query).map((c) => ({
            code: c.code,
            name: c.name,
            description: c.description,
            category: c.category,
          }))}
          placeholder="Type code (e.g., O14) or keyword (e.g., preeclampsia)..."
          emptyMessage="No ICD-10 codes found. Check spelling or try a broader term."
          categoryColors={icd10CategoryColors}
          infoTooltip="Type first letter/digit to see suggestions"
          id="icd10Diagnosis-combobox"
          prominentCode
        />
        {/* Additional notes for ICD-10 */}
        <Textarea
          id="icd10Diagnosis-notes"
          placeholder="Additional clinical notes or multiple codes (e.g., O14.1 + O99.0)..."
          className="min-h-[60px] resize-y mt-2"
          value={icd10Diagnosis.includes('(') ? '' : icd10Diagnosis}
          onFocus={() => handleFieldFocus('icd10Diagnosis-notes')}
          onChange={(e) => {
            const v = e.target.value;
            if (v.trim() && !icd10SelectedCode) {
              setIcd10Diagnosis(v);
            }
            markDirty();
          }}
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <CodeCombobox
          label="NANDA-I Nursing Diagnosis — Code Search"
          helperText="NANDA Ref: Type the code number to quickly find a diagnosis (e.g., type '0' for codes starting with 0, '00089' for Ineffective Tissue Perfusion). You can also search by keyword."
          value={nandaSelectedCode}
          onSelect={(opt) => {
            if (opt) {
              setNandaDiagnosis(`${opt.code} — ${opt.name}`);
            } else {
              setNandaDiagnosis('');
            }
            markDirty();
          }}
          options={nandaOptions}
          searchFn={(query, opts) => searchNandaDiagnoses(query).map((d) => ({
            code: d.code,
            name: d.name,
            description: d.definition,
            category: d.category,
          }))}
          placeholder="Type code number (e.g., 00089) or search by name..."
          emptyMessage="No NANDA diagnoses found. Try a different code or keyword."
          categoryColors={nandaCategoryColors}
          infoTooltip="Type first digit to see suggestions"
          id="nandaDiagnosis-combobox"
          prominentCode
        />
        {/* Additional notes for NANDA */}
        <Textarea
          id="nandaDiagnosis-notes"
          placeholder="Related to: (e.g., preeclampsia, pregnancy-induced hypertension)..."
          className="min-h-[60px] resize-y mt-2"
          value={nandaDiagnosis.includes('—') ? '' : nandaDiagnosis}
          onFocus={() => handleFieldFocus('nandaDiagnosis-notes')}
          onChange={(e) => {
            const v = e.target.value;
            if (v.trim() && !nandaSelectedCode) {
              setNandaDiagnosis(v);
            }
            markDirty();
          }}
        />
      </div>
    </div>
  );

  // ─── Step 3: Risk Classification ────────────────────────────────────────

  const riskOptions = [
    {
      value: 'low',
      label: 'Low Risk',
      description: 'Uncomplicated pregnancy, normal vitals, no red flags',
      color: 'green',
      border: 'border-green-400',
      bg: 'bg-green-50',
      text: 'text-green-800',
      icon: CheckCircle2,
    },
    {
      value: 'moderate',
      label: 'Moderate Risk',
      description: 'Some risk factors present, closer monitoring needed',
      color: 'yellow',
      border: 'border-yellow-400',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      icon: AlertTriangle,
    },
    {
      value: 'high',
      label: 'High Risk',
      description: 'Significant risk factors, urgent referral may be required',
      color: 'red',
      border: 'border-red-400',
      bg: 'bg-red-50',
      text: 'text-red-800',
      icon: ShieldAlert,
    },
  ] as const;

  const StepRisk = () => (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Classify the patient&apos;s current risk level based on the assessment and findings.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {riskOptions.map((opt) => {
          const isSelected = riskLevel === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setRiskLevel(opt.value); markDirty(); }}
              className={`
                relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200
                ${isSelected ? `${opt.border} ${opt.bg} shadow-md scale-[1.02]` : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-rose-600" />
                </div>
              )}
              <Icon className={`h-8 w-8 ${isSelected ? opt.text : 'text-gray-400'}`} />
              <div className="text-center">
                <p className={`font-semibold text-sm ${isSelected ? opt.text : 'text-foreground'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Prevention Level */}
      <Separator />
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-rose-500" />
          Prevention Level
        </Label>
        <p className="text-xs text-muted-foreground">
          Classify the level of prevention based on the patient&apos;s current condition and risk factors.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PREVENTION_LEVEL_OPTIONS.map((opt) => {
            const isSelected = preventionLevel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setPreventionLevel(opt.value); markDirty(); }}
                className={`
                  flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected
                    ? 'border-purple-400 bg-purple-50 shadow-sm dark:bg-purple-950/20 dark:border-purple-700'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}
                `}
              >
                <p className={`text-sm font-semibold ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-foreground'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── Step 4: AI Intervention Suggestion ─────────────────────────────────

  const StepAiSuggest = () => (
    <div className="space-y-4">
      {/* Generate button */}
      {!aiSuggestions && !aiLoading && (
        <div className="text-center py-8">
          <Sparkles className="h-12 w-12 text-rose-300 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">AI-Assisted Interventions</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Based on the assessment data, our AI can suggest nursing interventions using the NIC
            (Nursing Interventions Classification) framework.
          </p>
          <Button onClick={handleAiSuggest} size="lg" className="gap-2 bg-rose-600 hover:bg-rose-700">
            <Sparkles className="h-4.5 w-4.5" />
            Suggest Interventions
          </Button>
          <p className="text-[11px] text-muted-foreground mt-4 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            AI only receives clinical data, no patient identifiers
          </p>
        </div>
      )}

      {/* Loading state */}
      {aiLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-10 w-10 text-rose-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-medium">
            AI is analyzing assessment data...
          </p>
          <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
        </div>
      )}

      {/* Error state */}
      {aiError && !aiLoading && !aiSuggestions && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="font-semibold text-base mb-2">Unable to Generate AI Suggestions</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            {aiError}
          </p>
          <Button onClick={handleAiSuggest} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}

      {/* AI Results */}
      {aiSuggestions && !aiLoading && (
        <div className="space-y-4">
          {/* Priority intervention */}
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <span className="font-semibold text-sm text-rose-800">Priority Intervention</span>
            </div>
            <p className="font-medium text-rose-900">{aiSuggestions.priorityIntervention || 'N/A'}</p>
            <p className="text-sm text-rose-700 mt-1">{aiSuggestions.rationale || 'No rationale provided'}</p>
            {aiSuggestions.preventionLevel && (
              <Badge
                variant="secondary"
                className="mt-2 bg-rose-100 text-rose-700 hover:bg-rose-100 text-xs"
              >
                Prevention: {aiSuggestions.preventionLevel}
              </Badge>
            )}
          </div>

          {/* Suggested interventions list */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-rose-500" />
              Suggested NIC Interventions
            </h4>
            <div className="space-y-2">
              {aiSuggestions.interventions?.map((intervention, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-rose-200 transition-colors"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <Checkbox
                      checked={selectedInterventions.some((i) => i.name === intervention.name)}
                      onCheckedChange={() => toggleAiIntervention(intervention)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{intervention.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {intervention.description}
                    </p>
                    {intervention.category && (
                      <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0">
                        {intervention.category}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {(!aiSuggestions.interventions || aiSuggestions.interventions.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No interventions were generated. Try regenerating.
                </p>
              )}
            </div>
          </div>

          {/* Regenerate */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleAiSuggest} disabled={aiLoading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
              Regenerate Suggestions
            </Button>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            AI only receives clinical data, no patient identifiers
          </div>
        </div>
      )}
    </div>
  );

  // ─── Step 5: Nurse Selection (HITL) ─────────────────────────────────────

  const StepHITL = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-1">Human-in-the-Loop Intervention Selection</h3>
        <p className="text-sm text-muted-foreground">
          Review the AI suggestions above and select which interventions to apply. You can also add
          custom interventions based on your clinical judgment using NIC codes.
        </p>
      </div>

      {/* AI suggestions as checkboxes */}
      {aiSuggestions && aiSuggestions.interventions && aiSuggestions.interventions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            AI-Suggested Interventions
          </p>
          <div className="space-y-2">
            {aiSuggestions.interventions.map((intervention, idx) => {
              const isChecked = selectedInterventions.some((i) => i.name === intervention.name);
              const intCode = intervention.code ? String(intervention.code) : '';
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleAiIntervention(intervention)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {intCode && (
                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          NIC {intCode}
                        </Badge>
                      )}
                      <p className="text-sm font-medium">{intervention.name}</p>
                    </div>
                    {intervention.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{intervention.description}</p>
                    )}
                    {intervention.category && (
                      <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0">
                        {intervention.category}
                      </Badge>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Custom interventions */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Add Custom Intervention
        </p>
        <div className="space-y-3">
          {/* NIC Code selector */}
          <CodeCombobox
            label="NIC Intervention Code (Optional)"
            helperText="NIC Ref: Search for a standard NIC intervention by code number (e.g., 6680). You can also type a custom name below."
            value={customNicCode}
            onSelect={handleNicCodeSelect}
            options={nicOptions}
            searchFn={(query) => searchNicInterventions(query).map((n) => ({
              code: n.code,
              name: n.name,
              description: n.description,
              category: n.category,
            }))}
            placeholder="Type NIC code (e.g., 6680) or keyword..."
            emptyMessage="No NIC interventions found."
            categoryColors={nicCategoryColors}
            infoTooltip="Type first digit to see NIC suggestions"
            id="nic-custom-combobox"
            prominentCode
          />
          {/* Custom name input */}
          <div className="flex gap-2">
            <Input
              placeholder={customNicName ? `Using: ${customNicName}` : 'Or type custom intervention name...'}
              value={customNicName ? '' : customIntervention}
              onChange={(e) => {
                setCustomIntervention(e.target.value);
                if (e.target.value) {
                  setCustomNicCode('');
                  setCustomNicName('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomInterventionWithCode();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={addCustomInterventionWithCode}
              disabled={!customIntervention.trim() && !customNicCode}
              size="icon"
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Selected / custom interventions list */}
        {selectedInterventions.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Selected Interventions ({selectedInterventions.length})
            </p>
            {selectedInterventions.map((intervention, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20"
              >
                <CheckCircle2 className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {intervention.code && (
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        NIC {intervention.code}
                      </Badge>
                    )}
                    <p className="text-sm font-medium truncate">{intervention.name}</p>
                  </div>
                  {intervention.description && (
                    <p className="text-xs text-muted-foreground truncate">{intervention.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-600"
                  onClick={() => removeIntervention(intervention.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {selectedInterventions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No interventions selected yet. Select from AI suggestions or add custom ones above.
          </p>
        )}
      </div>
    </div>
  );

  // ─── Step 6: Evaluation (NOC) ───────────────────────────────────────────

  const evalOptions = [
    {
      value: 'achieved',
      label: 'Achieved',
      description: 'Goals fully met, patient stabilized',
      color: 'green',
      border: 'border-green-400',
      bg: 'bg-green-50',
      text: 'text-green-800',
    },
    {
      value: 'partially',
      label: 'Partially Achieved',
      description: 'Some improvement, goals partially met',
      color: 'yellow',
      border: 'border-yellow-400',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
    },
    {
      value: 'not_achieved',
      label: 'Not Achieved',
      description: 'No improvement or condition worsened',
      color: 'red',
      border: 'border-red-400',
      bg: 'bg-red-50',
      text: 'text-red-800',
    },
  ] as const;

  const StepEvaluation = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">NOC Evaluation Status</h3>
        <p className="text-sm text-muted-foreground">
          Assess whether the nursing outcomes criteria have been met.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {evalOptions.map((opt) => {
          const isSelected = evaluationStatus === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setEvaluationStatus(opt.value); markDirty(); }}
              className={`
                relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200
                ${isSelected ? `${opt.border} ${opt.bg} shadow-md scale-[1.02]` : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-rose-600" />
                </div>
              )}
              <div className={`text-center`}>
                <p className={`font-semibold text-sm ${isSelected ? opt.text : 'text-foreground'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Per-Intervention Evaluation */}
      {selectedInterventions.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-rose-500" />
              Per-Intervention Evaluation ({selectedInterventions.length})
            </h4>
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {selectedInterventions.map((intervention, idx) => {
                const eval_ = interventionEvals[idx] || { nicCode: intervention.code || '', status: '', nocOutcome: '', notes: '' };
                return (
                  <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {intervention.code && (
                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          NIC {intervention.code}
                        </Badge>
                      )}
                      <span className="text-sm font-medium truncate">{intervention.name}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Evaluation Status</Label>
                        <Select value={eval_.status} onValueChange={(v) => updateInterventionEval(idx, 'status', v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="achieved">Achieved</SelectItem>
                            <SelectItem value="partially">Partially Achieved</SelectItem>
                            <SelectItem value="not_achieved">Not Achieved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">NOC Outcome</Label>
                        <Input
                          placeholder="e.g., Patient reports reduced pain"
                          className="h-9 text-xs"
                          value={eval_.nocOutcome}
                          onChange={(e) => updateInterventionEval(idx, 'nocOutcome', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        placeholder="Evaluation notes for this intervention..."
                        className="min-h-[60px] resize-none text-xs"
                        value={eval_.notes}
                        onChange={(e) => updateInterventionEval(idx, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="evaluationNotes">Overall Evaluation Notes</Label>
        <Textarea
          id="evaluationNotes"
          placeholder="Document the evaluation findings, patient response, and follow-up plan..."
          className="min-h-[100px] resize-y"
          value={evaluationNotes}
          onFocus={() => handleFieldFocus('evaluationNotes')}
          onChange={(e) => { setEvaluationNotes(e.target.value); markDirty(); }}
        />
      </div>
    </div>
  );

  // ─── Referral Helper Components ──────────────────────────────────────

  const ReferralSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h5 className="text-sm font-semibold text-rose-700 border-b border-rose-100 pb-1 mb-2 print:text-rose-800 print:border-rose-200">
        {title}
      </h5>
      <div className="space-y-1.5 pl-1">{children}</div>
    </div>
  );

  const ReferralRow = ({ label, value }: { label: string; value: string }) => (
    <div>
      <span className="referral-label">{label}</span>
      <p className="referral-value whitespace-pre-wrap">{value}</p>
    </div>
  );

  // ─── Step 7: Referral ───────────────────────────────────────────────────

  const StepReferral = () => (
    <div className="space-y-4">
      {/* Referral Options — shown before generating */}
      {!referralSummary && !referralLoading && (
        <div className="space-y-6">
          <div className="text-center py-4">
            <FileText className="h-12 w-12 text-rose-300 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Referral Details</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure the referral details before generating the referral summary document.
            </p>
          </div>

          <div className="space-y-4 max-w-xl mx-auto">
            {/* Type of Referral */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileOutput className="h-3.5 w-3.5 text-muted-foreground" />
                Type of Referral
              </Label>
              <Select value={referralType} onValueChange={(v) => { setReferralType(v); markDirty(); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select referral type" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Referral Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                Referral Priority
              </Label>
              <Select value={referralPriority} onValueChange={(v) => { setReferralPriority(v); markDirty(); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority level" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Facility Info */}
            <div className="space-y-2">
              <Label htmlFor="referralFacility" className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Referral Facility
              </Label>
              <Textarea
                id="referralFacility"
                placeholder="Facility name, address, contact information..."
                className="min-h-[80px] resize-y"
                value={referralFacility}
                onFocus={() => handleFieldFocus('referralFacility')}
                onChange={(e) => { setReferralFacility(e.target.value); markDirty(); }}
              />
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerateReferral}
              size="lg"
              className="w-full gap-2 bg-rose-600 hover:bg-rose-700"
            >
              <FileText className="h-4.5 w-4.5" />
              Generate Referral Summary
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {referralLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-10 w-10 text-rose-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-medium">Generating referral summary...</p>
        </div>
      )}

      {/* Referral content */}
      {referralSummary && !referralLoading && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" onClick={handleCopyToClipboard} className="gap-2">
              <Copy className="h-3.5 w-3.5" />
              Copy to Clipboard
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
              <FileOutput className="h-3.5 w-3.5" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleGenerateReferral} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${referralLoading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>

          {/* Formatted Referral Card */}
          <div className="referral-card rounded-xl border border-gray-200 overflow-hidden bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white px-6 py-4 print:bg-rose-600">
              <div className="flex items-center gap-3">
                <Baby className="h-6 w-6" />
                <div>
                  <h4 className="font-bold text-base tracking-wide">MOMTERNAL</h4>
                  <p className="text-rose-100 text-xs">Maternal Health Referral Summary</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5 print:p-4 print:space-y-3">
              {/* Patient Information */}
              <ReferralSection title="Patient Information">
                <ReferralRow label="Name" value={consultation.patient.name} />
                <ReferralRow label="Patient ID" value={consultation.patient.patientId} />
                {consultation.patient.dateOfBirth && (
                  <ReferralRow label="Date of Birth" value={consultation.patient.dateOfBirth} />
                )}
                {consultation.patient.bloodType && (
                  <ReferralRow label="Blood Type" value={consultation.patient.bloodType} />
                )}
                {consultation.patient.aog && (
                  <ReferralRow label="Age of Gestation" value={consultation.patient.aog} />
                )}
                {consultation.patient.gravidity !== undefined && (
                  <ReferralRow label="Gravidity" value={String(consultation.patient.gravidity)} />
                )}
                {consultation.patient.parity !== undefined && (
                  <ReferralRow label="Parity" value={String(consultation.patient.parity)} />
                )}
                {riskLevel && (
                  <ReferralRow
                    label="Risk Level"
                    value={riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                  />
                )}
              </ReferralSection>

              {/* Clinical Assessment (SOAP) */}
              <ReferralSection title="Clinical Assessment (SOAP)">
                {subjectiveSymptoms && (
                  <div>
                    <span className="referral-label">Subjective — Symptoms / Chief Complaint</span>
                    <p className="referral-value whitespace-pre-wrap">{subjectiveSymptoms}</p>
                  </div>
                )}
                <div>
                  <span className="referral-label">Objective — Vital Signs</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-1">
                    {vitals.bloodPressure && (
                      <span className="referral-value text-xs"><strong>BP:</strong> {vitals.bloodPressure}</span>
                    )}
                    {vitals.heartRate && (
                      <span className="referral-value text-xs"><strong>HR:</strong> {vitals.heartRate}</span>
                    )}
                    {vitals.temperature && (
                      <span className="referral-value text-xs"><strong>Temp:</strong> {vitals.temperature}</span>
                    )}
                    {vitals.weight && (
                      <span className="referral-value text-xs"><strong>Weight:</strong> {vitals.weight}</span>
                    )}
                    {vitals.respiratoryRate && (
                      <span className="referral-value text-xs"><strong>RR:</strong> {vitals.respiratoryRate}</span>
                    )}
                  </div>
                  {(fetalHeartRate || fundalHeight) && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                      {fetalHeartRate && (
                        <span className="referral-value text-xs"><strong>FHR:</strong> {fetalHeartRate}</span>
                      )}
                      {fundalHeight && (
                        <span className="referral-value text-xs"><strong>Fundal Height:</strong> {fundalHeight}</span>
                      )}
                    </div>
                  )}
                </div>
                {allergies && (
                  <ReferralRow label="Allergies" value={allergies} />
                )}
                {medications && (
                  <ReferralRow label="Current Medications" value={medications} />
                )}
              </ReferralSection>

              {/* Findings */}
              {(physicalExam || labResults || notes) && (
                <ReferralSection title="Additional Findings">
                  {physicalExam && (
                    <ReferralRow label="Physical Examination" value={physicalExam} />
                  )}
                  {labResults && (
                    <ReferralRow label="Laboratory Results" value={labResults} />
                  )}
                  {notes && (
                    <ReferralRow label="Additional Notes" value={notes} />
                  )}
                </ReferralSection>
              )}

              {/* Diagnosis */}
              {(icd10Diagnosis || nandaDiagnosis) && (
                <ReferralSection title="Diagnosis">
                  {icd10Diagnosis && (
                    <ReferralRow label="ICD-10 Diagnosis" value={icd10Diagnosis} />
                  )}
                  {nandaDiagnosis && (
                    <ReferralRow label="NANDA-I Nursing Diagnosis" value={nandaDiagnosis} />
                  )}
                </ReferralSection>
              )}

              {/* AI Interventions */}
              {selectedInterventions.length > 0 && (
                <ReferralSection title="AI-Suggested Interventions (NIC)">
                  <ul className="list-disc list-inside space-y-1">
                    {selectedInterventions.map((intervention, idx) => (
                      <li key={idx} className="referral-value text-sm">
                        {intervention.name}
                        {intervention.description && (
                          <span className="text-muted-foreground"> — {intervention.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {aiSuggestions?.priorityIntervention && (
                    <div className="mt-2 p-2 bg-rose-50 rounded-lg border border-rose-100 print:bg-rose-50 print:border-rose-200">
                      <span className="text-xs font-semibold text-rose-700">Priority: </span>
                      <span className="text-xs text-rose-800">{aiSuggestions.priorityIntervention}</span>
                    </div>
                  )}
                </ReferralSection>
              )}

              {/* Evaluation */}
              {evaluationStatus && (
                <ReferralSection title="Evaluation (NOC)">
                  <ReferralRow
                    label="Status"
                    value={evaluationStatus === 'achieved'
                      ? 'Achieved'
                      : evaluationStatus === 'partially'
                        ? 'Partially Achieved'
                        : 'Not Achieved'}
                  />
                  {evaluationNotes && (
                    <ReferralRow label="Notes" value={evaluationNotes} />
                  )}
                </ReferralSection>
              )}

              {/* Footer */}
              <div className="border-t border-gray-200 pt-3 mt-4 print:border-gray-300">
                <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>Consultation: {consultation.consultationNo}</span>
                  <span>Date: {new Date(consultation.consultationDate).toLocaleDateString()}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Generated by MOMternal — Maternal Health Nursing Assessment System
                </div>
              </div>
            </div>
          </div>

          {/* Complete button */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              onClick={handleComplete}
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              Complete Consultation
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Step Renderer ──────────────────────────────────────────────────────

  const stepMeta = STEP_META[currentStep];
  const StepIcon = stepMeta.icon;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return StepAssessment();
      case 1:
        return StepFindings();
      case 2:
        return StepDiagnosis();
      case 3:
        return StepRisk();
      case 4:
        return StepAiSuggest();
      case 5:
        return StepHITL();
      case 6:
        return StepEvaluation();
      case 7:
        return StepReferral();
      default:
        return null;
    }
  };

  const stepDescriptions: Record<number, string> = {
    0: 'Document the patient\'s subjective symptoms and objective vital signs using the SOAP format.',
    1: 'Record physical examination findings, laboratory results, and additional notes.',
    2: 'Enter ICD-10 medical diagnosis and NANDA-I nursing diagnosis.',
    3: 'Classify the patient\'s current risk level based on the assessment data.',
    4: 'Generate AI-assisted NIC nursing intervention suggestions.',
    5: 'Review and select interventions to apply (Human-in-the-Loop).',
    6: 'Evaluate the nursing outcomes using NOC criteria.',
    7: 'Generate and finalize the referral summary document.',
  };

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {PatientHeader()}
      {ResumeBanner()}
      {StepProgress()}
      {ExitConfirmDialog()}

      {/* Step Card */}
      <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
              <StepIcon className="h-4.5 w-4.5 text-rose-600" />
            </div>
            <div>
              <CardTitle className="text-base">
                Step {currentStep + 1}: {stepMeta.label}
              </CardTitle>
              <CardDescription>{stepDescriptions[currentStep]}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar py-2">
            {renderStep()}
          </div>
        </CardContent>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/80">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || saving}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {saving && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {!saving && isInitialized.current && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Save className="h-3 w-3" />
                <span>Auto-saved</span>
              </div>
            )}
          </div>

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              onClick={handleNext}
              disabled={saving || !canProceed()}
              className="gap-2 bg-rose-600 hover:bg-rose-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={saving}
              variant="default"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
