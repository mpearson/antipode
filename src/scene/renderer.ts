import * as THREE from 'three';
import { BG_COLOR, FOG_DENSITY } from '../config';

// Reproduce the r128 (unmanaged) color pipeline for a faithful 1:1 port. The
// custom shaders write colors directly and the hardcoded hues were tuned under
// the old default; revisit if/when modernizing the look.
THREE.ColorManagement.enabled = false;

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

/** Build the renderer, scene (with fog + lights), and camera. */
export function createSceneContext(canvas: HTMLCanvasElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG_COLOR, FOG_DENSITY);
  // lights so any normal-shaded helpers read across the curved surface
  scene.add(new THREE.AmbientLight(0x404a5c, 1.0));
  const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.1);
  keyLight.position.set(1.5, 2, 1);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xff8a4d, 0.5);
  rimLight.position.set(-1, -1.5, -1);
  scene.add(rimLight);

  // near=0.05 (not 0.01): a 10000:1 far/near ratio left almost no depth
  // precision at the far wall (~2 units away). 0.05 gives ~5x better precision
  // and only clips a ~2.9°-radius cap of ground right at your feet, at the
  // extreme periphery when looking down. Lower it again if that rim matters.
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.001,
    10,
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}
