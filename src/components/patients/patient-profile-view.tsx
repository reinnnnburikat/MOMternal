'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Droplets,
  AlertTriangle,
  FileText,
  ClipboardList,
  Plus,
  ChevronRight,
  Clock,
  Activity,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PatientData {
  id: string;
  patientId: string;
  name: string;
  dateOfBirth: string;
  address: string;
  contactNumber: string | null;
  emergencyContact: string | null;
  emergencyRelation: string | null;
  gravidity: number;
  parity: number;
  lmp: string | null;
  aog: string | null;
  bloodType: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  barangay: string | null;
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
}

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
  0: 'Not Started',
  1: 'Subjective',
  2: 'Objective',
  3: 'Findings',
  4: 'Diagnosis',
  5: 'Risk Assessment',
  6: 'AI Suggestions',
  7: 'Evaluation',
};

const STATUS_STYLES: Record<string, string> = {
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || 'Not recorded'}</p>
      </div>
    </div>
  );
}

export function PatientProfileView() {
  const selectedPatientId = useAppStore((s) => s.selectedPatientId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedConsultationId = useAppStore((s) => s.setSelectedConsultationId);
  const setSelectedPatientId = useAppStore((s) => s.setSelectedPatientId);
  const currentNurse = useAppStore((s) => s.currentNurse);

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingConsultation, setIsCreatingConsultation] = useState(false);

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

  const handleViewConsultation = (consultationId: string) => {
    setSelectedConsultationId(consultationId);
    setCurrentView('consultation');
  };

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

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-foreground">{patient.name}</h2>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                RISK_CLASSES[patient.riskLevel] || RISK_CLASSES.low
              }`}
            >
              {RISK_LABELS[patient.riskLevel] || 'Low Risk'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-rose-200 text-rose-600">
              {patient.patientId}
            </Badge>
            <span>{calculateAge(patient.dateOfBirth)} years old</span>
          </div>
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Demographics Card */}
        <Card className="border-rose-100/60">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-rose-500" />
              Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            <InfoRow icon={Calendar} label="Date of Birth" value={format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')} />
            <InfoRow icon={MapPin} label="Address" value={patient.barangay ? `${patient.address} — Brgy. ${patient.barangay}` : patient.address} />
            <InfoRow icon={Phone} label="Contact Number" value={patient.contactNumber} />
            <div className="flex items-start gap-3 py-2">
              <ShieldCheck className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Emergency Contact</p>
                <p className="text-sm font-medium text-foreground">
                  {patient.emergencyContact
                    ? `${patient.emergencyContact}${patient.emergencyRelation ? ` (${patient.emergencyRelation})` : ''}`
                    : 'Not recorded'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OB History Card */}
        <Card className="border-rose-100/60">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Baby className="h-4 w-4 text-rose-500" />
              OB History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            <div className="flex items-start gap-3 py-2">
              <Activity className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Gravidity / Parity</p>
                <p className="text-sm font-medium text-foreground">
                  G<sub>{patient.gravidity}</sub> P<sub>{patient.parity}</sub>
                </p>
              </div>
            </div>
            <InfoRow icon={Calendar} label="Last Menstrual Period" value={patient.lmp ? format(new Date(patient.lmp), 'MMMM d, yyyy') : null} />
            <div className="flex items-start gap-3 py-2">
              <Heart className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Age of Gestation</p>
                <p className={`text-sm font-bold ${patient.aog ? 'text-rose-600' : 'text-muted-foreground'}`}>
                  {patient.aog || 'Not available'}
                </p>
              </div>
            </div>
            <InfoRow icon={Droplets} label="Blood Type" value={patient.bloodType} />
          </CardContent>
        </Card>

        {/* Medical Card */}
        <Card className="border-rose-100/60">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-rose-500" />
              Medical Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            <div className="flex items-start gap-3 py-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Allergies</p>
                <p className={`text-sm font-medium ${patient.allergies ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {patient.allergies || 'None recorded'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <ClipboardList className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Medical History</p>
                <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                  {patient.medicalHistory || 'None recorded'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultation History */}
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
          <Card className="border-dashed border-rose-200">
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
              <Card key={consultation.id} className="border-rose-100/60 hover:shadow-sm transition-shadow">
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
                          {format(new Date(consultation.consultationDate), 'MMM d, yyyy')}
                        </span>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            RISK_CLASSES[consultation.riskLevel] || RISK_CLASSES.low
                          }`}
                        >
                          {RISK_LABELS[consultation.riskLevel] || 'Low Risk'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            STATUS_STYLES[consultation.status] || STATUS_STYLES.in_progress
                          }`}
                        >
                          {consultation.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Step {consultation.stepCompleted}/7 — {STEP_LABELS[consultation.stepCompleted] || 'Unknown'}
                        </span>
                      </div>

                      {/* Referral info */}
                      {consultation.referralStatus && consultation.referralStatus !== 'none' && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Referral: {consultation.referralStatus}
                        </p>
                      )}
                    </div>

                    {/* View button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-rose-200 hover:bg-rose-50 gap-1 flex-shrink-0"
                      onClick={() => handleViewConsultation(consultation.id)}
                    >
                      View
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
