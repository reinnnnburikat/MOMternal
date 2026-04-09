'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  User,
  MapPin,
  Phone,
  Calendar,
  Baby,
  AlertTriangle,
  FileText,
  ClipboardList,
  Plus,
  ChevronRight,
  Clock,
  Activity,
  Heart,
  Stethoscope,
  UserCheck,
  CheckCircle2,
  Briefcase,
  Cross,
  Users,
  Wallet,
  Scissors,
  Syringe,
  Pill,
  Leaf,
  Brain,
  Tag,
  Home,
  PenLine,
  Ruler,
  Weight,
  Thermometer,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

interface PatientData {
  id: string;
  patientId: string;
  surname: string;
  firstName: string;
  middleInitial: string | null;
  nameExtension: string | null;
  name: string;
  dateOfBirth: string;
  age: number | null;
  address: string;
  barangay: string | null;
  blockLotStreet: string | null;
  contactNumber: string | null;
  emergencyContact: string | null;
  emergencyRelation: string | null;
  occupation: string | null;
  religion: string | null;
  maritalStatus: string | null;
  familyComposition: string | null;
  incomeBracket: string | null;
  // Health history fields (may be plain text or JSON)
  allergies: string | null;
  medicalHistory: string | null;
  surgicalHistory: string | null;
  familyHistory: string | null;
  obstetricHistory: string | null;
  immunizationStatus: string | null;
  currentMedications: string | null;
  healthPractices: string | null;
  socialHistory: string | null;
  psychosocialHistory: string | null;
  riskLevel: string;
  consultations: ConsultationData[];
  createdAt: string;
}

interface ConsultationData {
  id: string;
  consultationNo: string;
  consultationDate: string;
  status: string;
  riskLevel: string;
  stepCompleted: number;
  evaluationStatus: string | null;
  referralStatus: string;
  createdAt: string;
  updatedAt: string;
  // Per-visit OB history (migrated from Patient)
  gravidity?: number;
  parity?: number;
  lmp?: string;
  aog?: string;
  bloodType?: string;
  // New assessment fields
  chiefComplaint?: string | null;
  height?: string | null;
  weight?: string | null;
  bmi?: string | null;
  // Existing fields
  subjectiveSymptoms?: string | null;
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
  selectedInterventions?: string | null;
  evaluationNotes?: string | null;
  referralSummary?: string | null;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

const RISK_LABELS: Record<string, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
};

const RISK_CLASSES: Record<string, string> = {
  low: 'risk-low',
  moderate: 'risk-moderate',
  high: 'risk-high',
};

const STEP_LABELS: Record<number, string> = {
  0: 'Assessment',
  1: 'Health History',
  2: 'Additional Findings',
  3: 'Diagnosis',
  4: 'AI Summary',
  5: 'Care Plan',
  6: 'Referral',
};

const STATUS_STYLES: Record<string, string> = {
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-sm font-medium text-foreground ${
            valueClassName ?? ''
          }`}
        >
          {value || 'Not recorded'}
        </p>
      </div>
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-gray-100 dark:border-gray-700/50 my-1" />;
}

// ---------------------------------------------------------------------------
// Structured JSON health field display
// ---------------------------------------------------------------------------

/** Format a camelCase key into a readable label */
function formatJsonKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/** Format a value from the health history JSON structure */
function formatJsonValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val || 'Not specified';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return val.join(', ') || 'None';
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    // Pattern: { selected: string[], othersSpecify/othersText: string }
    if (Array.isArray(obj.selected)) {
      const parts = obj.selected.filter(Boolean);
      const othersVal = obj.othersSpecify || obj.othersText;
      if (othersVal) parts.push(String(othersVal));
      return parts.join(', ') || 'None';
    }
    // Pattern: { answer: string, ...details }
    if (typeof obj.answer === 'string') {
      const details = Object.entries(obj)
        .filter(([k, v]) => k !== 'answer' && v && String(v).trim() !== '')
        .map(([, v]) => String(v))
        .join(', ');
      return details ? `${obj.answer} — ${details}` : obj.answer;
    }
    // Fallback: show all key-value pairs
    return Object.entries(obj)
      .map(([k, v]) => `${formatJsonKey(k)}: ${formatJsonValue(v)}`)
      .join(', ');
  }
  return String(val);
}

/**
 * Renders a health history field that may be plain text or structured JSON.
 * If the value starts with `{`, it's parsed and displayed as key-value pairs.
 * Otherwise it falls back to plain text display (backward compatibility).
 */
function JsonHealthRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  valueClassName?: string;
}) {
  const parsed = useMemo(() => {
    if (!value || !value.trim().startsWith('{')) return null;
    try {
      const obj = JSON.parse(value);
      return typeof obj === 'object' && obj !== null ? obj : null;
    } catch {
      return null;
    }
  }, [value]);

  if (!parsed) {
    return <InfoRow icon={Icon} label={label} value={value} valueClassName={valueClassName} />;
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground space-y-1 mt-0.5">
          {Object.entries(parsed).map(([key, val]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="text-[11px] text-muted-foreground min-w-[90px] flex-shrink-0 pt-px">
                {formatJsonKey(key)}:
              </span>
              <span className={`font-medium ${valueClassName ?? ''}`}>
                {formatJsonValue(val) || 'None'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vitals & Intervention helpers
// ---------------------------------------------------------------------------

function VitalsDisplay({ raw }: { raw: string }) {
  const vitals = useMemo(() => {
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return null;
    }
  }, [raw]);

  if (!vitals) {
    return <p className="text-sm text-foreground">{raw}</p>;
  }

  return (
    <div className="space-y-1 text-sm">
      {Object.entries(vitals).map(([key, value]) => (
        <div key={key} className="flex justify-between">
          <span className="text-xs text-muted-foreground capitalize">
            {key.replace(/([A-Z])/g, ' $1')}
          </span>
          <span className="font-medium text-foreground">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function InterventionList({ raw }: { raw: string }) {
  const items = useMemo(() => {
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.map((item: unknown) =>
        typeof item === 'string'
          ? item
          : (item as Record<string, string>)?.name || JSON.stringify(item),
      );
    } catch {
      return [] as string[];
    }
  }, [raw]);

  if (items.length === 0) {
    return <p className="text-sm text-foreground">{raw}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {items.map((name, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
          <span className="text-sm text-foreground">{name}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PatientProfileView() {
  const selectedPatientId = useAppStore((s) => s.selectedPatientId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedConsultationId = useAppStore(
    (s) => s.setSelectedConsultationId,
  );
  const currentNurse = useAppStore((s) => s.currentNurse);

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingConsultation, setIsCreatingConsultation] = useState(false);
  const [viewingConsultation, setViewingConsultation] =
    useState<ConsultationData | null>(null);

  useEffect(() => {
    if (!selectedPatientId) {
      setCurrentView('patients');
      return;
    }

    async function fetchPatient() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/patients/${selectedPatientId}`);
        const data = await res.json();

        if (data.success) {
          setPatient(data.data);
        } else {
          toast.error(data.error || 'Failed to fetch patient');
          setCurrentView('patients');
        }
      } catch {
        toast.error('Connection error. Please try again.');
        setCurrentView('patients');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatient();
  }, [selectedPatientId, setCurrentView]);

  const handleNewConsultation = async () => {
    if (!patient || !currentNurse) return;
    setIsCreatingConsultation(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nurseId: currentNurse.id }),
      });

      const data = await res.json();

      if (data.success) {
        setSelectedConsultationId(data.data.id);
        setCurrentView('consultation');
        toast.success('Consultation created successfully');
      } else {
        toast.error(data.error || 'Failed to create consultation');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsCreatingConsultation(false);
    }
  };

  const handleViewConsultation = (consultation: ConsultationData) => {
    if (consultation.status === 'completed') {
      setViewingConsultation(consultation);
    } else {
      setSelectedConsultationId(consultation.id);
      setCurrentView('consultation');
    }
  };

  const handleUpdateEvaluation = (consultation: ConsultationData) => {
    setSelectedConsultationId(consultation.id);
    setCurrentView('consultation');
  };

  // ------------------------------------------------------------------
  // Loading / not-found states
  // ------------------------------------------------------------------

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Patient not found.</p>
        <Button
          variant="outline"
          className="mt-3 border-rose-200"
          onClick={() => setCurrentView('patients')}
        >
          Back to Patients
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Computed helpers
  // ------------------------------------------------------------------

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const displayAge = patient.age ?? calculateAge(patient.dateOfBirth);
  const displayDOB = format(new Date(patient.dateOfBirth), 'MMMM d, yyyy');

  // Latest consultation for the summary card
  const latestConsultation = patient.consultations.length > 0
    ? patient.consultations[0]
    : null;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-foreground">
              {patient.name}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                RISK_CLASSES[patient.riskLevel] || RISK_CLASSES.low
              }`}
            >
              {RISK_LABELS[patient.riskLevel] || 'Low Risk'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant="outline"
              className="text-[10px] font-mono px-1.5 py-0 border-rose-200 text-rose-600"
            >
              {patient.patientId}
            </Badge>
            <span>{displayAge} years old</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {patient.barangay
                ? `Brgy. ${patient.barangay}`
                : patient.address}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3 Info Cards Grid                                              */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ----------------------------------------------------------- */}
        {/* Card 1: Demographics                                         */}
        {/* ----------------------------------------------------------- */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-rose-500" />
              Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            <InfoRow
              icon={User}
              label="Full Name"
              value={patient.name}
              valueClassName="font-semibold text-foreground"
            />

            <InfoRow
              icon={Tag}
              label="Patient ID"
              value={patient.patientId}
            />

            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={`${displayDOB} (${displayAge} yrs)`}
            />

            <InfoRow
              icon={Home}
              label="Address"
              value={
                patient.barangay
                  ? `Brgy. ${patient.barangay}`
                  : patient.address
              }
            />

            <InfoRow
              icon={MapPin}
              label="Block/Lot/Street"
              value={patient.blockLotStreet}
            />

            <InfoRow
              icon={Phone}
              label="Contact Number"
              value={patient.contactNumber}
            />

            <SectionDivider />

            <InfoRow
              icon={Briefcase}
              label="Occupation"
              value={patient.occupation}
            />

            <InfoRow
              icon={Cross}
              label="Religion"
              value={patient.religion}
            />

            <InfoRow
              icon={Heart}
              label="Marital Status"
              value={patient.maritalStatus}
            />

            <InfoRow
              icon={Users}
              label="Family Composition"
              value={patient.familyComposition}
            />

            <InfoRow
              icon={Wallet}
              label="Income Bracket"
              value={patient.incomeBracket}
            />
          </CardContent>
        </Card>

        {/* ----------------------------------------------------------- */}
        {/* Card 2: Consultation Summary                                  */}
        {/* ----------------------------------------------------------- */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-rose-500" />
              Consultation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            {latestConsultation ? (
              <>
                {/* Risk Level — prominent badge */}
                <div className="flex items-start gap-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <span
                      className={`inline-flex items-center mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        RISK_CLASSES[latestConsultation.riskLevel] ||
                        RISK_CLASSES.low
                      }`}
                    >
                      {RISK_LABELS[latestConsultation.riskLevel] ||
                        'Low Risk'}
                    </span>
                  </div>
                </div>

                {/* Latest consultation date */}
                <InfoRow
                  icon={Calendar}
                  label="Latest Consultation"
                  value={format(
                    new Date(latestConsultation.consultationDate),
                    'MMMM d, yyyy',
                  )}
                />

                {/* Consultation number */}
                <InfoRow
                  icon={FileText}
                  label="Consultation No."
                  value={latestConsultation.consultationNo}
                />

                {/* Status */}
                <div className="flex items-start gap-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span
                      className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        STATUS_STYLES[latestConsultation.status] ||
                        STATUS_STYLES.in_progress
                      }`}
                    >
                      {latestConsultation.status === 'completed'
                        ? 'Completed'
                        : 'In Progress'}
                    </span>
                  </div>
                </div>

                {/* Per-visit OB History (from latest consultation) */}
                {typeof latestConsultation.gravidity === 'number' &&
                  typeof latestConsultation.parity === 'number' && (
                    <div className="flex items-start gap-3 py-2">
                      <Activity className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Gravidity / Parity
                        </p>
                        <p className="text-lg font-bold text-foreground leading-tight mt-0.5">
                          G<sub>{latestConsultation.gravidity}</sub> P
                          <sub>{latestConsultation.parity}</sub>
                        </p>
                      </div>
                    </div>
                  )}

                {latestConsultation.lmp && (
                  <InfoRow
                    icon={Calendar}
                    label="Last Menstrual Period"
                    value={format(
                      new Date(latestConsultation.lmp),
                      'MMMM d, yyyy',
                    )}
                  />
                )}

                {latestConsultation.aog && (
                  <InfoRow
                    icon={Clock}
                    label="Age of Gestation"
                    value={latestConsultation.aog}
                    valueClassName="text-rose-600 font-bold"
                  />
                )}

                {latestConsultation.bloodType && (
                  <InfoRow
                    icon={Thermometer}
                    label="Blood Type"
                    value={latestConsultation.bloodType}
                  />
                )}

                {/* Chief Complaint */}
                {latestConsultation.chiefComplaint && (
                  <InfoRow
                    icon={Stethoscope}
                    label="Chief Complaint"
                    value={latestConsultation.chiefComplaint}
                  />
                )}

                {/* Height / Weight / BMI */}
                {(latestConsultation.height ||
                  latestConsultation.weight ||
                  latestConsultation.bmi) && (
                  <>
                    <SectionDivider />
                    {latestConsultation.height && (
                      <InfoRow
                        icon={Ruler}
                        label="Height"
                        value={`${latestConsultation.height} cm`}
                      />
                    )}
                    {latestConsultation.weight && (
                      <InfoRow
                        icon={Weight}
                        label="Weight"
                        value={`${latestConsultation.weight} kg`}
                      />
                    )}
                    {latestConsultation.bmi && (
                      <InfoRow
                        icon={Activity}
                        label="BMI"
                        value={latestConsultation.bmi}
                      />
                    )}
                  </>
                )}

                {/* Referral info */}
                {latestConsultation.referralStatus &&
                  latestConsultation.referralStatus !== 'none' && (
                    <>
                      <SectionDivider />
                      <InfoRow
                        icon={AlertTriangle}
                        label="Referral Status"
                        value={
                          latestConsultation.referralStatus === 'completed'
                            ? 'Referred'
                            : 'Pending'
                        }
                        valueClassName="text-amber-600"
                      />
                    </>
                  )}
              </>
            ) : (
              /* No consultations yet */
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-3">
                  <ClipboardList className="h-5 w-5 text-rose-300" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No consultation recorded
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                  onClick={handleNewConsultation}
                  disabled={isCreatingConsultation}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Start First Consultation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ----------------------------------------------------------- */}
        {/* Card 3: Health History                                        */}
        {/* ----------------------------------------------------------- */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-rose-500" />
              Health History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0 max-h-[520px] overflow-y-auto custom-scrollbar">
            {/* Allergies — red when present */}
            <div className="flex items-start gap-3 py-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Allergies</p>
                <p
                  className={`text-sm font-medium ${
                    patient.allergies
                      ? 'text-red-600 font-semibold'
                      : 'text-muted-foreground'
                  }`}
                >
                  {patient.allergies || 'None recorded'}
                </p>
              </div>
            </div>

            <SectionDivider />

            {/* Medical History — may be plain text or structured JSON */}
            <JsonHealthRow
              icon={Stethoscope}
              label="Medical History"
              value={patient.medicalHistory}
            />

            {/* Surgical History — may be plain text or structured JSON */}
            <JsonHealthRow
              icon={Scissors}
              label="Surgical History"
              value={patient.surgicalHistory}
            />

            {/* Family Health History — may be plain text or structured JSON */}
            <JsonHealthRow
              icon={Users}
              label="Family Health History"
              value={patient.familyHistory}
            />

            {/* Obstetric History — may be plain text or structured JSON */}
            <JsonHealthRow
              icon={Baby}
              label="Obstetric History"
              value={patient.obstetricHistory}
            />

            <SectionDivider />

            <InfoRow
              icon={Syringe}
              label="Immunization Status"
              value={patient.immunizationStatus}
            />

            <InfoRow
              icon={Pill}
              label="Current Medications"
              value={patient.currentMedications}
            />

            <SectionDivider />

            <InfoRow
              icon={Leaf}
              label="Health Practices"
              value={patient.healthPractices}
            />

            <InfoRow
              icon={Users}
              label="Social History"
              value={patient.socialHistory}
            />

            <InfoRow
              icon={Brain}
              label="Psychosocial History"
              value={patient.psychosocialHistory}
            />
          </CardContent>
        </Card>
      </div>

      {/* ============================================================= */}
      {/* Card 4: Consultation History                                   */}
      {/* ============================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">
            Consultation History ({patient.consultations.length})
          </h3>
          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            disabled={isCreatingConsultation}
            onClick={handleNewConsultation}
          >
            {isCreatingConsultation ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                New Consultation
              </>
            )}
          </Button>
        </div>

        {patient.consultations.length === 0 ? (
          <Card className="border border-dashed border-rose-200 dark:border-rose-800/40 bg-white dark:bg-gray-900">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-3">
                <ClipboardList className="h-6 w-6 text-rose-300" />
              </div>
              <p className="text-sm text-muted-foreground">
                No consultations recorded yet.
              </p>
              <Button
                size="sm"
                className="mt-3 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                onClick={handleNewConsultation}
                disabled={isCreatingConsultation}
              >
                <Plus className="h-3.5 w-3.5" />
                Start First Consultation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {patient.consultations.map((consultation) => (
              <Card
                key={consultation.id}
                className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 hover:shadow-md transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Top line: Consultation No + Date */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground font-mono">
                          {consultation.consultationNo}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(consultation.consultationDate),
                            'MMM d, yyyy',
                          )}
                        </span>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            RISK_CLASSES[consultation.riskLevel] ||
                            RISK_CLASSES.low
                          }`}
                        >
                          {RISK_LABELS[consultation.riskLevel] || 'Low Risk'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            STATUS_STYLES[consultation.status] ||
                            STATUS_STYLES.in_progress
                          }`}
                        >
                          {consultation.status === 'completed'
                            ? 'Completed'
                            : 'In Progress'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {consultation.stepCompleted >= 6
                            ? 'All steps completed'
                            : `Step ${consultation.stepCompleted + 1} of 7 — ${STEP_LABELS[consultation.stepCompleted + 1] || 'In Progress'}`}
                        </span>
                      </div>

                      {/* Referral info */}
                      {consultation.referralStatus &&
                        consultation.referralStatus !== 'none' && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Referral: {consultation.referralStatus}
                          </p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {consultation.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-amber-200 hover:bg-amber-50 text-amber-700 gap-1"
                          onClick={(e) => { e.stopPropagation(); handleUpdateEvaluation(consultation); }}
                        >
                          <PenLine className="h-3 w-3" />
                          Update
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-rose-200 hover:bg-rose-50 gap-1"
                        onClick={() => handleViewConsultation(consultation)}
                      >
                        View
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* Consultation Detail Dialog                                     */}
      {/* ============================================================= */}
      <Dialog
        open={!!viewingConsultation}
        onOpenChange={(open) => !open && setViewingConsultation(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-sm text-rose-600">
                {viewingConsultation?.consultationNo}
              </span>
              <span className="text-xs text-muted-foreground">
                {viewingConsultation &&
                  format(
                    new Date(viewingConsultation.consultationDate),
                    'MMMM d, yyyy',
                  )}
              </span>
            </DialogTitle>
          </DialogHeader>
          {viewingConsultation && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    RISK_CLASSES[viewingConsultation.riskLevel] ||
                    RISK_CLASSES.low
                  }`}
                >
                  {RISK_LABELS[viewingConsultation.riskLevel] || 'Low Risk'}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Completed
                </span>
                {viewingConsultation.referralStatus === 'completed' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200">
                    Referred
                  </span>
                )}
              </div>

              {/* Per-visit OB History from consultation */}
              {(viewingConsultation.chiefComplaint ||
                viewingConsultation.height ||
                viewingConsultation.weight ||
                viewingConsultation.bmi ||
                viewingConsultation.gravidity ||
                viewingConsultation.parity ||
                viewingConsultation.lmp ||
                viewingConsultation.aog ||
                viewingConsultation.bloodType) && (
                <div className="rounded-lg border border-rose-100 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Visit Overview
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {viewingConsultation.chiefComplaint && (
                      <div className="col-span-2 sm:col-span-3">
                        <p className="text-[10px] text-muted-foreground">
                          Chief Complaint
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {viewingConsultation.chiefComplaint}
                        </p>
                      </div>
                    )}
                    {typeof viewingConsultation.gravidity === 'number' &&
                      typeof viewingConsultation.parity === 'number' && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            G/P
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            G{viewingConsultation.gravidity} P{viewingConsultation.parity}
                          </p>
                        </div>
                      )}
                    {viewingConsultation.lmp && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          LMP
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {format(
                            new Date(viewingConsultation.lmp),
                            'MMM d, yyyy',
                          )}
                        </p>
                      </div>
                    )}
                    {viewingConsultation.aog && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          AOG
                        </p>
                        <p className="text-sm font-medium text-rose-600 font-semibold">
                          {viewingConsultation.aog}
                        </p>
                      </div>
                    )}
                    {viewingConsultation.bloodType && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Blood Type
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {viewingConsultation.bloodType}
                        </p>
                      </div>
                    )}
                    {viewingConsultation.height && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Height
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {viewingConsultation.height} cm
                        </p>
                      </div>
                    )}
                    {viewingConsultation.weight && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Weight
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {viewingConsultation.weight} kg
                        </p>
                      </div>
                    )}
                    {viewingConsultation.bmi && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          BMI
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {viewingConsultation.bmi}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewingConsultation.subjectiveSymptoms && (
                <div className="rounded-lg border border-rose-100 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" /> Subjective (Symptoms)
                  </p>
                  <p className="text-sm text-foreground">
                    {viewingConsultation.subjectiveSymptoms}
                  </p>
                </div>
              )}

              {viewingConsultation.objectiveVitals && (
                <div className="rounded-lg border border-rose-100 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Objective (Vitals)
                  </p>
                  <VitalsDisplay raw={viewingConsultation.objectiveVitals} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {viewingConsultation.fetalHeartRate && (
                  <div className="rounded-lg border border-rose-100 p-3">
                    <p className="text-xs text-muted-foreground">
                      Fetal Heart Rate
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {viewingConsultation.fetalHeartRate}
                    </p>
                  </div>
                )}
                {viewingConsultation.fundalHeight && (
                  <div className="rounded-lg border border-rose-100 p-3">
                    <p className="text-xs text-muted-foreground">
                      Fundal Height
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {viewingConsultation.fundalHeight}
                    </p>
                  </div>
                )}
              </div>

              {(
                viewingConsultation.physicalExam ||
                viewingConsultation.labResults
              ) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewingConsultation.physicalExam && (
                    <div className="rounded-lg border border-rose-100 p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Physical Exam
                      </p>
                      <p className="text-sm text-foreground">
                        {viewingConsultation.physicalExam}
                      </p>
                    </div>
                  )}
                  {viewingConsultation.labResults && (
                    <div className="rounded-lg border border-rose-100 p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Lab Results
                      </p>
                      <p className="text-sm text-foreground">
                        {viewingConsultation.labResults}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(
                viewingConsultation.icd10Diagnosis ||
                viewingConsultation.nandaDiagnosis
              ) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">
                    Diagnosis
                  </h4>
                  {viewingConsultation.icd10Diagnosis && (
                    <div className="rounded-lg border border-rose-100 p-3">
                      <p className="text-xs text-muted-foreground">ICD-10</p>
                      <p className="text-sm text-foreground">
                        {viewingConsultation.icd10Diagnosis}
                      </p>
                    </div>
                  )}
                  {viewingConsultation.nandaDiagnosis && (
                    <div className="rounded-lg border border-rose-100 p-3">
                      <p className="text-xs text-muted-foreground">NANDA-I</p>
                      <p className="text-sm text-foreground">
                        {viewingConsultation.nandaDiagnosis}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {viewingConsultation.selectedInterventions && (
                <div className="rounded-lg border border-rose-100 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> Selected Interventions
                  </p>
                  <InterventionList raw={viewingConsultation.selectedInterventions} />
                </div>
              )}

              {viewingConsultation.evaluationStatus && (
                <div className="rounded-lg border border-rose-100 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Evaluation (NOC)
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      viewingConsultation.evaluationStatus === 'achieved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : viewingConsultation.evaluationStatus === 'partially'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {viewingConsultation.evaluationStatus === 'achieved'
                      ? 'Achieved'
                      : viewingConsultation.evaluationStatus === 'partially'
                        ? 'Partially Achieved'
                        : 'Not Achieved'}
                  </span>
                  {viewingConsultation.evaluationNotes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {viewingConsultation.evaluationNotes}
                    </p>
                  )}
                </div>
              )}

              {viewingConsultation.referralSummary && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Referral Summary
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {viewingConsultation.referralSummary}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-200"
                  onClick={() => setViewingConsultation(null)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                  onClick={() => {
                    if (viewingConsultation) {
                      handleUpdateEvaluation(viewingConsultation);
                      setViewingConsultation(null);
                    }
                  }}
                >
                  <PenLine className="h-3 w-3" />
                  Update Evaluation
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
