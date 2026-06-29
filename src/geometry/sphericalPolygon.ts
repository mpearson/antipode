import * as THREE from 'three';
import { R } from '../config';
import { llToVec } from '../util/geo';
import type { LonLat } from '../types';
import { bandedSphericalGeometry } from './bandedPolygon';

/** Signed area of a 2D ring (positive = CCW). */
export function ringArea2D(pts: THREE.Vector2[]): number {
  let a = 0;
  for (let i = 0, n = pts.length, j = n - 1; i < n; j = i++) {
    a += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
  }
  return a / 2;
}

/**
 * Triangulate a spherical polygon by projecting it gnomonically onto the tangent
 * plane at the polygon's centroid, ear-clipping there, then mapping vertices back
 * to the sphere. In a gnomonic projection every great circle is a straight line,
 * so triangle edges become geodesics that hug the surface — this removes the pole
 * distortion and antimeridian spanning that a flat lon/lat triangulation
 * produces. Each polygon uses its OWN center, so there is no global seam.
 *
 * Rings are [lon, lat] in degrees. Returns null if the polygon can't be charted.
 */
export function sphericalPolygonGeometry(
  outer: LonLat[],
  holes: LonLat[][],
  noBand = false,
): THREE.BufferGeometry | null {
  const clean = (ring: LonLat[]): LonLat[] => {
    const pts = ring.slice();
    if (pts.length > 1) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (a[0] === b[0] && a[1] === b[1]) pts.pop();
    }
    // drop near-duplicate consecutive vertices — ear-clipping turns these into
    // zero-area slivers that read as overlapping triangles
    const out: LonLat[] = [];
    const EPS = 1e-7;
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const prev = pts[(i + pts.length - 1) % pts.length];
      if (Math.abs(cur[0] - prev[0]) > EPS || Math.abs(cur[1] - prev[1]) > EPS) out.push(cur);
    }
    return out;
  };

  const outerLL = clean(outer);
  if (outerLL.length < 3) return null;
  const holesLL = (holes || []).map(clean).filter((h) => h.length >= 3);

  // 3D unit vectors for every vertex
  const toVec = (p: LonLat) => llToVec(p[1], p[0], 1).normalize();
  const outerV = outerLL.map(toVec);
  const holesV = holesLL.map((h) => h.map(toVec));

  // projection center = normalized average of the outer ring's 3D points
  const center = new THREE.Vector3();
  for (const v of outerV) center.add(v);
  if (center.lengthSq() < 1e-9) return null; // ring wraps a full great circle; skip
  center.normalize();

  // build a tangent basis (east, north) at the center
  const up = new THREE.Vector3(0, 1, 0);
  let east = new THREE.Vector3().crossVectors(up, center);
  if (east.lengthSq() < 1e-9) east = new THREE.Vector3(1, 0, 0); // center at a pole
  east.normalize();
  const north = new THREE.Vector3().crossVectors(center, east).normalize();

  // gnomonic projection: project v onto the plane tangent at center.
  // valid only for the hemisphere facing center (v·center > 0).
  const project = (v: THREE.Vector3): THREE.Vector2 | null => {
    const d = v.dot(center);
    if (d <= 1e-4) return null; // point on far side / at 90°+, can't project
    const s = 1 / d;
    return new THREE.Vector2(
      v.clone().multiplyScalar(s).dot(east),
      v.clone().multiplyScalar(s).dot(north),
    );
  };

  const projectRing = (ring: THREE.Vector3[]): THREE.Vector2[] | null => {
    const out: THREE.Vector2[] = [];
    for (const v of ring) {
      const p = project(v);
      if (!p) return null; // any unprojectable point => polygon too large for one chart
      out.push(p);
    }
    return out;
  };

  const contour = projectRing(outerV);
  if (!contour || contour.length < 3) {
    // Polygon too large for a single gnomonic chart (e.g. Russia, Antarctica).
    // Fall back to clipping it into ~40°-wide longitude bands and triangulating
    // each band on its own chart. The noBand guard stops a degenerate band from
    // recursing forever.
    if (noBand) return null;
    return bandedSphericalGeometry(outerLL, holesLL);
  }
  const holeContours: THREE.Vector2[][] = [];
  for (const hv of holesV) {
    const hc = projectRing(hv);
    if (hc && hc.length >= 3) holeContours.push(hc);
  }

  // winding: contour CCW, holes CW (what triangulateShape expects)
  const forceWinding = (pts: THREE.Vector2[], wantCCW: boolean) =>
    ringArea2D(pts) > 0 === wantCCW ? pts : pts.slice().reverse();
  const c2 = forceWinding(contour, true);
  const h2 = holeContours.map((h) => forceWinding(h, false));

  let faces: number[][];
  try {
    faces = THREE.ShapeUtils.triangulateShape(c2, h2);
  } catch {
    return null;
  }
  if (!faces || !faces.length) return null;

  // map each 2D projected point back to a 3D sphere point:
  // unproject p -> direction (center + p.x*east + p.y*north), normalize, *R
  const flat2D = c2.slice();
  for (const h of h2) for (const v of h) flat2D.push(v);
  const flat3D = flat2D.map((p) => {
    const dir = center
      .clone()
      .add(east.clone().multiplyScalar(p.x))
      .add(north.clone().multiplyScalar(p.y));
    return dir.normalize().multiplyScalar(R);
  });

  const positions: number[] = [];
  for (const tri of faces) {
    for (const idx of tri) {
      const s = flat3D[idx];
      positions.push(s.x, s.y, s.z);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
