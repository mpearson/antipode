import * as THREE from 'three';
import type { LonLat } from '../types';
import { sphericalPolygonGeometry } from './sphericalPolygon';

/**
 * Clip a [lon, lat] ring to the longitude slab [lonMin, lonMax] via
 * Sutherland–Hodgman (two half-plane clips on the lon axis).
 */
export function clipRingToLonBand(ring: LonLat[], lonMin: number, lonMax: number): LonLat[] {
  // intersect a segment with the lon boundary, interpolating lat
  const lerpLon = (a: LonLat, b: LonLat, keep: (lon: number) => boolean): LonLat => {
    const bound =
      keep(lonMin) && !keep(lonMax)
        ? lonMin
        : !keep(lonMin) && keep(lonMax)
          ? lonMax
          : Math.abs(a[0] - lonMin) < Math.abs(a[0] - lonMax)
            ? lonMin
            : lonMax;
    const t = (bound - a[0]) / ((b[0] - a[0]) || 1e-9);
    return [bound, a[1] + t * (b[1] - a[1])];
  };

  const clipEdge = (pts: LonLat[], keep: (lon: number) => boolean): LonLat[] => {
    const out: LonLat[] = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const prev = pts[(i + pts.length - 1) % pts.length];
      const curIn = keep(cur[0]);
      const prevIn = keep(prev[0]);
      if (curIn) {
        if (!prevIn) out.push(lerpLon(prev, cur, keep));
        out.push(cur);
      } else if (prevIn) {
        out.push(lerpLon(prev, cur, keep));
      }
    }
    return out;
  };

  let r = clipEdge(ring, (lon) => lon >= lonMin);
  if (r.length < 3) return [];
  r = clipEdge(r, (lon) => lon <= lonMax);
  return r.length >= 3 ? r : [];
}

/**
 * For polygons too wide for one gnomonic chart: clip into longitude bands,
 * triangulate each band's piece on its own chart, and merge the results.
 */
export function bandedSphericalGeometry(
  outerLL: LonLat[],
  holesLL: LonLat[][],
): THREE.BufferGeometry | null {
  let lonMin = Infinity;
  let lonMax = -Infinity;
  for (const p of outerLL) {
    if (p[0] < lonMin) lonMin = p[0];
    if (p[0] > lonMax) lonMax = p[0];
  }
  const BAND = 40; // degrees
  const merged: number[] = [];
  for (let lo = lonMin; lo < lonMax; lo += BAND) {
    const hi = Math.min(lo + BAND, lonMax);
    const piece = clipRingToLonBand(outerLL, lo, hi);
    if (piece.length < 3) continue;
    // holes clipped to the same band
    const pieceHoles = holesLL
      .map((h) => clipRingToLonBand(h, lo, hi))
      .filter((h) => h.length >= 3);
    const geo = sphericalPolygonGeometry(piece, pieceHoles, true);
    if (geo) {
      const pos = geo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) merged.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }
  if (!merged.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(merged, 3));
  g.computeVertexNormals();
  return g;
}
