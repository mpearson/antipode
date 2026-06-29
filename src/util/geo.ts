import * as THREE from 'three';
import { D2R, R2D } from '../config';
import type { LatLon } from '../types';

/** The point diametrically opposite (lat, lon) on the sphere. */
export function antipode(lat: number, lon: number): LatLon {
  return { lat: -lat, lon: lon > 0 ? lon - 180 : lon + 180 };
}

/** Human-readable "12.34°N 56.78°W" formatting. */
export function fmt(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`;
}

/** Lat/lon (degrees) to a position vector on a sphere of radius r. */
export function llToVec(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * D2R;
  const theta = (lon + 180) * D2R;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/** Inverse of llToVec: a (geometry-space) direction back to lat/lon in degrees. */
export function vecToLL(v: THREE.Vector3): LatLon {
  const u = v.clone().normalize();
  const lat = Math.asin(Math.max(-1, Math.min(1, u.y))) * R2D;
  let lon = Math.atan2(u.z, -u.x) * R2D - 180; // atan2 gives (lon+180)
  lon = (((lon + 180) % 360) + 360) % 360 - 180; // wrap to [-180, 180]
  return { lat, lon };
}

/** Deterministic hash so each country gets a stable distinct hue. */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}
