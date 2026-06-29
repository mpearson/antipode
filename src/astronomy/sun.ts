import type { LatLon } from '../types';

/**
 * Subsolar point: the lat/lon where the sun is directly overhead at a given
 * time. Uses a standard low-precision solar-position approximation (good to
 * well under a degree — plenty for a day/night terminator).
 *
 * Longitude uses a simple -15°/hr model with no equation-of-time, so the
 * terminator can be off by up to ~±4° E/W. Declination is accurate.
 */
export function subsolarPoint(date: Date): LatLon {
  const rad = Math.PI / 180;
  // days since J2000.0
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360; // mean longitude
  const g = ((357.528 + 0.9856003 * n) % 360) * rad; // mean anomaly
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad; // ecliptic long
  const epsilon = 23.439 * rad; // obliquity
  // solar declination
  const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) / rad;
  // Greenwich hour angle -> subsolar longitude. The sun is overhead at local
  // solar noon; at UTC noon it's near 0° longitude, moving -15°/hour.
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let lon = -15 * (utcHours - 12);
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return { lat: decl, lon };
}
