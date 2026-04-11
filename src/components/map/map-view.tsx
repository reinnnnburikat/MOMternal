'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BARANGAY_CENTROIDS } from '@/components/map/barangay-centroids';
import { MAKATI_BARANGAYS } from '@/data/makati-barangays';
import { setCache, getCache } from '@/lib/offline-cache';
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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  MapPin,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Filter,
  Layers,
  Loader2,
  Search,
  X,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';

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
  id: string;
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
const DEFAULT_ZOOM = 14;

// BARANGAY_CENTROIDS imported from shared source-of-truth module (OSM Overpass API)
// Single source of truth — used by both map-view.tsx and /api/map/data route

// GeoJSON boundaries are loaded from /makati-barangays.geojson (OSM Overpass API)
// All 33 Makati barangays with full boundary polygons from live OSM data
let BARANGAY_BOUNDARIES: any[] = [];

// Flat list of all barangay names from the shared source of truth (matches GeoJSON + centroids)
const BARANGAY_NAMES = MAKATI_BARANGAYS.sort();

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const dataLayersRef = useRef<any[]>([]);
  const highlightLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // ── TanStack Query: Map data ──
  const queryClient = useQueryClient();
  const [isFromCache, setIsFromCache] = useState(false);

  const {
    data: mapData,
    isLoading: loading,
    error: mapError,
    refetch: refetchMapData,
    isFetching,
  } = useQuery<MapApiResponse | null>({
    queryKey: ['map-data'],
    queryFn: async () => {
      const res = await fetch('/api/map/data');
      if (!res.ok) throw new Error('Failed to fetch map data');
      const data: MapApiResponse = await res.json();
      // Cache successful response for offline use
      setCache('map-data', data);
      setIsFromCache(false);
      return data;
    },
    enabled: mapReady,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });

  // Load cached data when offline
  useEffect(() => {
    if (mapError && !mapData) {
      const cached = getCache<MapApiResponse>('map-data');
      if (cached) {
        setIsFromCache(true);
        // Inject cached data via query client
        queryClient.setQueryData(['map-data'], cached);
      }
    }
  }, [mapError, mapData, queryClient]);

  const error = mapError && !isFromCache ? 'Unable to load patient data. Map is still viewable.' : null;

  // D3: Barangay search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);

  // Map data is now fetched via useQuery above (enabled: mapReady)
  const fetchMapData = useCallback(async (): Promise<MapApiResponse | null> => {
    try {
      await refetchMapData();
      return mapData ?? null;
    } catch {
      return null;
    }
  }, [refetchMapData, mapData]);

  // D3: Handle barangay selection from search
  const handleBarangaySelect = useCallback((barangayName: string) => {
    setSelectedBarangay(barangayName);
    setSearchOpen(false);

    const map = mapInstanceRef.current;
    if (!map) return;

    // Import leaflet dynamically
    import('leaflet').then((L) => {
      const defaultL = L.default;

      // Remove previous highlight layer
      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }

      // Find the boundary for the selected barangay
      const boundary = BARANGAY_BOUNDARIES.find(
        (f) => f.properties.name.toLowerCase() === barangayName.toLowerCase()
      );
      const centroid = BARANGAY_CENTROIDS[barangayName] ||
        BARANGAY_CENTROIDS[Object.keys(BARANGAY_CENTROIDS).find(
          (k) => k.toLowerCase() === barangayName.toLowerCase()
        ) || ''];

      if (centroid) {
        // Zoom to the barangay centroid
        map.flyTo([centroid[0], centroid[1]], 16, { duration: 0.8 });
      }

      if (boundary) {
        // Create highlight layer with higher opacity
        const riskLevel = mapData?.barangayData.find(
          (b) => b.barangay.toLowerCase() === barangayName.toLowerCase()
        )?.latestRiskLevel || 'low';

        const highlightColor = RISK_COLORS[riskLevel] || RISK_COLORS.low;

        const highlightLayer = defaultL.geoJSON(boundary, {
          style: {
            color: highlightColor,
            weight: 3.5,
            opacity: 1,
            fillColor: highlightColor,
            fillOpacity: 0.4,
          },
          onEachFeature: (_feature: any, layer: any) => {
            const bd = mapData?.barangayData.find(
              (b) => b.barangay.toLowerCase() === barangayName.toLowerCase()
            );
            if (bd) {
              const popup = `
                <div style="padding:14px 16px;min-width:220px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#fff1f2,#ffe4e6);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div>
                      <div style="font-weight:600;font-size:14px;color:#1a1a2e;line-height:1.3;">${bd.barangay}</div>
                      <div style="font-size:11px;color:#9ca3af;margin-top:1px;">Barangay</div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fef2f4;border-radius:8px;margin-bottom:10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span style="font-size:12px;font-weight:500;color:#e11d48;">${bd.patientCount} patient${bd.patientCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <div style="flex:1;text-align:center;padding:6px 4px;background:#f0fdf4;border-radius:8px;">
                      <div style="font-size:15px;font-weight:700;color:#15803d;line-height:1;">${bd.riskDistribution.low}</div>
                      <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:500;letter-spacing:0.02em;">LOW</div>
                    </div>
                    <div style="flex:1;text-align:center;padding:6px 4px;background:#fffbeb;border-radius:8px;">
                      <div style="font-size:15px;font-weight:700;color:#b45309;line-height:1;">${bd.riskDistribution.moderate}</div>
                      <div style="font-size:10px;color:#fbbf24;margin-top:3px;font-weight:500;letter-spacing:0.02em;">MODERATE</div>
                    </div>
                    <div style="flex:1;text-align:center;padding:6px 4px;background:#fef2f2;border-radius:8px;">
                      <div style="font-size:15px;font-weight:700;color:#dc2626;line-height:1;">${bd.riskDistribution.high}</div>
                      <div style="font-size:10px;color:#f87171;margin-top:3px;font-weight:500;letter-spacing:0.02em;">HIGH</div>
                    </div>
                  </div>
                </div>
              `;
              layer.bindPopup(popup);
              // Open popup after a small delay to let the flyTo animation complete
              setTimeout(() => {
                layer.openPopup();
              }, 900);
            }
          },
        });
        highlightLayer.addTo(map);
        highlightLayerRef.current = highlightLayer;
      }
    });
  }, [mapData]);

  // D3: Clear search and reset map view
  const handleClearSearch = useCallback(() => {
    setSelectedBarangay(null);
    setSearchOpen(false);

    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove highlight layer
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    // Zoom back to full view
    if (BARANGAY_BOUNDARIES.length > 0) {
      import('leaflet').then((L) => {
        const defaultL = L.default;
        const geoData = { type: 'FeatureCollection', features: BARANGAY_BOUNDARIES };
        const allBounds = defaultL.geoJSON(geoData).getBounds();
        if (allBounds.isValid()) {
          map.flyToBounds(allBounds, { padding: [30, 30], maxZoom: DEFAULT_ZOOM, duration: 0.8 });
        }
      });
    } else {
      map.flyTo(MAKATI_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    }
  }, []);

  // B6: Delegated click handler for "View Patient" buttons in Leaflet popups
  useEffect(() => {
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.view-patient-btn') as HTMLElement | null;
      if (!btn) return;

      const patientDbId = btn.dataset.patientDbId;
      if (!patientDbId) return;

      e.preventDefault();
      e.stopPropagation();

      useAppStore.getState().setSelectedPatientId(patientDbId);
      useAppStore.getState().setCurrentView('patient-profile');
    };

    // Use capture phase so it fires before Leaflet's own handlers
    mapContainer.addEventListener('click', handlePopupClick, true);

    return () => {
      mapContainer.removeEventListener('click', handlePopupClick, true);
    };
  }, []);

  // Render data layers on top of the base map
  const renderDataLayers = useCallback((
    map: any,
    L: any,
    data: MapApiResponse,
    filter: string = 'all'
  ) => {
    // Remove previous data layers
    dataLayersRef.current.forEach((layer) => map.removeLayer(layer));
    dataLayersRef.current = [];

    const newLayers: any[] = [];

    // Build barangay lookup
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

      const geoLayer = L.geoJSON(feature as any, {
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
              <div style="padding:14px 16px;min-width:220px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#fff1f2,#ffe4e6);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:14px;color:#1a1a2e;line-height:1.3;">${name}</div>
                    <div style="font-size:11px;color:#9ca3af;margin-top:1px;">Barangay</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fef2f4;border-radius:8px;margin-bottom:10px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span style="font-size:12px;font-weight:500;color:#e11d48;">${bd.patientCount} patient${bd.patientCount !== 1 ? 's' : ''}</span>
                </div>
                <div style="display:flex;gap:6px;">
                  <div style="flex:1;text-align:center;padding:6px 4px;background:#f0fdf4;border-radius:8px;">
                    <div style="font-size:15px;font-weight:700;color:#15803d;line-height:1;">${bd.riskDistribution.low}</div>
                    <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:500;letter-spacing:0.02em;">LOW</div>
                  </div>
                  <div style="flex:1;text-align:center;padding:6px 4px;background:#fffbeb;border-radius:8px;">
                    <div style="font-size:15px;font-weight:700;color:#b45309;line-height:1;">${bd.riskDistribution.moderate}</div>
                    <div style="font-size:10px;color:#fbbf24;margin-top:3px;font-weight:500;letter-spacing:0.02em;">MODERATE</div>
                  </div>
                  <div style="flex:1;text-align:center;padding:6px 4px;background:#fef2f2;border-radius:8px;">
                    <div style="font-size:15px;font-weight:700;color:#dc2626;line-height:1;">${bd.riskDistribution.high}</div>
                    <div style="font-size:10px;color:#f87171;margin-top:3px;font-weight:500;letter-spacing:0.02em;">HIGH</div>
                  </div>
                </div>
              </div>
            `;
            layer.bindPopup(popup);
          }
          layer.bindTooltip(name, { sticky: true });
        },
      });
      geoLayer.addTo(map);
      newLayers.push(geoLayer);
    });

    // Add patient markers
    const filteredMarkers = filter === 'all'
      ? data.markers
      : data.markers.filter((m) => m.riskLevel === filter);

    filteredMarkers.forEach((marker) => {
      const color = RISK_COLORS[marker.riskLevel] || RISK_COLORS.low;
      const bd = barangayLookup[marker.barangay];

      const circleMarker = L.circleMarker([marker.lat, marker.lng], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });
      circleMarker.addTo(map);

      // B6: Include "View Patient" button with data-patient-db-id attribute
      circleMarker.bindPopup(`
        <div style="padding:14px 16px;min-width:220px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#fff1f2,#ffe4e6);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <div style="font-weight:600;font-size:14px;color:#1a1a2e;line-height:1.3;">${marker.barangay}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:1px;">Patient Location</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#f8fafc;border-radius:8px;margin-bottom:10px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span style="font-size:12px;color:#475569;font-weight:500;">${marker.patientId}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;color:white;background:${color};box-shadow:0 1px 3px ${color}33;">
              <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.5);"></span>
              ${RISK_LABELS[marker.riskLevel] || marker.riskLevel}
            </span>
            ${bd ? `<span style="font-size:11px;color:#9ca3af;">${bd.patientCount} in area</span>` : ''}
          </div>
          <button class="view-patient-btn" data-patient-db-id="${marker.id}" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:12px;padding:8px 12px;background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity 0.15s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            View Patient Profile
          </button>
        </div>
      `);
      newLayers.push(circleMarker);
    });

    // Add centroid markers for barangays with aggregated data but no individual markers
    const barangaysWithMarkers = new Set(data.markers.map((m) => m.barangay));
    data.barangayData.forEach((bd) => {
      if (!barangaysWithMarkers.has(bd.barangay) && BARANGAY_CENTROIDS[bd.barangay]) {
        if (filter !== 'all' && bd.latestRiskLevel !== filter) return;

        const color = RISK_COLORS[bd.latestRiskLevel] || RISK_COLORS.low;
        const [lat, lng] = BARANGAY_CENTROIDS[bd.barangay];

        const centroidMarker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        });
        centroidMarker.addTo(map);
        centroidMarker.bindPopup(`
          <div style="padding:14px 16px;min-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#fff1f2,#ffe4e6);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <div style="font-weight:600;font-size:14px;color:#1a1a2e;line-height:1.3;">${bd.barangay}</div>
                <div style="font-size:11px;color:#9ca3af;margin-top:1px;">Aggregated Data</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fef2f4;border-radius:8px;margin-bottom:10px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style="font-size:12px;font-weight:500;color:#e11d48;">${bd.patientCount} patient${bd.patientCount !== 1 ? 's' : ''}</span>
            </div>
            <div style="display:flex;gap:6px;">
              <div style="flex:1;text-align:center;padding:6px 4px;background:#f0fdf4;border-radius:8px;">
                <div style="font-size:15px;font-weight:700;color:#15803d;line-height:1;">${bd.riskDistribution.low}</div>
                <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:500;letter-spacing:0.02em;">LOW</div>
              </div>
              <div style="flex:1;text-align:center;padding:6px 4px;background:#fffbeb;border-radius:8px;">
                <div style="font-size:15px;font-weight:700;color:#b45309;line-height:1;">${bd.riskDistribution.moderate}</div>
                <div style="font-size:10px;color:#fbbf24;margin-top:3px;font-weight:500;letter-spacing:0.02em;">MODERATE</div>
              </div>
              <div style="flex:1;text-align:center;padding:6px 4px;background:#fef2f2;border-radius:8px;">
                <div style="font-size:15px;font-weight:700;color:#dc2626;line-height:1;">${bd.riskDistribution.high}</div>
                <div style="font-size:10px;color:#f87171;margin-top:3px;font-weight:500;letter-spacing:0.02em;">HIGH</div>
              </div>
            </div>
          </div>
        `);
        newLayers.push(centroidMarker);
      }
    });

    dataLayersRef.current = newLayers;
  }, []);

  // Initialize map (runs once) — always render map tiles and barangay outlines
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let destroyed = false;

    const initMap = async () => {
      // Dynamically import leaflet to avoid SSR issues
      await import('leaflet/dist/leaflet.css');
      const L = (await import('leaflet')).default;

      if (destroyed || !mapRef.current) return;

      // Invalidate size to fix rendering if container was hidden
      const map = L.map(mapRef.current, {
        center: MAKATI_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // OpenStreetMap tiles — always visible
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Load accurate barangay boundaries from GeoJSON file (OSM source)
      try {
        const geoRes = await fetch('/makati-barangays.geojson');
        const geoData = await geoRes.json();
        BARANGAY_BOUNDARIES = geoData.features || [];

        // Add all 33 barangay boundary outlines
        BARANGAY_BOUNDARIES.forEach((feature: any) => {
          L.geoJSON(feature, {
            style: {
              color: '#e11d48',
              weight: 1.5,
              opacity: 0.4,
              fillColor: '#e11d48',
              fillOpacity: 0.06,
              dashArray: '5 3',
            },
            onEachFeature: (_f: any, layer: any) => {
              layer.bindTooltip(feature.properties.name, {
                sticky: true,
                className: 'barangay-label',
              });
            },
          }).addTo(map);
        });

        // Fit map to show all barangay boundaries
        const allBounds = L.geoJSON(geoData).getBounds();
        if (allBounds.isValid()) {
          map.fitBounds(allBounds, { padding: [30, 30], maxZoom: DEFAULT_ZOOM });
        }
      } catch (err) {
        console.error('Failed to load barangay GeoJSON:', err);
      }

      mapInstanceRef.current = map;
      setMapReady(true);

      // Force a resize after a short delay to ensure tiles load properly
      setTimeout(() => {
        if (!destroyed && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    initMap();

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (highlightLayerRef.current) {
        highlightLayerRef.current = null;
      }
      dataLayersRef.current = [];
      setMapReady(false);
    };
  }, []);

  // Fetch data after map is ready — useQuery handles fetching when mapReady becomes true
  useEffect(() => {
    if (!mapReady || !mapData || !mapInstanceRef.current) return;

    const renderLayers = async () => {
      const L = (await import('leaflet')).default;
      if (mapInstanceRef.current) {
        renderDataLayers(mapInstanceRef.current, L, mapData, riskFilter);
      }
    };

    renderLayers();
  }, [mapReady, mapData]);

  // Re-render data layers when filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData) return;

    const updateLayers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      if (!map) return;

      renderDataLayers(map, L, mapData, riskFilter);
    };

    updateLayers();
  }, [riskFilter, mapData, renderDataLayers]);

  // Compute summary stats
  const totalPatients = mapData?.barangayData.reduce((sum, b) => sum + b.patientCount, 0) ?? 0;
  const highRiskCount = mapData?.barangayData.reduce((sum, b) => sum + b.riskDistribution.high, 0) ?? 0;
  const moderateRiskCount = mapData?.barangayData.reduce((sum, b) => sum + b.riskDistribution.moderate, 0) ?? 0;
  const lowRiskCount = mapData?.barangayData.reduce((sum, b) => sum + b.riskDistribution.low, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4.5 w-4.5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Patients</p>
              <p className="text-lg font-semibold text-foreground">{totalPatients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Risk</p>
              <p className="text-lg font-semibold text-emerald-700">{lowRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Moderate Risk</p>
              <p className="text-lg font-semibold text-amber-700">{moderateRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
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

      {/* Map Card */}
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
              {/* Manual Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => refetchMapData()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>

              {/* D3: Barangay Search */}
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-[220px] justify-between h-8 text-xs font-normal"
                  >
                    {selectedBarangay ? (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                        {selectedBarangay}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Search className="h-3.5 w-3.5 flex-shrink-0" />
                        Search barangay...
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0 z-[1001]" align="start">
                  <Command>
                    <CommandInput placeholder="Type barangay name..." />
                    <CommandList>
                      <CommandEmpty>No barangay found.</CommandEmpty>
                      <CommandGroup>
                        {BARANGAY_NAMES.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={() => handleBarangaySelect(name)}
                              className="text-xs"
                            >
                              <MapPin className="h-3.5 w-3.5 text-rose-400 mr-1.5" />
                              {name}
                              {name === selectedBarangay && (
                                <span className="ml-auto text-rose-500 text-[10px] font-semibold">Selected</span>
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* D3: Clear search button */}
              {selectedBarangay && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}

              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Filter risk" />
                </SelectTrigger>
                <SelectContent className="z-[1001]">
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
          <div className="relative">
            {/* Map container is ALWAYS rendered — tiles load immediately */}
            <div
              ref={mapRef}
              className="w-full rounded-lg border border-rose-100 overflow-hidden bg-rose-50/30"
              style={{ height: '500px', minHeight: '400px' }}
            />

            {/* Loading overlay — small pill, does NOT block the map */}
            {loading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm border border-rose-100 rounded-full shadow-md px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-rose-600 animate-spin" />
                <span className="text-xs font-medium text-foreground">Loading patient data...</span>
              </div>
            )}

            {/* Error banner — small pill, does NOT block the map */}
            {error && !loading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-amber-50/95 backdrop-blur-sm border border-amber-200 rounded-full shadow-md px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900"
                  onClick={() => refetchMapData()}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Cached data indicator */}
            {isFromCache && !loading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded-full shadow-md px-4 py-2 flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Using cached data (offline)</span>
              </div>
            )}

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
        </CardContent>
      </Card>

      {/* Barangay Table — only show if there's data */}
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
                      className="border-b border-rose-50 hover:bg-rose-50/50 transition-colors cursor-pointer"
                      onClick={() => handleBarangaySelect(bd.barangay)}
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
