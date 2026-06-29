import * as THREE from 'three';
import { R } from '../config';
import { llToVec } from '../util/geo';

/**
 * Lat/lon reference grid (every 30°). Additive, depthTest:false so it floats on
 * top as an overlay. Lines are added to the given parent group.
 */
export function buildGraticule(parent: THREE.Group): void {
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });
  const lines: THREE.Line[] = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: THREE.Vector3[] = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push(llToVec(lat, lon, R));
    lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 4) pts.push(llToVec(lat, lon, R));
    lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  for (const ln of lines) {
    ln.renderOrder = 10;
    parent.add(ln);
  }
}
