import * as THREE from 'three';
import { OrientationSensor } from './orientation';
import { DragControls } from './drag';

/**
 * Provides the current gaze direction from device sensors when available, falling
 * back to touch/mouse drag. A watchdog switches to drag if no sensor data arrives
 * shortly after start (e.g. permission blocked, or a sandboxed context).
 */
export class LookController {
  dragMode = false;

  constructor(
    private orient: OrientationSensor,
    private drag: DragControls,
  ) {}

  enableDrag(): void {
    if (this.dragMode) return;
    this.dragMode = true;
    this.drag.enable();
  }

  /** After 2.5s with no sensor data and no drag, fall back to drag-to-look. */
  startWatchdog(): void {
    setTimeout(() => {
      if (!this.orient.gotData && !this.dragMode) {
        console.warn('no sensor data after 2.5s — switching to drag mode');
        this.enableDrag();
      }
    }, 2500);
  }

  lookDirection(): THREE.Vector3 {
    if (this.dragMode) return this.drag.lookVector();
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.orient.quaternion());
  }
}
