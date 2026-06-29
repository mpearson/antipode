import * as THREE from 'three';
import { D2R, SKY_DIST } from '../config';
import { llToVec } from '../util/geo';
import { makeLabelSprite } from '../util/labels';
import { moonPosition } from '../astronomy/moon';
import { sunUniforms } from './materials';

/**
 * Sun & Moon as sky bodies (Sky-Map style). Positioned each frame along their
 * true geocentric directions out at SKY_DIST and sized to their real angular
 * diameter. depthTest:false so they read as faraway sky and stay visible even
 * when on the FAR side of the planet — fitting the see-through-the-ground concept.
 */
export class Sky {
  private sunMesh: THREE.Mesh;
  private sunGlow: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private sunLabel: THREE.Sprite;
  private moonLabel: THREE.Sprite;

  constructor(scene: THREE.Scene) {
    const sunAngR = (0.533 * D2R) / 2; // sun angular radius (~0.27°)
    const sunR = SKY_DIST * Math.tan(sunAngR);

    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(sunR, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfff3da,
        fog: false,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.sunMesh.renderOrder = 8;
    scene.add(this.sunMesh);

    this.sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(sunR * 3.4, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffc138,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        fog: false,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.sunGlow.renderOrder = 7;
    scene.add(this.sunGlow);

    // Moon: a real sphere lit by the same sun direction, so it naturally shows
    // the correct phase from any viewing angle. Built at radius 1 and scaled each
    // frame to its live angular size (distance varies ~10% over a month).
    const moonMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSunDir: sunUniforms.uSunDir,
        uColor: { value: new THREE.Color(0xd8dce6) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        void main() {
          vN = normalize(mat3(modelMatrix) * normal);   // world-space normal
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN;
        uniform vec3 uSunDir;
        uniform vec3 uColor;
        void main() {
          float day = smoothstep(-0.04, 0.04, dot(normalize(vN), uSunDir));
          gl_FragColor = vec4(uColor * mix(0.05, 1.0, day), 1.0); // 0.05 = earthshine
        }`,
    });
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), moonMat);
    this.moonMesh.renderOrder = 8;
    scene.add(this.moonMesh);

    this.sunLabel = makeLabelSprite('SUN');
    scene.add(this.sunLabel);
    this.moonLabel = makeLabelSprite('MOON');
    scene.add(this.moonLabel);
  }

  /**
   * Place the sky bodies. The Sun reuses the (already globe-rotated) world sun
   * direction in the lighting uniform; the Moon is computed the same way, so its
   * phase — set by the shared uSunDir — comes out correct automatically.
   */
  update(eye: THREE.Vector3, q: THREE.Quaternion, now: Date): void {
    const worldSun = sunUniforms.uSunDir.value;
    this.sunMesh.position.copy(eye).addScaledVector(worldSun, SKY_DIST);
    this.sunGlow.position.copy(this.sunMesh.position);
    this.sunLabel.position.copy(this.sunMesh.position);

    const mp = moonPosition(now);
    const worldMoon = llToVec(mp.lat, mp.lon, 1).applyQuaternion(q);
    this.moonMesh.position.copy(eye).addScaledVector(worldMoon, SKY_DIST);
    this.moonLabel.position.copy(this.moonMesh.position);
    // moon radius / distance -> live angular radius; Moon radius = 0.2725 R⊕
    const moonAngR = Math.atan(0.2725 / mp.dist);
    this.moonMesh.scale.setScalar(SKY_DIST * Math.tan(moonAngR));
  }
}
