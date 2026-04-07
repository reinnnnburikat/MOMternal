'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, AlertTriangle, ShieldCheck, ShieldAlert, Filter, Layers } from 'lucide-react';

// --- Types ---
interface RiskDistribution {
  low: number;
  moderate: number;
  high: number;
}

interface BarangayData {
  barangay: string;
  patientCount: number;
  riskDistribution: RiskDistribution;
  latestRiskLevel: string;
}

interface MarkerData {
  patientId: string;
  riskLevel: string;
  barangay: string;
  lat: number;
  lng: number;
}

interface MapApiResponse {
  barangayData: BarangayData[];
  markers: MarkerData[];
}

// --- Constants ---
const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#ef4444',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
};

const MAKATI_CENTER: [number, number] = [14.5547, 121.0244];
const DEFAULT_ZOOM = 13;

// Approximate barangay centroids for Makati
const BARANGAY_CENTROIDS: Record<string, [number, number]> = {
  'Guadalupe Nuevo': [14.5547, 121.0244],
  'Guadalupe Viejo': [14.5580, 121.0220],
  'Poblacion': [14.5535, 121.0310],
  'San Isidro': [14.5580, 121.0140],
  'Valenzuela': [14.5590, 121.0190],
  'Tejeros': [14.5560, 121.0160],
  'Bel-Air': [14.5505, 121.0300],
  'San Lorenzo': [14.5510, 121.0250],
  'Urdaneta': [14.5520, 121.0280],
  'Kasilawan': [14.5550, 121.0200],
  'San Antonio': [14.5470, 121.0260],
  'Bangkal': [14.5490, 121.0180],
  'Carmona': [14.5510, 121.0160],
  'Olympia': [14.5520, 121.0200],
  'Santa Cruz': [14.5600, 121.0120],
  'Cembo': [14.5610, 121.0200],
  'South Cembo': [14.5585, 121.0220],
  'Comembo': [14.5630, 121.0220],
  'Pitogo': [14.5640, 121.0180],
  'Rizal': [14.5570, 121.0120],
  'West Rembo': [14.5590, 121.0320],
  'East Rembo': [14.5600, 121.0340],
  'Pembo': [14.5620, 121.0360],
  'Pinagkaisahan': [14.5550, 121.0150],
  'Magallanes': [14.5440, 121.0300],
  'La Paz': [14.5600, 121.0100],
  'San Miguel': [14.5620, 121.0100],
};

// Simplified approximate GeoJSON polygons for key Makati barangays
const BARANGAY_BOUNDARIES = [
  {
    type: 'Feature' as const,
    properties: { name: 'Poblacion' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0280, 14.5520], [121.0320, 14.5520], [121.0340, 14.5540],
        [121.0340, 14.5570], [121.0320, 14.5580], [121.0280, 14.5570],
        [121.0270, 14.5550], [121.0280, 14.5520],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'Bel-Air' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0270, 14.5480], [121.0320, 14.5480], [121.0340, 14.5500],
        [121.0340, 14.5520], [121.0280, 14.5520], [121.0270, 14.5500],
        [121.0270, 14.5480],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'San Lorenzo' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0220, 14.5490], [121.0270, 14.5490], [121.0270, 14.5530],
        [121.0240, 14.5530], [121.0220, 14.5510], [121.0220, 14.5490],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'Guadalupe Nuevo' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0210, 14.5520], [121.0250, 14.5520], [121.0250, 14.5570],
        [121.0220, 14.5570], [121.0210, 14.5550], [121.0210, 14.5520],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'Guadalupe Viejo' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0190, 14.5560], [121.0220, 14.5560], [121.0220, 14.5610],
        [121.0190, 14.5610], [121.0180, 14.5580], [121.0190, 14.5560],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'San Isidro' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0100, 14.5560], [121.0150, 14.5560], [121.0150, 14.5610],
        [121.0100, 14.5610], [121.0090, 14.5580], [121.0100, 14.5560],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'Valenzuela' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0150, 14.5570], [121.0190, 14.5570], [121.0190, 14.5620],
        [121.0160, 14.5620], [121.0150, 14.5590], [121.0150, 14.5570],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'Tejeros' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0130, 14.5540], [121.0180, 14.5540], [121.0180, 14.5570],
        [121.0150, 14.5570], [121.0130, 14.5550], [121.0130, 14.5540],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'Urdaneta' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0250, 14.5500], [121.0290, 14.5500], [121.0290, 14.5530],
        [121.0260, 14.5530], [121.0250, 14.5510], [121.0250, 14.5500],
      ]],
    },
  },
  {
    type: 'Feature' as const,
    properties: { name: 'Bangkal' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [121.0150, 14.5460], [121.0200, 14.5460], [121.0200, 14.5500],
        [121.0160, 14.5500], [121.0150, 14.5480], [121.0150, 14.5460],
      ]],
    },
  },
];

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [mapData, setMapData] = useState<MapApiResponse | null>(null);

  // Fetch map data
  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/map/data');
      if (!res.ok) throw new Error('Failed to fetch map data');
      const data: MapApiResponse = await res.json();
      setMapData(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Error fetching map data:', err);
      setError('Unable to load map data. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let destroyed = false;

    const initMap = async () => {
      // Dynamically import leaflet to avoid SSR issues
      const L = (await import('leaflet')).default;
      // Inject leaflet CSS via link tag to avoid SSR/TS issues
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (destroyed || !mapRef.current) return;

      // Initialize the map
      const map = L.map(mapRef.current, {
        center: MAKATI_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Fetch data and render layers
      const data = await fetchMapData();
      if (data && !destroyed) {
        renderMapLayers(map, data, L);
      }
    };

    initMap();

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Re-render markers when risk filter changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!mapInstanceRef.current || !mapData) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      if (!map) return;

      // Remove existing marker layers except tile layer
      map.eachLayer((layer: any) => {
        if (!(layer instanceof L.TileLayer)) {
          map.removeLayer(layer);
        }
      });

      renderMapLayers(map, mapData, L, riskFilter);
    };

    updateMarkers();
  }, [riskFilter, mapData]);

  const renderMapLayers = (
    map: any,
    data: MapApiResponse,
    L: any,
    filter: string = 'all'
  ) => {
    // Build a lookup of barangay data
    const barangayLookup: Record<string, BarangayData> = {};
    data.barangayData.forEach((b) => {
      barangayLookup[b.barangay] = b;
    });

    // Add barangay boundary polygons with risk coloring
    BARANGAY_BOUNDARIES.forEach((feature) => {
      const bData = barangayLookup[feature.properties.name];
      const riskLevel = bData?.latestRiskLevel || 'low';
      if (filter !== 'all' && riskLevel !== filter) return;

      const fillColor = RISK_COLORS[riskLevel] || RISK_COLORS.low;

      L.geoJSON(feature as any, {
        style: {
          color: fillColor,
          weight: 2,
          opacity: 0.8,
          fillColor: fillColor,
          fillOpacity: 0.2,
        },
        onEachFeature: (_feature: any, layer: any) => {
          const name = feature.properties.name;
          const bd = barangayLookup[name];
          if (bd) {
            const popup = `
              <div style="min-width:180px;font-family:system-ui;">
                <strong style="font-size:14px;">${name}</strong><br/>
                <span style="color:#666;">Patients: ${bd.patientCount}</span><br/>
                <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">
                  <span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:11px;">Low: ${bd.riskDistribution.low}</span>
                  <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;">Mod: ${bd.riskDistribution.moderate}</span>
                  <span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:11px;">High: ${bd.riskDistribution.high}</span>
                </div>
              </div>
            `;
            layer.bindPopup(popup);
          }
          layer.bindTooltip(name, { sticky: true });
        },
      }).addTo(map);
    });

    // Add patient markers (circle markers)
    const filteredMarkers = filter === 'all'
      ? data.markers
      : data.markers.filter((m) => m.riskLevel === filter);

    filteredMarkers.forEach((marker) => {
      const color = RISK_COLORS[marker.riskLevel] || RISK_COLORS.low;
      const bd = barangayLookup[marker.barangay];

      L.circleMarker([marker.lat, marker.lng], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:180px;font-family:system-ui;">
            <strong style="font-size:14px;">${marker.barangay}</strong><br/>
            <span style="color:#666;font-size:12px;">Patient: ${marker.patientId}</span><br/>
            <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;color:white;background:${color};">${RISK_LABELS[marker.riskLevel] || marker.riskLevel}</span>
            ${bd ? `<br/><span style="color:#666;font-size:11px;margin-top:4px;display:block;">Total patients in area: ${bd.patientCount}</span>` : ''}
          </div>
        `);
    });

    // Add markers for barangays that have data but no individual markers (centroid markers)
    const barangaysWithMarkers = new Set(data.markers.map((m) => m.barangay));
    data.barangayData.forEach((bd) => {
      if (!barangaysWithMarkers.has(bd.barangay) && BARANGAY_CENTROIDS[bd.barangay]) {
        if (filter !== 'all' && bd.latestRiskLevel !== filter) return;

        const color = RISK_COLORS[bd.latestRiskLevel] || RISK_COLORS.low;
        const [lat, lng] = BARANGAY_CENTROIDS[bd.barangay];

        L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;font-family:system-ui;">
              <strong style="font-size:14px;">${bd.barangay}</strong><br/>
              <span style="color:#666;">Patients: ${bd.patientCount}</span><br/>
              <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">
                <span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:11px;">Low: ${bd.riskDistribution.low}</span>
                <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;">Mod: ${bd.riskDistribution.moderate}</span>
                <span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:11px;">High: ${bd.riskDistribution.high}</span>
              </div>
            </div>
          `);
      }
    });
  };

  // Compute summary stats
  const totalPatients = mapData?.barangayData.reduce((sum, b) => sum + b.patientCount, 0) ?? 0;
  const highRiskCount = mapData?.barangayData.reduce((sum, b) => sum + b.riskDistribution.high, 0) ?? 0;
  const moderateRiskCount = mapData?.barangayData.reduce((sum, b) => sum + b.riskDistribution.moderate, 0) ?? 0;
  const lowRiskCount = mapData?.barangayData.reduce((sum, b) => sum + b.riskDistribution.low, 0) ?? 0;

  if (error && !mapData) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Unable to load map</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchMapData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4.5 w-4.5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Patients</p>
              <p className="text-lg font-semibold text-foreground">{totalPatients}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Risk</p>
              <p className="text-lg font-semibold text-emerald-700">{lowRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Moderate Risk</p>
              <p className="text-lg font-semibold text-amber-700">{moderateRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">High Risk</p>
              <p className="text-lg font-semibold text-red-700">{highRiskCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-rose-600" />
                Makati Community Risk Map
              </CardTitle>
              <CardDescription>
                Patient risk levels by barangay
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Filter risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                      Low Risk
                    </span>
                  </SelectItem>
                  <SelectItem value="moderate">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      Moderate Risk
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                      High Risk
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="w-full h-[500px] rounded-lg" />
          ) : (
            <div className="relative">
              <div
                ref={mapRef}
                className="w-full rounded-lg border border-rose-100 overflow-hidden"
                style={{ height: '500px' }}
              />
              {/* Legend */}
              <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm border border-rose-100 rounded-lg shadow-md p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Risk Levels</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
                    <span className="text-xs text-muted-foreground">Low Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm" />
                    <span className="text-xs text-muted-foreground">Moderate Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm" />
                    <span className="text-xs text-muted-foreground">High Risk</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barangay Table */}
      {mapData && mapData.barangayData.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Barangay Overview</CardTitle>
            <CardDescription>Patient risk distribution by barangay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg border border-rose-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-rose-50/80 backdrop-blur-sm">
                  <tr className="border-b border-rose-100">
                    <th className="text-left px-4 py-2.5 font-medium text-foreground">Barangay</th>
                    <th className="text-center px-4 py-2.5 font-medium text-foreground">Patients</th>
                    <th className="text-center px-4 py-2.5 font-medium text-foreground">Low</th>
                    <th className="text-center px-4 py-2.5 font-medium text-foreground">Moderate</th>
                    <th className="text-center px-4 py-2.5 font-medium text-foreground">High</th>
                    <th className="text-center px-4 py-2.5 font-medium text-foreground">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {mapData.barangayData.map((bd) => (
                    <tr
                      key={bd.barangay}
                      className="border-b border-rose-50 hover:bg-rose-50/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">{bd.barangay}</td>
                      <td className="text-center px-4 py-2.5">{bd.patientCount}</td>
                      <td className="text-center px-4 py-2.5">
                        <span className="text-emerald-600 font-medium">{bd.riskDistribution.low}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <span className="text-amber-600 font-medium">{bd.riskDistribution.moderate}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <span className="text-red-600 font-medium">{bd.riskDistribution.high}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className="text-[11px] gap-1.5"
                          style={{
                            borderColor: RISK_COLORS[bd.latestRiskLevel] || RISK_COLORS.low,
                            color: RISK_COLORS[bd.latestRiskLevel] || RISK_COLORS.low,
                            backgroundColor: `${RISK_COLORS[bd.latestRiskLevel] || RISK_COLORS.low}15`,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: RISK_COLORS[bd.latestRiskLevel] || RISK_COLORS.low }}
                          />
                          {RISK_LABELS[bd.latestRiskLevel] || bd.latestRiskLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
