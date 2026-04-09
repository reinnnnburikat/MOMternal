'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  User,
  Calendar,
  MapPin,
  Baby,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PatientListItem {
  id: string;
  patientId: string;
  name: string;
  dateOfBirth: string;
  address: string;
  contactNumber: string | null;
  barangay: string | null;
  gravidity: number;
  parity: number;
  lmp: string | null;
  aog: string | null;
  bloodType: string | null;
  riskLevel: string;
  consultationCount: number;
  latestConsultationDate: string | null;
  createdAt: string;
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

function PatientCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-rose-100/60 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

export function PatientListView() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [barangayFilter, setBarangayFilter] = useState('all');
  const [isCreatingConsultation, setIsCreatingConsultation] = useState<string | null>(null);

  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedPatientId = useAppStore((s) => s.setSelectedPatientId);
  const setSelectedConsultationId = useAppStore((s) => s.setSelectedConsultationId);
  const currentNurse = useAppStore((s) => s.currentNurse);
  const storeFilterRisk = useAppStore((s) => s.filterRisk);
  const setStoreFilterRisk = useAppStore((s) => s.setFilterRisk);
  const filterReferralPending = useAppStore((s) => s.filterReferralPending);
  const setFilterReferralPending = useAppStore((s) => s.setFilterReferralPending);

  // Sync filter from store on mount (when dashboard navigates here with a filter)
  useEffect(() => {
    if (storeFilterRisk !== 'all') {
      setRiskFilter(storeFilterRisk);
      setStoreFilterRisk('all');
    }
    if (filterReferralPending) {
      setFilterReferralPending(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (riskFilter !== 'all') params.set('riskLevel', riskFilter);
      if (barangayFilter !== 'all') params.set('barangay', barangayFilter);

      const res = await fetch(`/api/patients?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPatients(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch patients');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, riskFilter, barangayFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchPatients]);

  const barangays = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => {
      if (p.barangay) set.add(p.barangay);
    });
    return Array.from(set).sort();
  }, [patients]);

  // Filter barangays from all data (not just search results)
  const allBarangays = useMemo(() => {
    // We'll compute from a separate unfiltered fetch for barangays
    return barangays;
  }, [barangays]);

  const filteredPatients = useMemo(() => {
    // Server already filters, but client-side filter for barangay if not server-filtered
    let result = patients;
    if (barangayFilter !== 'all') {
      result = result.filter((p) => p.barangay === barangayFilter);
    }
    return result;
  }, [patients, barangayFilter]);

  const handleViewProfile = (patientId: string, patientDbId: string) => {
    setSelectedPatientId(patientDbId);
    setCurrentView('patient-profile');
  };

  const handleNewConsultation = async (patientDbId: string) => {
    setIsCreatingConsultation(patientDbId);
    try {
      const res = await fetch(`/api/patients/${patientDbId}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nurseId: currentNurse?.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSelectedConsultationId(data.data.id);
        setSelectedPatientId(patientDbId);
        setCurrentView('consultation');
        toast.success('Consultation created successfully');
      } else {
        toast.error(data.error || 'Failed to create consultation');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsCreatingConsultation(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  const calculateAOG = (lmp: string | null) => {
    if (!lmp) return '';
    const lmpDate = new Date(lmp);
    const today = new Date();
    const totalDays = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays < 0) return '';
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    return `${weeks}w ${days}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading patients...' : `${filteredPatients.length} patient${filteredPatients.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <Button
          onClick={() => setCurrentView('patient-new')}
          className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, patient ID, barangay, address, consultation #, or diagnosis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Risk Level Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" />
          Risk:
        </div>
        {['all', 'low', 'moderate', 'high'].map((level) => (
          <Button
            key={level}
            variant={riskFilter === level ? 'default' : 'outline'}
            size="sm"
            className={
              riskFilter === level
                ? level === 'all'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : level === 'low'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : level === 'moderate'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                : 'border-rose-200 text-muted-foreground hover:bg-rose-50'
            }
            onClick={() => setRiskFilter(level)}
          >
            {level === 'all' ? 'All Risks' : RISK_LABELS[level]}
          </Button>
        ))}
      </div>

      {/* Barangay Filters */}
      {allBarangays.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
            <MapPin className="h-3.5 w-3.5" />
            Barangay:
          </div>
          <Button
            variant={barangayFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={
              barangayFilter === 'all'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'border-rose-200 text-muted-foreground hover:bg-rose-50'
            }
            onClick={() => setBarangayFilter('all')}
          >
            All
          </Button>
          {allBarangays.map((b) => (
            <Button
              key={b}
              variant={barangayFilter === b ? 'default' : 'outline'}
              size="sm"
              className={
                barangayFilter === b
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'border-rose-200 text-muted-foreground hover:bg-rose-50'
              }
              onClick={() => setBarangayFilter(b)}
            >
              {b}
            </Button>
          ))}
        </div>
      )}

      {/* Patient List */}
      {isLoading ? (
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
          {Array.from({ length: 5 }).map((_, i) => (
            <PatientCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-rose-300" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No patients found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || riskFilter !== 'all' || barangayFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding a new patient to the system.'}
          </p>
          {!searchQuery && riskFilter === 'all' && barangayFilter === 'all' && (
            <Button
              onClick={() => setCurrentView('patient-new')}
              className="mt-4 bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Patient
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-1">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-card rounded-xl border border-rose-100/60 p-4 hover:shadow-md hover:border-rose-200 transition-all"
            >
              {/* Top row: ID badge, Name, Risk */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-rose-200 text-rose-600">
                      {patient.patientId}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {patient.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{patient.address}{patient.barangay ? ` — Brgy. ${patient.barangay}` : ''}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    RISK_CLASSES[patient.riskLevel] || RISK_CLASSES.low
                  }`}
                >
                  {RISK_LABELS[patient.riskLevel] || 'Low Risk'}
                </span>
              </div>

              {/* OB info row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Baby className="h-3 w-3 text-rose-400" />
                  <span>
                    G<sub>{patient.gravidity}</sub> P<sub>{patient.parity}</sub>
                  </span>
                </div>
                {patient.lmp && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-rose-400" />
                    <span>LMP: {formatDate(patient.lmp)}</span>
                  </div>
                )}
                {(patient.aog || patient.lmp) && (
                  <span className="font-medium text-rose-600">
                    AOG: {patient.aog || calculateAOG(patient.lmp)}
                  </span>
                )}
                {patient.latestConsultationDate && (
                  <div className="flex items-center gap-1">
                    <span>Last visit: {formatDate(patient.latestConsultationDate)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-rose-200 hover:bg-rose-50 gap-1"
                  onClick={() => handleViewProfile(patient.patientId, patient.id)}
                >
                  <User className="h-3 w-3" />
                  View Profile
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1"
                  disabled={isCreatingConsultation === patient.id}
                  onClick={() => handleNewConsultation(patient.id)}
                >
                  {isCreatingConsultation === patient.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      New Consultation
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
