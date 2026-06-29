import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Polygon, MultiPolygon, Position } from 'geojson';
import { R } from '../config';
import { llToVec, hashStr } from '../util/geo';
import { makeSurfaceMaterial } from '../scene/materials';
import { sphericalPolygonGeometry } from './sphericalPolygon';
import { ISO_NAMES } from '../data/iso-names';
import type { LonLat } from '../types';
import topoData from '../data/countries-110m.json';

// world-atlas countries-110m topology, bundled for offline use.
const topo = topoData as unknown as Topology;

/** A GeoJSON ring is Position[]; coerce to our [lon,lat] tuples. */
function toLonLat(ring: Position[]): LonLat[] {
  return ring.map((p) => [p[0], p[1]] as LonLat);
}

/**
 * Decode the bundled TopoJSON into per-country filled meshes (one day/night
 * ShaderMaterial each, hued by a hash of the name) plus boundary lines. Fills go
 * into `fillParent`, borders into `lineParent`.
 */
export function buildCountries(lineParent: THREE.Group, fillParent: THREE.Group): void {
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });

  // topojson-client expands the delta-encoded arcs into GeoJSON [lon,lat] rings.
  // A GeometryCollection object yields a FeatureCollection.
  const fc = feature(topo, topo.objects.countries as GeometryCollection);

  for (const f of fc.features) {
    const idKey = f.id != null ? String(f.id).padStart(3, '0') : null;
    const name = (idKey && ISO_NAMES[idKey]) || `region ${f.id ?? '?'}`;
    const hue = (hashStr(name) % 360) / 360;
    const fillColor = new THREE.Color().setHSL(hue, 0.55, 0.5);

    const geom = f.geometry;
    let polys: Position[][][];
    if (geom.type === 'Polygon') {
      polys = [(geom as Polygon).coordinates];
    } else if (geom.type === 'MultiPolygon') {
      polys = (geom as MultiPolygon).coordinates;
    } else {
      continue;
    }

    for (const poly of polys) {
      // GeoJSON: within one polygon, ring[0] is the exterior, ring[1..] are holes.
      const outer = toLonLat(poly[0]);
      if (outer.length < 3) continue;
      const holes: LonLat[][] = [];
      for (let h = 1; h < poly.length; h++) {
        const hr = toLonLat(poly[h]);
        if (hr.length >= 3) holes.push(hr);
      }

      // boundary line (exterior + each hole)
      const addLine = (ring: LonLat[]) => {
        const pts = ring.map((p) => llToVec(p[1], p[0], R));
        if (pts.length <= 1) return;
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
        ln.renderOrder = 11; // above fills and graticule
        lineParent.add(ln);
      };
      addLine(outer);
      for (const hole of holes) addLine(hole);

      const geo = sphericalPolygonGeometry(outer, holes);
      if (geo) {
        const m = new THREE.Mesh(geo, makeSurfaceMaterial(fillColor));
        m.userData.name = name;
        fillParent.add(m);
      }
    }
  }
}
