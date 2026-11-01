import * as THREE from "three";
import { hasIslandClearance } from "./scene-rules.ts";
export interface CoastalBoat {
  model: THREE.Group;
  base: THREE.Vector3;
  phase: number;
  route?: { x: number; z: number; rx: number; rz: number; speed: number };
}
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const rockGeometry = new THREE.IcosahedronGeometry(1, 0);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
const materials = new Map<number, THREE.MeshStandardMaterial>();
function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  position: number[],
  scale: number[],
) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    );
  const mesh = new THREE.Mesh(geometry, materials.get(color));
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function box(g: THREE.Object3D, color: number, p: number[], s: number[]) {
  return part(g, boxGeometry, color, p, s);
}
function cylinder(g: THREE.Object3D, color: number, p: number[], s: number[]) {
  return part(g, cylinderGeometry, color, p, s);
}
function tree(g: THREE.Object3D, x: number, z: number, size: number) {
  cylinder(
    g,
    0x8f775a,
    [x, 0.35 * size, z],
    [0.05 * size, 0.7 * size, 0.05 * size],
  );
  part(
    g,
    rockGeometry,
    0x708f69,
    [x, 0.85 * size, z],
    [0.36 * size, 0.5 * size, 0.36 * size],
  );
  part(
    g,
    rockGeometry,
    0x90a579,
    [x - 0.15 * size, 0.67 * size, z],
    [0.28 * size, 0.33 * size, 0.28 * size],
  );
}
function boat(sail: boolean, color: number) {
  const g = new THREE.Group();
  g.name = sail ? "coastal-sailboat" : "coastal-ferry";
  part(
    g,
    new THREE.SphereGeometry(1, 8, 4),
    color,
    [0, 0, 0],
    [0.28, 0.15, 0.65],
  );
  box(g, 0xd6b78f, [0, 0.1, 0], [0.36, 0.06, 0.77]);
  if (sail) {
    cylinder(g, 0x827260, [0, 0.7, 0], [0.025, 1.2, 0.025]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [0.025, 0.28, 0, 0.025, 1.27, 0, 0.62, 0.28, 0],
        3,
      ),
    );
    geometry.computeVertexNormals();
    const sheet = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0xe8d8b9,
        side: THREE.DoubleSide,
        roughness: 1,
      }),
    );
    g.add(sheet);
  } else {
    box(g, 0xeee4cf, [0, 0.31, -0.1], [0.4, 0.37, 0.47]);
    box(g, 0xac5942, [0, 0.52, -0.1], [0.49, 0.08, 0.57]);
    box(g, 0x78989c, [0, 0.35, 0.144], [0.29, 0.14, 0.015]);
  }
  return g;
}
export function createCoast(
  positions: ReadonlyMap<string, THREE.Vector3>,
  addLamp: (g: THREE.Object3D, x: number, z: number) => void,
) {
  const group = new THREE.Group();
  group.name = "coastal-scenery";
  const points = [...positions.values()];
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x)),
    minZ = Math.min(...points.map((p) => p.z)),
    maxZ = Math.max(...points.map((p) => p.z));
  const cx = (minX + maxX) / 2,
    cz = (minZ + maxZ) / 2,
    rx = (maxX - minX) / 2 + 6,
    rz = (maxZ - minZ) / 2 + 6;
  const boats: CoastalBoat[] = [];
  // Docks face the open water and are skipped when another brand island is in the way.
  let docks = 0;
  for (const [id, center] of positions) {
    if (docks >= 6 || id === "wowprime") continue;
    const angle = Math.atan2(center.x - cx, center.z - cz);
    const dx = Math.sin(angle),
      dz = Math.cos(angle);
    const endpoint = { x: center.x + dx * 3.4, z: center.z + dz * 3.4 };
    if (!hasIslandClearance(endpoint, points, 2.45)) continue;
    const dock = new THREE.Group();
    dock.position.copy(center);
    dock.rotation.y = angle;
    dock.name = "waterfront-dock";
    for (let i = 0; i < 9; i++)
      box(
        dock,
        i % 2 ? 0xb79a72 : 0xc4aa82,
        [0, -0.09, 1.82 + i * 0.16],
        [0.6, 0.1, 0.145],
      );
    for (const z of [1.9, 2.65, 3.15])
      for (const x of [-0.25, 0.25])
        cylinder(dock, 0x8b755b, [x, -0.2, z], [0.045, 0.63, 0.045]);
    for (const x of [-0.27, 0.27])
      box(dock, 0xa48b68, [x, 0.12, 2.48], [0.035, 0.05, 1.25]);
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-0.24, -0.02, 2.8);
    addLamp(lampGroup, 0, 0);
    dock.add(lampGroup);
    group.add(dock);
    const model = boat(docks % 2 === 0, 0x96684e);
    model.position.set(endpoint.x + dx * 0.65, -0.35, endpoint.z + dz * 0.65);
    model.rotation.y = angle + 0.2;
    group.add(model);
    boats.push({ model, base: model.position.clone(), phase: docks * 1.3 });
    docks++;
  }
  // Picnic islets, a small lighthouse and rocky greenery frame the main archipelago.
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.21;
    const x = cx + Math.cos(angle) * rx,
      z = cz + Math.sin(angle) * rz;
    if (!hasIslandClearance({ x, z }, points, 4)) continue;
    const islet = new THREE.Group();
    islet.position.set(x, -0.12, z);
    islet.rotation.y = angle;
    islet.name = i === 0 ? "lighthouse-islet" : "coastal-islet";
    cylinder(islet, 0xc5a67a, [0, -0.21, 0], [1.25, 0.34, 1.05]);
    cylinder(islet, 0xa5ad7d, [0, -0.025, 0], [1.17, 0.04, 0.98]);
    if (i === 0) {
      for (let level = 0; level < 6; level++)
        cylinder(
          islet,
          level % 2 ? 0xaf5843 : 0xeee4ca,
          [0, 0.2 + level * 0.28, 0],
          [0.28, 0.28, 0.28],
        );
      cylinder(islet, 0x586962, [0, 1.92, 0], [0.4, 0.15, 0.4]);
      cylinder(islet, 0xe5c47c, [0, 1.77, 0], [0.3, 0.2, 0.3]);
      addLamp(islet, 0.62, 0.4);
    } else if (i % 3 === 1) {
      tree(islet, -0.6, -0.2, 1.2);
      box(islet, 0xb38b60, [0.25, 0.3, 0.15], [0.8, 0.07, 0.4]);
      for (const dz of [-0.42, 0.42])
        box(islet, 0x9d7d57, [0.25, 0.14, 0.15 + dz], [0.86, 0.09, 0.15]);
      cylinder(islet, 0x9c8662, [0.25, 0.62, 0.15], [0.025, 1.2, 0.025]);
      part(
        islet,
        new THREE.ConeGeometry(0.64, 0.22, 8),
        0xb6714d,
        [0.25, 1.23, 0.15],
        [1, 1, 1],
      );
    } else {
      tree(islet, -0.4, -0.3, 1);
      tree(islet, 0.42, 0.2, 0.75);
      part(
        islet,
        rockGeometry,
        0x969080,
        [0.5, 0.12, -0.4],
        [0.31, 0.28, 0.35],
      );
    }
    for (let j = 0; j < 4; j++)
      part(
        islet,
        rockGeometry,
        0x869b72,
        [-0.7 + j * 0.4, 0.05, 0.62],
        [0.12, 0.18, 0.11],
      );
    group.add(islet);
  }
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.55;
    const model = boat(i % 2 === 0, [0xa75b49, 0x637f78, 0xbb8b51][i % 3]);
    const route = {
      x: cx,
      z: cz,
      rx: rx + 3 + (i % 2),
      rz: rz + 3 + (i % 2),
      speed: 0.012 + i * 0.0015,
    };
    model.position.set(
      cx + Math.cos(angle) * route.rx,
      -0.35,
      cz + Math.sin(angle) * route.rz,
    );
    group.add(model);
    boats.push({ model, base: model.position.clone(), phase: angle, route });
  }
  return { group, boats };
}
