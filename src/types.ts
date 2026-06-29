// Shared type definitions.

/** A geographic coordinate in degrees. */
export interface LatLon {
  lat: number;
  lon: number;
}

/** A GeoJSON-style coordinate pair: [longitude, latitude] in degrees. */
export type LonLat = [number, number];

/** Sub-lunar point plus geocentric distance in Earth radii. */
export interface MoonPosition extends LatLon {
  dist: number;
}
