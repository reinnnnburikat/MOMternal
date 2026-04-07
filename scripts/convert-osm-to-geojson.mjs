#!/usr/bin/env bun
/**
 * Convert already-fetched OSM Overpass data (osm_all_brgys.json)
 * to proper GeoJSON FeatureCollection with polygons and centroids.
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const INPUT_PATH = join(PROJECT_ROOT, 'osm_all_brgys.json');
const OUTPUT_PATH = join(PROJECT_ROOT, 'public', 'makati-barangays.geojson');
const CENTROIDS_PATH = join(PROJECT_ROOT, 'public', 'makati-centroids.json');

// Official list of 33 Makati barangays
const EXPECTED_BARANGAYS = [
  'Bangkal', 'Bel-Air', 'Carmona', 'Cembo', 'Comembo', 'Dasmariñas',
  'East Rembo', 'Forbes Park', 'Guadalupe Nuevo', 'Guadalupe Viejo',
  'Kasilawan', 'La Paz', 'Magallanes', 'Olympia', 'Palanan', 'Pembo',
  'Pinagkaisahan', 'Pio Del Pilar', 'Pitogo', 'Poblacion',
  'Post Proper Northside', 'Post Proper Southside', 'Rizal', 'San Antonio',
  'San Isidro', 'San Lorenzo', 'Santa Cruz', 'Singkamas', 'South Cembo',
  'Tejeros', 'Urdaneta', 'Valenzuela', 'West Rembo'
];

// OSM relation IDs that are NOT in Makati (verified by checking bounds)
// Rizal (131669) is at 121.057-121.067 lon, outside Makati's max 121.0501
const INVALID_OSM_IDS = new Set([131669]);

// OSM name -> canonical name mapping (for spelling normalization)
const NAME_MAP = {
  'Urdaneta': 'Urdaneta',
  'San Lorenzo': 'San Lorenzo',
  'Bel-Air': 'Bel-Air',
  'San Antonio': 'San Antonio',
  'Bangkal': 'Bangkal',
  'Palanan': 'Palanan',
  'Poblacion': 'Poblacion',
  'Comembo': 'Comembo',
  'Pembo': 'Pembo',
  'Magallanes': 'Magallanes',
  'Dasmariñas': 'Dasmariñas',
  'Dasmariñas Village': 'Dasmariñas',
  'San Isidro': 'San Isidro',
  'Pio del Pilar': 'Pio Del Pilar',
  'Pio Del Pilar': 'Pio Del Pilar',
  'Santa Cruz': 'Santa Cruz',
  'Kasilawan': 'Kasilawan',
  'Guadalupe Viejo': 'Guadalupe Viejo',
  'Guadalupe Nuevo': 'Guadalupe Nuevo',
  'Pinagkaisahan': 'Pinagkaisahan',
  'South Cembo': 'South Cembo',
  'Cembo': 'Cembo',
  'West Rembo': 'West Rembo',
  'East Rembo': 'East Rembo',
  'Forbes Park': 'Forbes Park',
  'La Paz': 'La Paz',
  'Rizal': 'Rizal',
  'Pitogo': 'Pitogo',
  'Carmona': 'Carmona',
  'Valenzuela': 'Valenzuela',
  'Tejeros': 'Tejeros',
  'Singkamas': 'Singkamas',
  'Post Proper Northside': 'Post Proper Northside',
  'Post Proper Southside': 'Post Proper Southside',
  'Olympia': 'Olympia',
};

/**
 * Merge way segments into closed rings by matching endpoints
 */
function mergeWaysIntoRings(ways) {
  if (ways.length === 0) return [];

  // Get all geometry arrays - each way has geometry: [{lon, lat}, ...]
  const geoms = ways
    .filter(w => w.geometry && w.geometry.length > 0)
    .map(w => w.geometry.map(p => [p.lon, p.lat]));

  if (geoms.length === 0) return [];

  // Try to build connected rings from the way segments
  // Each segment is an array of [lon, lat] points
  const segments = geoms.map(g => ({ points: g, used: false }));

  const rings = [];

  for (const seg of segments) {
    if (seg.used) continue;

    // Start a new ring with this segment
    let ring = [...seg.points];
    seg.used = true;

    // Try to extend the ring by finding connecting segments
    let changed = true;
    let maxIter = 100; // safety limit
    while (changed && maxIter-- > 0) {
      changed = false;
      const ringEnd = ring[ring.length - 1];
      const ringStart = ring[0];

      for (const other of segments) {
        if (other.used) continue;

        const otherStart = other.points[0];
        const otherEnd = other.points[other.points.length - 1];

        // Check if other segment connects to end of ring
        if (ringEnd[0] === otherStart[0] && ringEnd[1] === otherStart[1]) {
          ring.push(...other.points.slice(1));
          other.used = true;
          changed = true;
          break;
        }

        // Check if other segment (reversed) connects to end of ring
        if (ringEnd[0] === otherEnd[0] && ringEnd[1] === otherEnd[1]) {
          ring.push(...[...other.points].reverse().slice(1));
          other.used = true;
          changed = true;
          break;
        }

        // Check if other segment connects to start of ring
        if (ringStart[0] === otherEnd[0] && ringStart[1] === otherEnd[1]) {
          ring = [...other.points.slice(0, -1), ...ring];
          other.used = true;
          changed = true;
          break;
        }

        // Check if other segment (reversed) connects to start of ring
        if (ringStart[0] === otherStart[0] && ringStart[1] === otherStart[1]) {
          ring = [...[...other.points].reverse().slice(0, -1), ...ring];
          other.used = true;
          changed = true;
          break;
        }
      }
    }

    // Close the ring
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
    }

    // Remove duplicate consecutive points
    const cleaned = [ring[0]];
    for (let i = 1; i < ring.length; i++) {
      const prev = cleaned[cleaned.length - 1];
      const curr = ring[i];
      if (prev[0] !== curr[0] || prev[1] !== curr[1]) {
        cleaned.push(curr);
      }
    }

    rings.push(cleaned);
  }

  return rings;
}

/**
 * Convert OSM relation to GeoJSON polygon coordinates
 */
function relationToPolygonCoords(rel) {
  if (!rel.members || rel.members.length === 0) {
    throw new Error(`Relation ${rel.id} has no members`);
  }

  // Separate outer and inner rings by role
  const outerWays = rel.members.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '' || m.role === undefined));
  const innerWays = rel.members.filter(m => m.type === 'way' && m.role === 'inner');

  // If no role differentiation, treat all as outer
  const allWays = outerWays.length > 0 ? outerWays : rel.members.filter(m => m.type === 'way' && m.geometry);

  const outerRings = mergeWaysIntoRings(allWays);
  const innerRings = innerWays.length > 0 ? mergeWaysIntoRings(innerWays) : [];

  if (outerRings.length === 0) {
    throw new Error(`Relation ${rel.id}: could not build any rings`);
  }

  // Sort outer rings by point count (largest first = main boundary)
  outerRings.sort((a, b) => b.length - a.length);

  // Build GeoJSON polygon coordinates: [outerRing, hole1, hole2, ...]
  const coords = [outerRings[0]];
  
  // If there are multiple outer rings, treat smaller ones as additional rings
  // For a proper Polygon, only 1 outer ring + holes. 
  // If multiple outer rings exist, this should be a MultiPolygon,
  // but for simplicity we'll use the largest ring.
  for (let i = 1; i < outerRings.length; i++) {
    // These could be separate parts or holes - include as holes for now
    if (outerRings[i].length > 3) {
      coords.push(outerRings[i]);
    }
  }

  // Add inner rings (holes)
  for (const ring of innerRings) {
    if (ring.length > 3) {
      coords.push(ring);
    }
  }

  return coords;
}

/**
 * Compute centroid from polygon coordinates (mean of all points)
 * Returns [lat, lng] for Leaflet
 */
function computeCentroid(coords) {
  const outerRing = coords[0];
  // Remove closing point for mean calculation
  const points = outerRing.slice(0, -1);

  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of points) {
    sumLng += lng;
    sumLat += lat;
  }

  return [
    parseFloat((sumLat / points.length).toFixed(4)),
    parseFloat((sumLng / points.length).toFixed(4)),
  ];
}

// --- Main ---
const rawData = JSON.parse(readFileSync(INPUT_PATH, 'utf-8'));
const elements = rawData.elements.filter(e => e.type === 'relation');

console.log(`Loaded ${elements.length} relations from OSM data\n`);

const features = [];
const centroids = {};
let totalPoints = 0;
let errors = [];

for (const rel of elements) {
  const osmName = rel.tags?.name;
  if (!osmName) {
    console.log(`⚠️  Skipping relation ${rel.id}: no name tag`);
    errors.push({ id: rel.id, error: 'no name' });
    continue;
  }

  // Skip relations that are verified to NOT be in Makati
  if (INVALID_OSM_IDS.has(rel.id)) {
    console.log(`⚠️  Skipping ${osmName} (rel/${rel.id}): OSM relation is outside Makati bounds`);
    errors.push({ name: osmName, id: rel.id, error: 'outside Makati bounds' });
    continue;
  }

  const canonicalName = NAME_MAP[osmName] || osmName;

  process.stdout.write(`Processing ${osmName} -> ${canonicalName}... `);

  try {
    const polygonCoords = relationToPolygonCoords(rel);
    const outerPoints = polygonCoords[0].length;
    totalPoints += outerPoints;

    const feature = {
      type: 'Feature',
      properties: {
        name: canonicalName,
        type: 'Barangay',
        osmId: rel.id,
        osmName: osmName,
      },
      geometry: {
        type: 'Polygon',
        coordinates: polygonCoords,
      },
    };

    features.push(feature);

    const centroid = computeCentroid(polygonCoords);
    centroids[canonicalName] = centroid;

    console.log(`✓ (${outerPoints} points)`);
  } catch (err) {
    console.log(`✗ ${err.message}`);
    errors.push({ name: osmName, id: rel.id, error: err.message });
  }
}

// Build GeoJSON
const geojson = { type: 'FeatureCollection', features };

// --- Validation ---
console.log('\n=== Validation ===');
console.log(`Features created: ${features.length}/33`);

const featureNames = new Set(features.map(f => f.properties.name));
const missing = EXPECTED_BARANGAYS.filter(n => !featureNames.has(n));
const extra = features.filter(f => !EXPECTED_BARANGAYS.includes(f.properties.name));

if (missing.length > 0) console.log(`⚠️  Missing: ${missing.join(', ')} (no OSM boundary relation found)`);
else console.log('✅ All 33 barangays present');

if (extra.length > 0) console.log(`⚠️  Extra: ${extra.map(f => f.properties.name).join(', ')}`);
if (errors.length > 0) {
  console.log(`Errors:`);
  errors.forEach(e => console.log(`  - ${e.name || e.id}: ${e.error}`));
}

// Validate each feature has valid geometry
let invalidFeatures = 0;
for (const f of features) {
  if (!f.geometry || f.geometry.type !== 'Polygon') {
    console.log(`❌ ${f.properties.name}: invalid geometry type`);
    invalidFeatures++;
  }
  if (!f.geometry.coordinates || f.geometry.coordinates.length === 0) {
    console.log(`❌ ${f.properties.name}: no coordinates`);
    invalidFeatures++;
  }
  if (f.geometry.coordinates[0].length < 4) {
    console.log(`❌ ${f.properties.name}: too few points (${f.geometry.coordinates[0].length})`);
    invalidFeatures++;
  }
}
if (invalidFeatures === 0) console.log('✅ All features have valid Polygon geometry');

// Point statistics
const avgPoints = features.length > 0 ? Math.round(totalPoints / features.length) : 0;
const minPoints = features.length > 0 ? Math.min(...features.map(f => f.geometry.coordinates[0].length)) : 0;
const maxPoints = features.length > 0 ? Math.max(...features.map(f => f.geometry.coordinates[0].length)) : 0;
console.log(`\nPoint statistics:`);
console.log(`  Average points per polygon: ${avgPoints}`);
console.log(`  Min/Max: ${minPoints}/${maxPoints}`);
console.log(`  Total: ${totalPoints}`);

// Save GeoJSON
const geojsonStr = JSON.stringify(geojson);
writeFileSync(OUTPUT_PATH, geojsonStr);
const sizeKB = (Buffer.byteLength(geojsonStr) / 1024).toFixed(1);
console.log(`\n✅ GeoJSON saved: ${OUTPUT_PATH} (${sizeKB} KB)`);

// Save centroids
writeFileSync(CENTROIDS_PATH, JSON.stringify(centroids, null, 2));
console.log(`✅ Centroids saved: ${CENTROIDS_PATH}`);

// Print centroids for easy copy to map-view.tsx
console.log('\n=== BARANGAY_CENTROIDS (copy to map-view.tsx) ===');
console.log('const BARANGAY_CENTROIDS: Record<string, [number, number]> = {');
for (const name of EXPECTED_BARANGAYS) {
  const c = centroids[name];
  if (c) {
    console.log(`  '${name}': [${c[0]}, ${c[1]}],`);
  } else {
    console.log(`  // '${name}': MISSING CENTROID,`);
  }
}
console.log('};');
