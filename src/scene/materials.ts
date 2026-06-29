import * as THREE from 'three';
import { BG_COLOR, FOG_DENSITY } from '../config';

// Shared uniform object so every country fill AND the ocean shell read the same
// live sun direction. Object IDENTITY is load-bearing — every surface material
// (and the moon shader) references THIS exact object, so do not clone it.
export const sunUniforms = {
  uSunDir: { value: new THREE.Vector3(1, 0, 0) },
};

/* ---- shared day/night surface shader: country fills AND the ocean shell ----
 * Lighting can't come from a real light here — we render BACK faces, which would
 * invert a normal-based model — so each fragment's "day" factor is just
 * dot(surface direction, live sun direction), independent of which face we view.
 * Fog (exp2 toward the background) is reimplemented in-shader because a
 * ShaderMaterial doesn't inherit three's fog automatically. The ONLY thing that
 * differs between land and sea is uColor (and the ocean's depthWrite:false). */
const surfaceVert = /* glsl */ `
  varying float vSun;
  varying float vFogDepth;
  uniform vec3 uSunDir;
  void main() {
    vec3 worldDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
    vSun = dot(worldDir, uSunDir);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const surfaceFrag = /* glsl */ `
  varying float vSun;
  varying float vFogDepth;
  uniform vec3 uColor;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uNightFloor;
  void main() {
    // smooth terminator: full day above vSun=0.1, full night below -0.1
    float day = smoothstep(-0.1, 0.1, vSun);
    vec3 lit = uColor * mix(uNightFloor, 1.0, day);
    float f = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    vec3 col = mix(lit, uFogColor, clamp(f, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }`;

export interface SurfaceMaterialOptions {
  depthWrite?: boolean;
  nightFloor?: number;
}

export function makeSurfaceMaterial(
  color: THREE.ColorRepresentation,
  opts: SurfaceMaterialOptions = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: opts.depthWrite !== false,
    uniforms: {
      uSunDir: sunUniforms.uSunDir,
      uColor: { value: color instanceof THREE.Color ? color : new THREE.Color(color) },
      uFogColor: { value: new THREE.Color(BG_COLOR) },
      uFogDensity: { value: FOG_DENSITY },
      uNightFloor: { value: opts.nightFloor != null ? opts.nightFloor : 0.18 },
    },
    vertexShader: surfaceVert,
    fragmentShader: surfaceFrag,
  });
}
