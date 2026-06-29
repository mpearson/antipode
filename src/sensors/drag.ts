import * as THREE from 'three';

/**
 * Touch/mouse look control. Drag updates yaw/pitch; lookVector() turns them into
 * a gaze direction. Used as the fallback when motion sensors are unavailable
 * (desktop, or sensor permission blocked).
 *
 * yaw/pitch start at 0 = looking straight at the horizon. Negative pitch aims
 * down THROUGH the planet toward the far side; positive aims up at the sky.
 */
export class DragControls {
  yaw = 0;
  pitch = 0;
  private down = false;
  private px = 0;
  private py = 0;

  constructor(private target: HTMLElement) {}

  enable(): void {
    const c = this.target;
    c.addEventListener('pointerdown', (e) => {
      this.down = true;
      this.px = e.clientX;
      this.py = e.clientY;
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.down) return;
      this.yaw -= (e.clientX - this.px) * 0.005;
      this.pitch -= (e.clientY - this.py) * 0.005;
      this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));
      this.px = e.clientX;
      this.py = e.clientY;
    });
    c.addEventListener('pointerup', () => (this.down = false));
    c.addEventListener('pointercancel', () => (this.down = false));
  }

  lookVector(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.cos(this.pitch) * Math.sin(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch) * Math.cos(this.yaw),
    );
  }
}
