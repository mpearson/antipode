import type { MoonPosition } from '../types';

/**
 * Sub-lunar point (where the Moon is overhead) + geocentric distance in Earth
 * radii. Compact lunar theory (Schlyter) with the main periodic perturbations —
 * good to roughly a few tenths of a degree, plenty to place the disk and get its
 * apparent size right. Returns { lat, lon (deg), dist (Earth radii) }.
 */
export function moonPosition(date: Date): MoonPosition {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451543.5; // Schlyter's day number
  const rev = (x: number) => ((x % 360) + 360) % 360; // wrap to [0,360)

  // Moon orbital elements
  const N = rev(125.1228 - 0.0529538083 * d) * rad; // ascending node
  const i = 5.1454 * rad; // inclination
  const w = rev(318.0634 + 0.1643573223 * d); // arg. of perigee (deg)
  const a = 60.2666; // mean distance (Earth radii)
  const e = 0.0549; // eccentricity
  const M = rev(115.3654 + 13.0649929509 * d); // mean anomaly (deg)

  // Sun elements needed for the perturbation arguments
  const ws = 282.9404 + 4.70935e-5 * d;
  const Ms = rev(356.047 + 0.9856002585 * d);

  // eccentric anomaly (iterate Kepler a couple of times)
  let E = M + e * deg * Math.sin(M * rad) * (1 + e * Math.cos(M * rad));
  for (let k = 0; k < 3; k++) {
    E = E - (E - e * deg * Math.sin(E * rad) - M) / (1 - e * Math.cos(E * rad));
  }
  const Er = E * rad;

  // position in the orbital plane -> distance and true anomaly
  const xv = a * (Math.cos(Er) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(Er);
  let r = Math.sqrt(xv * xv + yv * yv);
  const v = Math.atan2(yv, xv); // rad
  const vw = v + w * rad;

  // geocentric ecliptic rectangular -> ecliptic lon/lat
  const xe = r * (Math.cos(N) * Math.cos(vw) - Math.sin(N) * Math.sin(vw) * Math.cos(i));
  const ye = r * (Math.sin(N) * Math.cos(vw) + Math.cos(N) * Math.sin(vw) * Math.cos(i));
  const ze = r * (Math.sin(vw) * Math.sin(i));
  let lonecl = Math.atan2(ye, xe) * deg;
  let latecl = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * deg;

  // main periodic perturbations (degrees / Earth radii)
  const Lm = rev(N * deg + w + M); // Moon mean longitude
  const Ls = rev(ws + Ms); // Sun mean longitude
  const Dm = rev(Lm - Ls); // mean elongation
  const F = rev(Lm - N * deg); // argument of latitude
  const s = (x: number) => Math.sin(x * rad);
  const c = (x: number) => Math.cos(x * rad);
  lonecl +=
    -1.274 * s(M - 2 * Dm) +
    0.658 * s(2 * Dm) -
    0.186 * s(Ms) -
    0.059 * s(2 * M - 2 * Dm) -
    0.057 * s(M - 2 * Dm + Ms) +
    0.053 * s(M + 2 * Dm) +
    0.046 * s(2 * Dm - Ms) +
    0.041 * s(M - Ms) -
    0.035 * s(Dm) -
    0.031 * s(M + Ms) -
    0.015 * s(2 * F - 2 * Dm) +
    0.011 * s(M - 4 * Dm);
  latecl +=
    -0.173 * s(F - 2 * Dm) -
    0.055 * s(M - F - 2 * Dm) -
    0.046 * s(M + F - 2 * Dm) +
    0.033 * s(F + 2 * Dm) +
    0.017 * s(2 * M + F);
  r += -0.58 * c(M - 2 * Dm) - 0.46 * c(2 * Dm);

  // ecliptic -> equatorial (RA/Dec)
  const ecl = (23.4393 - 3.563e-7 * d) * rad;
  const lo = lonecl * rad;
  const la = latecl * rad;
  const xg = Math.cos(lo) * Math.cos(la);
  const yg = Math.sin(lo) * Math.cos(la);
  const zg = Math.sin(la);
  const xq = xg;
  const yq = yg * Math.cos(ecl) - zg * Math.sin(ecl);
  const zq = yg * Math.sin(ecl) + zg * Math.cos(ecl);
  const RA = Math.atan2(yq, xq) * deg;
  const Dec = Math.atan2(zq, Math.sqrt(xq * xq + yq * yq)) * deg;

  // sub-lunar longitude = RA - Greenwich mean sidereal time
  const n2 = jd - 2451545.0;
  const GMST = rev(280.46061837 + 360.98564736629 * n2);
  let subLon = RA - GMST;
  subLon = (((subLon + 180) % 360) + 360) % 360 - 180;
  return { lat: Dec, lon: subLon, dist: r };
}
