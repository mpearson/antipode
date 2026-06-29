import * as THREE from 'three';
import { R, PRESET_LAT, PRESET_LON } from './config';
import { createSceneContext, type SceneContext } from './scene/renderer';
import { addShellAndAtmosphere } from './scene/shellAndAtmosphere';
import { createHorizon } from './scene/horizon';
import { buildGraticule } from './scene/graticule';
import { buildCountries } from './geometry/countries';
import { Sky } from './scene/sky';
import { sunUniforms } from './scene/materials';
import { subsolarPoint } from './astronomy/sun';
import { llToVec, antipode } from './util/geo';
import { DragControls } from './sensors/drag';
import { OrientationSensor } from './sensors/orientation';
import { LookController } from './sensors/look';
import { getLocation } from './sensors/geolocation';
import { Hud } from './ui/hud';

/** Mutable per-run state, owned here rather than scattered as module globals. */
export interface AppState {
  userLat: number;
  userLon: number;
  haveLoc: boolean;
}

export class App {
  private ctx: SceneContext;
  /** Group holding shell + fills + lines, re-oriented each frame. */
  private globe = new THREE.Group();
  /** Country fill meshes — kept for the reticle raycast. */
  private fills = new THREE.Group();
  private boundaries = new THREE.Group();
  private orient = new OrientationSensor();
  private drag: DragControls;
  private look: LookController;
  private sky!: Sky;
  private hud = new Hud();

  readonly state: AppState = {
    userLat: PRESET_LAT,
    userLon: PRESET_LON,
    haveLoc: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = createSceneContext(canvas);
    this.drag = new DragControls(canvas);
    this.look = new LookController(this.orient, this.drag);
  }

  /**
   * Full startup: acquire location (with fallback), request motion permission and
   * attach sensors (falling back to drag), build the scene, and start the loop.
   * `onNotice` surfaces non-fatal messages (e.g. location fallback) to the UI.
   */
  async begin(onNotice?: (msg: string) => void): Promise<void> {
    console.log('begin: requesting location…');
    try {
      const loc = await getLocation();
      this.setLocation(loc.lat, loc.lon, true);
      console.log('location ok:', loc.lat.toFixed(3), loc.lon.toFixed(3));
    } catch (e) {
      this.setLocation(PRESET_LAT, PRESET_LON, false);
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`location unavailable (${msg}) — using preset coordinates`);
      onNotice?.('Location unavailable — using preset coordinates.');
    }

    console.log('secureContext:', window.isSecureContext, '| in iframe:', window.self !== window.top);
    try {
      await this.orient.requestPermission();
      this.orient.attach();
      this.look.startWatchdog();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`motion blocked (${msg}) — drag to look`);
      this.look.enableDrag();
    }

    this.init();
    this.hud.setHere(this.state.userLat, this.state.userLon);
    this.start();
    console.log('render loop running');
  }

  setLocation(lat: number, lon: number, haveLoc: boolean): void {
    this.state.userLat = lat;
    this.state.userLon = lon;
    this.state.haveLoc = haveLoc;
  }

  /** Build the scene graph. */
  private init(): void {
    this.ctx.scene.add(this.globe);
    addShellAndAtmosphere(this.globe);

    // Fills and borders live at exactly radius R (the true surface) so the eye
    // (also at R) stands ON the ground. Depth ordering is handled by the shell's
    // renderOrder/depthWrite (see shellAndAtmosphere) and by lines drawing with
    // depthTest:false — NOT by shrinking these groups.
    this.globe.add(this.fills);
    this.globe.add(this.boundaries);
    buildGraticule(this.boundaries);
    buildCountries(this.boundaries, this.fills);

    // antipode marker: a small dot just under the surface at the far side
    const a = antipode(this.state.userLat, this.state.userLon);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd166 }),
    );
    marker.position.copy(llToVec(a.lat, a.lon, R * 0.99));
    this.globe.add(marker);

    this.ctx.scene.add(createHorizon());
    this.sky = new Sky(this.ctx.scene);
    console.log('scene initialised');
  }

  private start(): void {
    const loop = () => {
      requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  private frame(): void {
    const { renderer, scene, camera } = this.ctx;
    const { userLat, userLon } = this.state;

    // Rotate the globe so the user's lat/lon sits under the camera (+Y).
    const up = llToVec(userLat, userLon, R).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 1, 0));
    this.globe.quaternion.copy(q);

    // Sun direction in geometry space, rotated by the same globe quaternion so it
    // matches the fill shader's post-modelMatrix worldDir. Live off the clock.
    const now = new Date();
    const sp = subsolarPoint(now);
    const sunLocal = llToVec(sp.lat, sp.lon, 1).normalize();
    sunUniforms.uSunDir.value.copy(sunLocal.applyQuaternion(q));

    // Aim the camera. Eye sits at exactly radius R (on the surface); do not offset
    // it — the horizon ring (also at y=R) depends on this exact height.
    const dir = this.look.lookDirection().normalize();
    const eye = new THREE.Vector3(0, R, 0);
    camera.position.copy(eye);
    camera.lookAt(eye.clone().add(dir));

    this.sky.update(eye, q, now);
    this.hud.update({ dir, eye, q, camera, fills: this.fills, dragMode: this.look.dragMode });

    renderer.render(scene, camera);
  }
}
