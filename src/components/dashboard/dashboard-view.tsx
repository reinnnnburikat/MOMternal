'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Users,
  AlertTriangle,
  FileText,
  Activity,
  UserPlus,
  Map,
  List,
  PlayCircle,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

// ---------- types ----------

interface DashboardStats {
  totalPatients: number;
  highRiskPatients: number;
  moderateRiskPatients: number;
  pendingReferrals: number;
  recentConsultations: RecentConsultation[];
  consultationsByRisk: { low: number; moderate: number; high: number };
  monthlyTrend: { month: string; count: number }[];
}

interface RecentConsultation {
  id: string;
  consultationNo: string;
  patientId: string;
  consultationDate: string;
  status: string;
  riskLevel: string;
  patient: { name: string; patientId: string };
}

interface PausedConsultation {
  id: string;
  consultationNo: string;
  patientId: string;
  stepCompleted: number;
  updatedAt: string;
  patient: { id: string; name: string; patientId: string };
}

// ---------- helpers ----------

const STEP_LABELS: Record<number, string> = {
  0: 'Assessment (SOAP)',
  1: 'Additional Findings',
  2: 'Diagnosis',
  3: 'Risk Classification',
  4: 'AI Suggestions',
  5: 'Nurse Selection (HITL)',
  6: 'Evaluation (NOC)',
  7: 'Referral',
};

function getRiskBadgeClass(riskLevel: string) {
  switch (riskLevel) {
    case 'high':
      return 'risk-high';
    case 'moderate':
      return 'risk-moderate';
    case 'low':
      return 'risk-low';
    default:
      return '';
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>;
    case 'in_progress':
      return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ---------- sub-components ----------

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-1 h-4 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PausedSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- main component ----------

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pausedConsultations, setPausedConsultations] = useState<
    PausedConsultation[]
  >([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingPaused, setIsLoadingPaused] = useState(true);

  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedConsultationId = useAppStore(
    (s) => s.setSelectedConsultationId
  );

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchPaused = useCallback(async () => {
    setIsLoadingPaused(true);
    try {
      const res = await fetch('/api/dashboard/resume');
      if (res.ok) {
        const data = await res.json();
        setPausedConsultations(data.consultations ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch paused consultations:', err);
    } finally {
      setIsLoadingPaused(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPaused();
  }, [fetchStats, fetchPaused]);

  // --- handlers ---

  const handleResume = (consultation: PausedConsultation) => {
    setSelectedConsultationId(consultation.id);
    useAppStore.getState().setSelectedPatientId(consultation.patientId);
    setCurrentView('consultation');
  };

  const handleViewPatient = (patientDbId: string) => {
    useAppStore.getState().setSelectedPatientId(patientDbId);
    setCurrentView('patient-profile');
  };

  // --- stats cards config ---

  const lowRiskPatients = stats ? (stats.totalPatients - stats.highRiskPatients - stats.moderateRiskPatients) : 0;

  const statsCards = stats
    ? [
        {
          label: 'Total Patients',
          value: stats.totalPatients,
          icon: Users,
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          trend: stats.monthlyTrend.length > 0
            ? `${stats.monthlyTrend[stats.monthlyTrend.length - 1].count} this month`
            : undefined,
        },
        {
          label: 'Low Risk',
          value: lowRiskPatients,
          icon: ShieldCheck,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          trend: lowRiskPatients > 0
            ? 'Stable'
            : 'No low-risk patients',
        },
        {
          label: 'High Risk Patients',
          value: stats.highRiskPatients,
          icon: AlertTriangle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          trend: stats.highRiskPatients > 0
            ? 'Requires attention'
            : 'All clear',
        },
        {
          label: 'Pending Referrals',
          value: stats.pendingReferrals,
          icon: FileText,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          trend: stats.pendingReferrals > 0
            ? 'Action needed'
            : 'Up to date',
        },
        {
          label: 'Recent Consultations',
          value: stats.recentConsultations.length,
          icon: Activity,
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          trend: stats.consultationsByRisk
            ? `${stats.consultationsByRisk.low} low · ${stats.consultationsByRisk.moderate} mod · ${stats.consultationsByRisk.high} high`
            : undefined,
        },
      ]
    : [];

  // --- render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-rose-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your maternal health outreach
        </p>
      </div>

      {/* Stats Cards */}
      {isLoadingStats ? (
        <StatsCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="py-0 gap-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`${card.bg} p-2.5 rounded-lg`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    {card.trend && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>{card.trend}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold tracking-tight">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {card.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="py-0 gap-0">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => setCurrentView('patient-new')}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <UserPlus className="h-4 w-4" />
            Add New Patient
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('map')}
          >
            <Map className="h-4 w-4" />
            View Risk Map
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('patients')}
          >
            <List className="h-4 w-4" />
            View All Patients
          </Button>
        </CardContent>
      </Card>

      {/* Paused Assessments */}
      {isLoadingPaused ? (
        <PausedSkeleton />
      ) : (
        <Card className="py-0 gap-0">
          <CardHeader>
            <CardTitle className="text-lg">Paused Assessments</CardTitle>
            <CardDescription>
              Resume in-progress consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pausedConsultations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">No paused assessments</p>
                <p className="text-xs mt-1">
                  In-progress consultations will appear here for quick resume
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {pausedConsultations.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/30 p-4 transition-colors hover:bg-rose-50/60"
                  >
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleViewPatient(c.patient.id)}
                        className="text-sm font-semibold text-rose-900 hover:text-rose-700 hover:underline transition-colors"
                      >
                        {c.patient.name}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Last step: {STEP_LABELS[c.stepCompleted] || `Step ${c.stepCompleted}`}
                        {' · '}
                        Updated {formatDate(c.updatedAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleResume(c)}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Resume
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Consultations */}
      {isLoadingStats ? (
        <RecentTableSkeleton />
      ) : stats && stats.recentConsultations.length > 0 ? (
        <Card className="py-0 gap-0">
          <CardHeader>
            <CardTitle className="text-lg">Recent Consultations</CardTitle>
            <CardDescription>
              Last {stats.recentConsultations.length} consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentConsultations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleViewPatient(c.patient.id)}
                          className="text-sm font-medium text-foreground hover:text-rose-600 hover:underline transition-colors"
                        >
                          {c.patient.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.consultationDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRiskBadgeClass(c.riskLevel)}
                        >
                          {c.riskLevel.charAt(0).toUpperCase() +
                            c.riskLevel.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : stats ? (
        <Card className="py-0 gap-0">
          <CardHeader>
            <CardTitle className="text-lg">Recent Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Activity className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm font-medium">No consultations yet</p>
              <p className="text-xs mt-1">
                Start a consultation to see activity here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
