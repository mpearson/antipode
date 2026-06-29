import * as THREE from 'three';
import { R } from '../config';
import { makeSurfaceMaterial } from './materials';

/**
 * The opaque "see-through" model: the eye sits at exactly radius R looking
 * inward, so nothing is between the eye and the far inner wall. Rendering only
 * BACK faces culls the near hemisphere, so we see straight through to the far
 * side. The dark ocean/earth shell sits at EXACTLY R (co-radial with the eye and
 * the country fills) so it never pokes above the horizon plane (y=R). It's drawn
 * FIRST (renderOrder -1) with depthWrite:false as a pure background, so country
 * fills paint over it deterministically with no z-fight.
 *
 * Adds both the shell and a faint atmospheric halo to the given group.
 */
export function addShellAndAtmosphere(globe: THREE.Group): void {
  // ocean uses the same day/night shader as the country fills. 0x123450 is the
  // lit (day-side) ocean color; the shader dims it on the night side.
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 48),
    makeSurfaceMaterial(0x123450, { depthWrite: false }),
  );
  shell.renderOrder = -1; // strictly behind every country fill
  globe.add(shell);

  // faint atmospheric halo (subtle; transparent is fine for a single
  // non-overlapping shell)
  globe.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.06, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0x2a3f63,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
        fog: true,
      }),
    ),
  );
}
