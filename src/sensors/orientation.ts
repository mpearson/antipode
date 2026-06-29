import * as THREE from 'three';
import { D2R } from '../config';

// Some browsers expose an iOS-style permission gate on DeviceOrientationEvent.
type OrientationEventCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

/**
 * Reads device orientation (compass + tilt) and turns it into a look quaternion.
 * Listens for BOTH event types — Android Chrome often only fires the 'absolute'
 * variant; iOS fires the plain one. `gotData` flips on the first real event so a
 * watchdog can fall back to drag if nothing arrives.
 */
export class OrientationSensor {
  gotData = false;
  private oAlpha = 0;
  private oBeta = 0;
  private oGamma = 0;
  private screenAngle = 0;

  /** iOS feature-detect: kept as a no-op on Android/desktop. Throws if denied. */
  async requestPermission(): Promise<void> {
    const Ctor = DeviceOrientationEvent as OrientationEventCtor;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof Ctor.requestPermission === 'function') {
      const r = await Ctor.requestPermission();
      if (r !== 'granted') throw new Error('motion permission ' + r);
    }
  }

  attach(): void {
    // window.addEventListener('deviceorientation', this.onOrient, true);
    window.addEventListener('deviceorientationabsolute', this.onOrient, true);

    if (screen.orientation) {
      this.screenAngle = (screen.orientation.angle || 0) * D2R;
      screen.orientation.addEventListener('change', () => {
        this.screenAngle = (screen.orientation.angle || 0) * D2R;
      });
    }
  }

  private onOrient = (e: DeviceOrientationEvent): void => {
    if (e.alpha == null && e.beta == null && e.gamma == null) return;
    if (!this.gotData) this.gotData = true;
    this.oAlpha = (e.alpha || 0) * D2R;
    this.oBeta = (e.beta || 0) * D2R;
    this.oGamma = (e.gamma || 0) * D2R;
  };

  /**
   * Convert alpha/beta/gamma into a look quaternion, accounting for the -90° tilt
   * (phone held upright vs flat) and current screen rotation.
   */
  quaternion(): THREE.Quaternion {
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler(this.oBeta, this.oAlpha, -this.oGamma, 'YXZ');
    q.setFromEuler(euler);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    if (this.screenAngle) {
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -this.screenAngle));
    }
    return q;
  }
}
