// Shared constants for the Antipode viewer.

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

/** Earth radius in scene units. The eye sits at exactly this radius (on the surface). */
export const R = 1;

/** How far out the sun/moon sit, within the camera far plane. */
export const SKY_DIST = 50;

/** Exponential fog density; must match the in-shader uFogDensity in materials.ts. */
export const FOG_DENSITY = 0.42;

/** Background / fog color. */
export const BG_COLOR = 0x05070d;

/** Fallback observer position (Kauaʻi) when geolocation is unavailable. */
export const PRESET_LAT = 22.0599209;
export const PRESET_LON = -159.3178611;
