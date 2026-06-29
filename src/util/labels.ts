import * as THREE from 'three';

/**
 * A small white text label that rides in 3D space and always faces the camera.
 * center.y > 1 hangs the text just BELOW its anchor point on screen, so a caption
 * pinned to a sky body sits under the dot (Sky-Map style).
 */
export function makeLabelSprite(text: string): THREE.Sprite {
  const W = 256;
  const H = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.font = '700 44px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(text, W / 2, H / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
    }),
  );
  sp.center.set(0.5, 1.35); // hang below the anchor (the body)
  const h = 2.4;
  sp.scale.set(h * (W / H), h, 1); // ~constant size at SKY_DIST
  sp.renderOrder = 9;
  return sp;
}
