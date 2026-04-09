'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
  PieChart as PieChartIcon,
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

// ---------- chart color constants ----------

const CHART_COLORS = {
  rose: '#e11d48',
  green: '#22c55e',
  gold: '#eab308',
  red: '#ef4444',
  purple: '#a855f7',
} as const;

const RISK_COLORS = [CHART_COLORS.green, CHART_COLORS.gold, CHART_COLORS.red];

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

/** Generate 7 sparkline data points around a base value */
function generateSparklineData(baseValue: number, variance = 0.3): number[] {
  const data: number[] = [];
  let current = baseValue * (0.6 + Math.random() * 0.4);
  for (let i = 0; i < 7; i++) {
    const delta = (Math.random() - 0.4) * baseValue * variance;
    current = Math.max(0, current + delta);
    data.push(Math.round(current));
  }
  // Ensure the last point is near the base value for visual consistency
  data[6] = baseValue;
  return data;
}

/** Generate last 6 month names from current date */
function getLast6MonthNames(): string[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const result: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(months[d.getMonth()]);
  }
  return result;
}

/** Generate mock monthly trend data that sums close to a target total */
function generateMonthlyTrendData(totalConsultations: number): { month: string; count: number }[] {
  const months = getLast6MonthNames();
  // If we have real monthlyTrend data from the API, use it (up to 6 months)
  // Otherwise generate mock data
  const raw = months.map(() => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map((v) => Math.max(1, Math.round((v / sum) * totalConsultations)));
  return months.map((month, i) => ({ month, count: scaled[i] }));
}

// ---------- chart sub-components ----------

/** Tiny sparkline for stat cards */
function StatSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = useMemo(() => data.map((v, i) => ({ i, v })), [data]);
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Custom tooltip for charts - dark mode compatible */
function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; dataKey: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg">
      {label && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {entry.value}
        </p>
      ))}
    </div>
  );
}

/** Pie chart label at center */
function PieCenterLabel({ viewBox, total }: { viewBox?: { cx: number; cy: number }; total: number }) {
  if (!viewBox) return null;
  return (
    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="central" className="fill-gray-900 dark:fill-gray-100">
      <tspan className="text-2xl font-bold">{total}</tspan>
      <tspan x={viewBox.cx} dy="1.2em" className="text-xs fill-gray-500 dark:fill-gray-400">patients</tspan>
    </text>
  );
}

// ---------- skeleton sub-components ----------

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
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

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[160px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
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
      const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
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

  // --- derived data ---

  const lowRiskPatients = stats
    ? stats.totalPatients - stats.highRiskPatients - stats.moderateRiskPatients
    : 0;

  // Risk distribution data for pie chart — uses consultation-based risk counts
  // which reflects actual risk assessments rather than the patient table
  const riskDistributionData = useMemo(() => {
    if (!stats) return [];
    const cbr = stats.consultationsByRisk;
    return [
      { name: 'Low Risk', value: cbr.low, color: CHART_COLORS.green },
      { name: 'Moderate Risk', value: cbr.moderate, color: CHART_COLORS.gold },
      { name: 'High Risk', value: cbr.high, color: CHART_COLORS.red },
    ];
  }, [stats]);

  // Monthly trend data for line chart — only use real API data
  const monthlyTrendData = useMemo(() => {
    if (!stats) return [];
    if (stats.monthlyTrend && stats.monthlyTrend.length > 0) {
      return stats.monthlyTrend.slice(-6);
    }
    // No mock data — show empty chart when no real data exists
    return getLast6MonthNames().map((month) => ({ month, count: 0 }));
  }, [stats]);

  // --- stats cards config ---

  const statsCards = stats
    ? [
        {
          label: 'Total Patients',
          value: stats.totalPatients,
          icon: Users,
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          darkBg: 'dark:bg-rose-950/40',
          sparkColor: CHART_COLORS.rose,
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
          darkBg: 'dark:bg-emerald-950/40',
          sparkColor: CHART_COLORS.rose,
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
          darkBg: 'dark:bg-red-950/40',
          sparkColor: CHART_COLORS.rose,
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
          darkBg: 'dark:bg-amber-950/40',
          sparkColor: CHART_COLORS.rose,
          trend: stats.pendingReferrals > 0
            ? 'Action needed'
            : 'Up to date',
        },
        {
          label: 'Recent Consultations',
          value: stats.recentConsultations.length,
          icon: Activity,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          darkBg: 'dark:bg-purple-950/40',
          sparkColor: CHART_COLORS.rose,
          trend: stats.consultationsByRisk
            ? `${stats.consultationsByRisk.low} low · ${stats.consultationsByRisk.moderate} mod · ${stats.consultationsByRisk.high} high`
            : undefined,
        },
      ]
    : [];

  // Generate sparkline data for each card (memoized to avoid re-renders)
  const sparklineData = useMemo(() => {
    if (!stats) return {};
    return {
      0: generateSparklineData(stats.totalPatients, 0.2),
      1: generateSparklineData(lowRiskPatients, 0.25),
      2: generateSparklineData(stats.highRiskPatients, 0.35),
      3: generateSparklineData(stats.pendingReferrals, 0.4),
      4: generateSparklineData(stats.recentConsultations.length, 0.3),
    };
  }, [stats, lowRiskPatients]);

  // --- render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-600 via-rose-600/95 to-pink-600/90 dark:from-rose-800/80 dark:via-rose-800/70 dark:to-pink-800/60 px-6 py-5 shadow-lg shadow-rose-500/10 dark:shadow-rose-900/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-rose-100/90 mt-1">
            Overview of your maternal health outreach
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoadingStats ? (
        <StatsCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statsCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="group h-full shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className={`${card.bg} ${card.darkBg} p-2.5 rounded-xl shadow-sm`}>                      
                      <Icon className={`h-5 w-5 ${card.color}`} strokeWidth={2} />
                    </div>
                    {card.trend && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground dark:text-gray-400">
                        <TrendingUp className="h-3 w-3" />
                        <span>{card.trend}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex-1 flex flex-col justify-end">
                    <p className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                      {card.value}
                    </p>
                    {/* Sparkline */}
                    <div className="mt-1 -mx-1 h-8">
                      <StatSparkline data={sparklineData[idx] || [0,0,0,0,0,0,0]} color={card.sparkColor} />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground dark:text-gray-400 mt-0.5">
                      {card.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Charts Row: Risk Pie (left) | Quick Actions + Trends (right) */}
      {isLoadingStats ? (
        <ChartsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Distribution Pie Chart */}
          <Card className="shadow-sm border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100 font-bold">
                <PieChartIcon className="h-5 w-5 text-rose-600" />
                Risk Distribution
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Consultation breakdown by assessed risk level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltipContent />}
                    />
                    {/* Center label */}
                    <PieCenterLabel
                      viewBox={{ cx: '50%', cy: '50%' } as never}
                      total={stats.consultationsByRisk.low + stats.consultationsByRisk.moderate + stats.consultationsByRisk.high}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-2">
                {riskDistributionData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full inline-block"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {entry.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right column: Quick Actions + Consultation Trends */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-sm border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100 font-bold">Quick Actions</CardTitle>
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

            {/* Consultation Trends Line Chart */}
            <Card className="shadow-sm border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100 font-bold">
                  <TrendingUp className="h-5 w-5 text-rose-600" />
                  Consultation Trends
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Monthly consultations over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyTrendData}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        className="dark:stroke-gray-700"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<ChartTooltipContent />}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Consultations"
                        stroke={CHART_COLORS.rose}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.rose, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Paused Assessments */}
      {isLoadingPaused ? (
        <PausedSkeleton />
      ) : (
        <Card className="shadow-sm border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 font-bold">Paused Assessments</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Resume in-progress consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pausedConsultations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                {/* Decorative outer ring */}
                <div className="relative mb-5">
                  <div className="absolute -inset-3 rounded-full border-2 border-dashed border-rose-200 dark:border-rose-800/40 opacity-60" />
                  {/* Icon container */}
                  <div className="relative w-20 h-20 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center">
                    <Activity className="h-9 w-9 text-rose-400" />
                  </div>
                  {/* Small decorative dot */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-background flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  </div>
                </div>
                <p className="text-base font-semibold text-foreground">No paused assessments</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
                  In-progress consultations will appear here so you can quickly pick up where you left off.
                </p>
                <Button
                  onClick={() => setCurrentView('patient-new')}
                  className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Start New Consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {pausedConsultations.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 p-4 transition-colors hover:bg-rose-50/60 dark:hover:bg-rose-950/40"
                  >
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleViewPatient(c.patient.id)}
                        className="text-sm font-semibold text-rose-900 dark:text-rose-200 hover:text-rose-700 hover:underline transition-colors"
                      >
                        {c.patient.name}
                      </button>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
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
        <Card className="shadow-sm border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 font-bold">Recent Consultations</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Last {stats.recentConsultations.length} consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="dark:text-gray-300">Patient</TableHead>
                    <TableHead className="dark:text-gray-300">Date</TableHead>
                    <TableHead className="dark:text-gray-300">Risk Level</TableHead>
                    <TableHead className="dark:text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentConsultations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleViewPatient(c.patient.id)}
                          className="text-sm font-medium text-foreground hover:text-rose-600 hover:underline transition-colors dark:text-gray-100"
                        >
                          {c.patient.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground dark:text-gray-400">
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
        <Card className="shadow-sm border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 font-bold">Recent Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              {/* Decorative outer ring */}
              <div className="relative mb-5">
                <div className="absolute -inset-3 rounded-full border-2 border-dashed border-rose-200 dark:border-rose-800/40 opacity-60" />
                {/* Icon container */}
                <div className="relative w-20 h-20 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center">
                  <Activity className="h-9 w-9 text-rose-400" />
                </div>
                {/* Small decorative dot */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-background flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </div>
              </div>
              <p className="text-base font-semibold text-foreground">No consultations yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
                Once you begin consultations, your recent activity and patient interactions will be displayed here.
              </p>
              <Button
                onClick={() => setCurrentView('patient-new')}
                className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <UserPlus className="h-4 w-4" />
                Start Your First Consultation
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
