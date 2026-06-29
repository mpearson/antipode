import * as THREE from 'three';
import { R } from '../config';

/**
 * Horizon = eye-level line: the directions perpendicular to "up". The user's up
 * is world +Y and the eye is at (0,R,0), so this is a big ring in the y=R plane
 * centered on the eye. At large radius it projects to a straight horizontal line
 * through the pitch=0 vanishing point, banking correctly with device roll. Kept
 * in world space so it's independent of the spinning globe.
 *
 * Returns the line; the caller adds it to the scene (not the globe group).
 */
export function createHorizon(): THREE.Line {
  const HR = 50; // large radius -> reads as a straight line at infinity
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * HR, R, Math.sin(t) * HR));
  }
  const horizon = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({
      color: 0xff7a3d,
      transparent: true,
      opacity: 0.6,
      fog: false,
      depthTest: false,
      depthWrite: false,
    }),
  );
  horizon.renderOrder = 12; // above fills, grid, and country borders
  return horizon;
}
