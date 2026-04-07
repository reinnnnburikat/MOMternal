#!/usr/bin/env bun
/**
 * Fetch Makati City barangay boundaries from OpenStreetMap Overpass API
 * and convert to GeoJSON FeatureCollection.
 * 
 * Source: OpenStreetMap (admin_level=10 relations)
 * Target: /home/z/my-project/public/makati-barangays.geojson
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_PATH = join(PROJECT_ROOT, 'public', 'makati-barangays.geojson');
const MAP_VIEW_PATH = join(PROJECT_ROOT, 'src', 'components', 'map', 'map-view.tsx');

// All 33 Makati barangay OSM relation IDs
const BARANGAY_RELATIONS = {
  'Bangkal': 103729,
  'Bel-Air': 103701,
  'Carmona': 151235,
  'Cembo': 104458,
  'Comembo': 103752,
  'Dasmariñas': 103761,
  'East Rembo': 104460,
  'Forbes Park': 109972,
  'Guadalupe Nuevo': 104453,
  'Guadalupe Viejo': 104452,
  'Kasilawan': 104057,
  'La Paz': 130317,
  'Magallanes': 103760,
  'Olympia': 3014322,
  'Palanan': 103731,
  'Pembo': 103753,
  'Pinagkaisahan': 104456,
  'Pio Del Pilar': 103768,
  'Pitogo': 131671,
  'Poblacion': 103737,
  'Post Proper Northside': 1815341,
  'Post Proper Southside': 8851476,
  'Rizal': 131669,
  'San Antonio': 103702,
  'San Isidro': 103767,
  'San Lorenzo': 103690,
  'Santa Cruz': 104053,
  'Singkamas': 151238,
  'South Cembo': 104457,
  'Tejeros': 151237,
  'Urdaneta': 103686,
  'Valenzuela': 151236,
  'West Rembo': 104459,
};

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fetchWithRetry(url, body, timeout = 120000, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const baseUrl of OVERPASS_URLS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(body)}`,
          signal: controller.signal,
        });
        
        clearTimeout(timer);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        if (text.startsWith('<?xml') || text.startsWith('<!DOCTYPE')) {
          throw new Error('Got HTML/XML error response');
        }
        
        return JSON.parse(text);
      } catch (err) {
        const isLast = attempt === maxRetries && baseUrl === OVERPASS_URLS[OVERPASS_URLS.length - 1];
        if (!isLast) {
          console.log(`  Retry ${attempt}/${maxRetries} on ${baseUrl}: ${err.message}`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
        } else {
          throw err;
        }
      }
    }
  }
}

/**
 * Fetch geometry for a single relation and build a polygon
 */
async function fetchRelationGeometry(id) {
  const query = `[out:json][timeout:120];rel(${id});out geom;`;
  const data = await fetchWithRetry('', query);
  
  if (!data.elements || data.elements.length === 0) {
    throw new Error(`No data for relation ${id}`);
  }
  
  const rel = data.elements.find(e => e.type === 'relation');
  if (!rel) {
    throw new Error(`No relation found for id ${id}`);
  }
  
  return rel;
}

/**
 * Convert OSM relation members geometry to GeoJSON Polygon coordinates
 * Members are ways with geometry arrays of [lon, lat] pairs
 * We concatenate all outer ways into a single ring
 */
function relationToPolygonCoords(rel) {
  if (!rel.members || rel.members.length === 0) {
    throw new Error(`Relation ${rel.id} has no members`);
  }
  
  // Separate outer and inner rings
  const outerWays = rel.members.filter(m => m.role === 'outer' || m.role === '');
  const innerWays = rel.members.filter(m => m.role === 'inner');
  
  if (outerWays.length === 0 && rel.members.length > 0) {
    // If no role tags, treat all as outer
    outerWays.push(...rel.members);
  }
  
  // Merge outer way geometries into rings
  // For simple polygons, we just concatenate all outer way geometries
  const outerRings = mergeWaysIntoRings(outerWays);
  
  // Merge inner way geometries (holes)
  const innerRings = innerWays.length > 0 ? mergeWaysIntoRings(innerWays) : [];
  
  // If we have multiple outer rings and no inner rings, 
  // it might be a MultiPolygon case - for simplicity use the largest ring
  if (outerRings.length === 1 && innerRings.length === 0) {
    return [outerRings[0]]; // Simple polygon: [outerRing]
  } else if (outerRings.length >= 1) {
    // Polygon with holes or multiple outer rings
    // Use the largest outer ring as the main ring, others as holes
    outerRings.sort((a, b) => b.length - a.length);
    const coords = [outerRings[0]];
    // Add remaining outer rings as holes (simplified approach)
    for (let i = 1; i < outerRings.length; i++) {
      coords.push(outerRings[i]);
    }
    for (const ring of innerRings) {
      coords.push(ring);
    }
    return coords;
  }
  
  throw new Error(`Could not build rings for relation ${rel.id}`);
}

/**
 * Merge way segments into closed rings by matching endpoints
 */
function mergeWaysIntoRings(ways) {
  if (ways.length === 0) return [];
  
  // Get all geometry arrays
  const geoms = ways
    .filter(w => w.geometry && w.geometry.length > 0)
    .map(w => w.geometry.map(p => [p.lon, p.lat]));
  
  if (geoms.length === 0) return [];
  
  // Simple approach: concatenate all geometries
  // This works when ways are already in order (which OSM out geom usually provides)
  let merged = [...geoms[0]];
  
  for (let i = 1; i < geoms.length; i++) {
    const geom = geoms[i];
    
    // Check if the last point of merged matches the first point of geom
    const lastPt = merged[merged.length - 1];
    const firstPt = geom[0];
    
    if (lastPt[0] === firstPt[0] && lastPt[1] === firstPt[1]) {
      // Direct connection - skip duplicate point
      merged.push(...geom.slice(1));
    } else {
      // Check reverse connection
      const lastGeomPt = geom[geom.length - 1];
      if (lastPt[0] === lastGeomPt[0] && lastPt[1] === lastGeomPt[1]) {
        merged.push(...geom.slice(0, -1).reverse());
      } else {
        // Check if start of merged matches end of geom
        const firstMerged = merged[0];
        if (firstMerged[0] === lastGeomPt[0] && firstMerged[1] === lastGeomPt[1]) {
          merged = [...geom.slice(0, -1), ...merged];
        } else {
          // Just append - might have a gap but better than losing data
          console.log(`  Warning: gap in ring, appending anyway (last=${lastPt}, first=${firstPt})`);
          merged.push(...geom);
        }
      }
    }
  }
  
  // Close the ring
  const firstMerged = merged[0];
  const lastMerged = merged[merged.length - 1];
  if (firstMerged[0] !== lastMerged[0] || firstMerged[1] !== lastMerged[1]) {
    merged.push([...firstMerged]);
  }
  
  // Remove duplicate consecutive points
  const cleaned = [merged[0]];
  for (let i = 1; i < merged.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = merged[i];
    if (prev[0] !== curr[0] || prev[1] !== curr[1]) {
      cleaned.push(curr);
    }
  }
  
  return [cleaned];
}

/**
 * Compute centroid from polygon coordinates (mean of all points)
 */
function computeCentroid(coords) {
  // coords is array of rings, each ring is array of [lon, lat]
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
async function main() {
  console.log('=== Fetching Makati Barangay Boundaries from OSM ===\n');
  
  const features = [];
  const centroids = {};
  const barangayNames = Object.keys(BARANGAY_RELATIONS);
  let totalPoints = 0;
  let errors = [];
  
  for (let i = 0; i < barangayNames.length; i++) {
    const name = barangayNames[i];
    const id = BARANGAY_RELATIONS[name];
    
    process.stdout.write(`[${i + 1}/${barangayNames.length}] Fetching ${name} (rel/${id})... `);
    
    try {
      const rel = await fetchRelationGeometry(id);
      const polygonCoords = relationToPolygonCoords(rel);
      
      const outerPoints = polygonCoords[0].length;
      totalPoints += outerPoints;
      
      // Verify name matches
      const osmName = rel.tags?.name || name;
      if (osmName !== name) {
        console.log(`⚠️  OSM name differs: "${osmName}" vs expected "${name}"`);
      }
      
      const feature = {
        type: 'Feature',
        properties: {
          name: name,
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
      
      // Compute centroid
      const centroid = computeCentroid(polygonCoords);
      centroids[name] = centroid;
      
      console.log(`✓ (${outerPoints} points, centroid: [${centroid}])`);
      
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
      errors.push({ name, id, error: err.message });
    }
    
    // Small delay between requests to be polite to the API
    if (i < barangayNames.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Build GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: features,
  };
  
  // Validate
  console.log('\n=== Validation ===');
  console.log(`Total features: ${features.length}`);
  console.log(`Expected: 33`);
  console.log(`Missing: ${33 - features.length}`);
  
  const featureNames = features.map(f => f.properties.name).sort();
  const expectedNames = barangayNames.sort();
  const missingNames = expectedNames.filter(n => !featureNames.includes(n));
  const extraNames = featureNames.filter(n => !expectedNames.includes(n));
  
  if (missingNames.length > 0) console.log(`Missing barangays: ${missingNames.join(', ')}`);
  if (extraNames.length > 0) console.log(`Extra barangays: ${extraNames.join(', ')}`);
  if (errors.length > 0) {
    console.log(`Errors:`);
    errors.forEach(e => console.log(`  - ${e.name} (rel/${e.id}): ${e.error}`));
  }
  
  // Point statistics
  const avgPoints = features.length > 0 ? Math.round(totalPoints / features.length) : 0;
  const minPoints = features.length > 0 ? Math.min(...features.map(f => f.geometry.coordinates[0].length)) : 0;
  const maxPoints = features.length > 0 ? Math.max(...features.map(f => f.geometry.coordinates[0].length)) : 0;
  console.log(`\nPoint statistics:`);
  console.log(`  Average points per polygon: ${avgPoints}`);
  console.log(`  Min points: ${minPoints}`);
  console.log(`  Max points: ${maxPoints}`);
  console.log(`  Total points: ${totalPoints}`);
  
  // Save GeoJSON
  try {
    writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));
    console.log(`\n✅ GeoJSON saved to: ${OUTPUT_PATH}`);
    console.log(`   File size: ${(Buffer.byteLength(JSON.stringify(geojson)) / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.log(`\n❌ Failed to save GeoJSON: ${err.message}`);
    process.exit(1);
  }
  
  // Print centroids for map-view.tsx update
  console.log('\n=== Centroids for map-view.tsx ===');
  console.log('const BARANGAY_CENTROIDS: Record<string, [number, number]> = {');
  for (const [name, [lat, lng]] of Object.entries(centroids)) {
    console.log(`  '${name}': [${lat}, ${lng}],`);
  }
  console.log('};');
  
  // Save centroids to file for easy reference
  const centroidsPath = join(PROJECT_ROOT, 'public', 'makati-centroids.json');
  writeFileSync(centroidsPath, JSON.stringify(centroids, null, 2));
  console.log(`\n✅ Centroids saved to: ${centroidsPath}`);
  
  // Worklog
  const worklog = [
    `[GeoJSON Update] ${new Date().toISOString()}`,
    `Source: OpenStreetMap Overpass API (relations with full geometry)`,
    `Barangays fetched: ${features.length}/33`,
    `Average points per polygon: ${avgPoints} (was ~86 previously)`,
    `Min/Max points: ${minPoints}/${maxPoints}`,
    `Missing: ${missingNames.join(', ') || 'None'}`,
    `Errors: ${errors.length > 0 ? errors.map(e => e.name).join(', ') : 'None'}`,
  ].join('\n');
  
  const worklogPath = join(PROJECT_ROOT, 'worklog.md');
  try {
    const existing = readFileSync(worklogPath, 'utf-8');
    writeFileSync(worklogPath, worklog + '\n\n---\n\n' + existing);
  } catch {
    writeFileSync(worklogPath, worklog + '\n');
  }
  console.log(`\n✅ Worklog updated`);
  
  console.log('\n=== DONE ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
