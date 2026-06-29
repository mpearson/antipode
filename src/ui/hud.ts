import * as THREE from 'three';
import { R, R2D } from '../config';
import { fmt, vecToLL } from '../util/geo';

export interface HudFrame {
  dir: THREE.Vector3;
  eye: THREE.Vector3;
  q: THREE.Quaternion;
  camera: THREE.PerspectiveCamera;
  fills: THREE.Group;
  dragMode: boolean;
}

/** HUD overlay: per-frame readouts + the reticle's raycast country label. */
export class Hud {
  private elDepth = document.getElementById('depth')!;
  private elOrient = document.getElementById('orient')!;
  private elTarget = document.getElementById('target')!;
  private elHere = document.getElementById('here')!;
  private elReticle = document.getElementById('reticleLabel')!;
  private raycaster = new THREE.Raycaster();

  setHere(lat: number, lon: number): void {
    this.elHere.textContent = fmt(lat, lon);
  }

  update({ dir, eye, q, camera, fills, dragMode }: HudFrame): void {
    const downAmount = -dir.y;
    this.elDepth.textContent =
      downAmount > 0.85
        ? 'core / antipode'
        : downAmount > 0.4
          ? 'deep mantle'
          : downAmount > 0.05
            ? 'crust'
            : 'sky';

    const heading = ((Math.atan2(dir.x, dir.z) * R2D) + 360) % 360;
    const pitch = Math.asin(Math.max(-1, Math.min(1, dir.y))) * R2D;
    this.elOrient.textContent =
      `${heading.toFixed(0)}° · ${pitch.toFixed(0)}°` + (dragMode ? ' (drag)' : '');

    // "Looking at": coordinates of the point under the reticle. The eye sits ON
    // the globe (radius R), so the gaze ray meets the sphere once more at
    // t = -2R*dir.y — ahead only when aimed below the horizon (dir.y<0). Undo the
    // globe's spin to read that world point back as lat/lon.
    if (dir.y < -1e-3) {
      const t = -2 * R * dir.y;
      const hitPt = eye.clone().addScaledVector(dir, t);
      const local = hitPt.applyQuaternion(q.clone().conjugate()); // world -> geometry
      const ll = vecToLL(local);
      this.elTarget.textContent = fmt(ll.lat, ll.lon);
    } else {
      this.elTarget.textContent = '— (aim down)';
    }

    // Label whatever filled country sits under the center reticle. Cast from NDC
    // (0,0). We may hit the near side first and the far side second; take the
    // farthest hit when looking down so the label matches the "through" view.
    if (fills.children.length) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = this.raycaster.intersectObjects(fills.children, false);
      if (hits.length) {
        const pick = downAmount > 0.3 ? hits[hits.length - 1] : hits[0];
        this.elReticle.textContent = (pick.object.userData.name as string) || '';
      } else {
        this.elReticle.textContent = '';
      }
    }
  }
}
