'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Clock,
  User,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// --- Types ---
interface AuditLogNurse {
  name: string;
}

interface AuditLog {
  id: string;
  nurseId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
  nurse: AuditLogNurse;
}

interface AuditApiResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

// --- Constants ---
const PAGE_SIZE = 20;

const ACTION_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  create: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Activity },
  update: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Activity },
  delete: { bg: 'bg-red-50', text: 'text-red-700', icon: Activity },
};

const ENTITY_STYLES: Record<string, { bg: string; text: string }> = {
  patient: { bg: 'bg-purple-50', text: 'text-purple-700' },
  consultation: { bg: 'bg-pink-50', text: 'text-pink-700' },
  nurse: { bg: 'bg-sky-50', text: 'text-sky-700' },
  referral: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function parseDetails(detailsStr: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(detailsStr);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function DetailsCell({ detailsStr }: { detailsStr: string }) {
  const [expanded, setExpanded] = useState(false);

  const parsed = useMemo(() => parseDetails(detailsStr), [detailsStr]);

  if (!parsed) {
    return (
      <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate block">
        {detailsStr}
      </span>
    );
  }

  const entries = Object.entries(parsed);
  const displayEntries = expanded ? entries : entries.slice(0, 2);
  const hasMore = entries.length > 2;

  // Format values for display
  const formatValue = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (val === null) return 'null';
    if (Array.isArray(val)) return `[${val.length} items]`;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="max-w-[280px]">
      <div className="space-y-0.5">
        {displayEntries.map(([key, val]) => (
          <div key={key} className="flex gap-1.5 text-xs">
            <span className="font-medium text-foreground shrink-0">{key}:</span>
            <span className="text-muted-foreground truncate font-mono">{formatValue(val)}</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center gap-1 mt-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              +{entries.length - 2} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

function AuditTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-[180px]" />
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-6 w-[70px] rounded-full" />
          <Skeleton className="h-6 w-[90px] rounded-full" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      ))}
    </div>
  );
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });

      if (actionFilter !== 'all') {
        params.set('action', actionFilter);
      }
      if (entityFilter !== 'all') {
        params.set('entity', entityFilter);
      }

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');

      const data: AuditApiResponse = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Unable to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [actionFilter, entityFilter]);

  // Filter by search query (client-side)
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.nurse?.name?.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Compute summary stats
  const createCount = logs.filter((l) => l.action === 'create').length;
  const updateCount = logs.filter((l) => l.action === 'update').length;
  const deleteCount = logs.filter((l) => l.action === 'delete').length;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="h-4.5 w-4.5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Logs</p>
              <p className="text-lg font-semibold text-foreground">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Activity className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Creates</p>
              <p className="text-lg font-semibold text-emerald-700">{createCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updates</p>
              <p className="text-lg font-semibold text-blue-700">{updateCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Activity className="h-4.5 w-4.5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Deletes</p>
              <p className="text-lg font-semibold text-red-700">{deleteCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4.5 w-4.5 text-rose-600" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Track all system activities and changes
              </CardDescription>
            </div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Unable to load audit logs</p>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchLogs} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg border border-rose-100">
                {loading ? (
                  <AuditTableSkeleton />
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No logs found</p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'No activity has been recorded yet'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-rose-50/90 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="w-[180px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Timestamp
                          </div>
                        </TableHead>
                        <TableHead className="w-[160px]">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            Nurse
                          </div>
                        </TableHead>
                        <TableHead className="w-[90px]">Action</TableHead>
                        <TableHead className="w-[110px]">Entity</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const actionStyle = ACTION_STYLES[log.action] || ACTION_STYLES.create;
                        const entityStyle = ENTITY_STYLES[log.entity] || {
                          bg: 'bg-gray-50',
                          text: 'text-gray-700',
                        };

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-semibold text-rose-700">
                                    {log.nurse?.name
                                      ?.split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .slice(0, 2) || '??'}
                                  </span>
                                </div>
                                <span className="text-xs font-medium text-foreground truncate">
                                  {log.nurse?.name || 'Unknown'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium ${actionStyle.bg} ${actionStyle.text}`}
                              >
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium ${entityStyle.bg} ${entityStyle.text}`}
                              >
                                {log.entity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DetailsCell detailsStr={log.details} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {!loading && total > 0 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} logs
                    {searchQuery && ` (filtered)`}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPage(0)}
                      disabled={page === 0}
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      Page {page + 1} of {Math.max(1, totalPages)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPage(totalPages - 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
