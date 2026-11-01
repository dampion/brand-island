import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import { brands, categories } from "./domain.ts";
import type { Brand } from "./types.ts";
import { createMenuBoard } from "./menu-board.ts";
import { getSceneTimeState } from "./scene-rules.ts";
import { createCoast, type CoastalBoat } from "./coast.ts";
import {
  createWalkingRoute,
  sampleWalkingRoute,
  type WalkingRoute,
} from "./motion.ts";
type Walker = {
  root: THREE.Group;
  route: WalkingRoute;
  offset: number;
  speed: number;
  limbs: THREE.Group[];
};

type Callbacks = {
  select: (id: string) => void;
  activity: (message: string) => void;
};
const R = 2.08;
const CREAM = 0xf7efe0;
const INK = 0x493e36;
const materials = new Map<string, THREE.MeshStandardMaterial>();
const mat = (color: THREE.ColorRepresentation) => {
  const k = String(color);
  if (!materials.has(k))
    materials.set(
      k,
      new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 }),
    );
  return materials.get(k)!;
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const sphereGeo = new THREE.IcosahedronGeometry(1, 0);
function box(
  g: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: THREE.ColorRepresentation,
  rotation = 0,
) {
  const m = new THREE.Mesh(boxGeo, mat(color));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.rotation.y = rotation;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cylinder(
  g: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  color: THREE.ColorRepresentation,
) {
  const m = new THREE.Mesh(cylinderGeo, mat(color));
  m.position.set(x, y, z);
  m.scale.set(r, h, r);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function leaf(
  g: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  color: number,
) {
  const m = new THREE.Mesh(sphereGeo, mat(color));
  m.position.set(x, y, z);
  m.scale.set(r, r * 1.15, r);
  m.castShadow = true;
  g.add(m);
  return m;
}
function tree(g: THREE.Object3D, x: number, z: number, s = 1) {
  cylinder(g, x, 0.42 * s, z, 0.055 * s, 0.84 * s, 0x8b7659);
  leaf(g, x, 1.02 * s, z, 0.36 * s, 0x73916b);
  leaf(g, x - 0.12 * s, 0.83 * s, z, 0.26 * s, 0x8ba677);
}
function sign(
  g: THREE.Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  w: number,
  color: string,
  small = false,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const c = canvas.getContext("2d")!;
  c.fillStyle = color;
  c.fillRect(0, 0, 768, 192);
  c.fillStyle = "#fff8eb";
  c.font = `${small ? 500 : 700} ${Math.min(105, 640 / text.length)}px "PingFang TC","Microsoft JhengHei",sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, 384, 100);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w / 4),
    new THREE.MeshBasicMaterial({ map: t }),
  );
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function roof(
  g: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  color: THREE.ColorRepresentation,
) {
  const geometry = new THREE.CylinderGeometry(0, 1, 1, 4);
  geometry.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(geometry, mat(color));
  m.scale.set(w * 0.76, 0.5, d * 0.76);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  box(g, x, y - 0.23, z, w * 1.15, 0.1, d * 1.15, color);
}
function table(g: THREE.Object3D, x: number, z: number, color: number) {
  cylinder(g, x, 0.37, z, 0.25, 0.07, 0xc4a580);
  cylinder(g, x, 0.18, z, 0.04, 0.36, INK);
  for (const s of [-1, 1]) {
    box(g, x + s * 0.37, 0.17, z, 0.2, 0.09, 0.22, color);
    box(g, x + s * 0.37, 0.09, z, 0.04, 0.18, 0.04, INK);
  }
}
function umbrella(
  g: THREE.Object3D,
  x: number,
  z: number,
  color: THREE.ColorRepresentation,
) {
  cylinder(g, x, 0.65, z, 0.025, 1.3, 0x8a7563);
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.53, 0.2, 8), mat(color));
  m.position.set(x, 1.3, z);
  g.add(m);
  table(g, x, z, 0xa28260);
}
let lampGlowTexture: THREE.CanvasTexture | undefined;
function lamp(g: THREE.Object3D, x: number, z: number) {
  cylinder(g, x, 0.54, z, 0.025, 1.08, 0x697267);
  const bulb = box(g, x, 1.1, z, 0.14, 0.19, 0.14, 0xf4d291);
  bulb.name = "street-lamp";
  bulb.material = new THREE.MeshStandardMaterial({
    color: 0xe7d8ac,
    emissive: 0xffba57,
    emissiveIntensity: 0,
    roughness: 0.5,
  });
  box(g, x, 1.22, z, 0.2, 0.04, 0.2, 0x697267);
  if (!lampGlowTexture) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,192,95,.7)");
    gradient.addColorStop(0.35, "rgba(255,180,70,.24)");
    gradient.addColorStop(1, "rgba(255,160,60,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    lampGlowTexture = new THREE.CanvasTexture(canvas);
    lampGlowTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 1.65),
    new THREE.MeshBasicMaterial({
      map: lampGlowTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  pool.position.set(x, 0.074, z);
  pool.rotation.x = -Math.PI / 2;
  pool.name = "lamplight-pool";
  g.add(pool);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: lampGlowTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  halo.position.set(x, 1.1, z);
  halo.scale.set(0.5, 0.5, 0.5);
  g.add(halo);
  bulb.userData.pool = pool;
  bulb.userData.halo = halo;
}
function pot(
  g: THREE.Object3D,
  x: number,
  z: number,
  color: THREE.ColorRepresentation,
  s = 1,
) {
  cylinder(g, x, 0.23 * s, z, 0.3 * s, 0.15 * s, 0x4d5050);
  cylinder(g, x, 0.47 * s, z, 0.4 * s, 0.35 * s, color);
  cylinder(g, x, 0.66 * s, z, 0.35 * s, 0.02 * s, 0xc97848);
  box(g, x, 0.68 * s, z, 0.025 * s, 0.025 * s, 0.68 * s, 0xf3d5a7);
  for (const side of [-1, 1])
    box(
      g,
      x + side * 0.46 * s,
      0.49 * s,
      z,
      0.16 * s,
      0.09 * s,
      0.12 * s,
      0x545c58,
    );
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    leaf(
      g,
      x + Math.sin(a) * 0.2 * s,
      0.7 * s,
      z + Math.cos(a) * 0.2 * s,
      0.065 * s,
      i % 2 ? 0x75936b : 0xefbc83,
    );
  }
}
function restaurant(brand: Brand, index: number) {
  const g = new THREE.Group();
  const color = brand.color;
  const kind = brand.category;
  // The deliberately different silhouettes express cuisine, not real store architecture.
  const h = kind === "teppan" ? 1.25 : kind === "bbq" ? 1.05 : 0.82;
  box(
    g,
    0,
    h / 2 + 0.05,
    -0.25,
    1.68,
    h,
    1.22,
    kind === "teppan" ? 0x55595c : CREAM,
  );
  box(g, 0, 0.07, -0.25, 1.95, 0.14, 1.55, 0xd8c8b1);
  if (kind === "japanese" || kind === "chinese") {
    roof(
      g,
      0,
      h + 0.3,
      -0.25,
      1.8,
      1.35,
      kind === "japanese" ? color : 0xb87450,
    );
    if (index % 2 === 0) {
      box(g, -0.42, h + 0.37, -0.3, 0.68, 0.5, 0.65, CREAM);
      roof(g, -0.42, h + 0.75, -0.3, 0.83, 0.75, color);
    }
    for (const x of [-0.73, 0.73])
      cylinder(g, x, h * 0.5, 0.37, 0.045, h, 0x80644d);
  } else if (kind === "steak") {
    box(g, 0, h + 0.13, -0.25, 1.85, 0.18, 1.4, color);
    box(g, 0, h + 0.26, -0.25, 1.4, 0.13, 1.05, CREAM);
    for (let i = 0; i < 8; i++) {
      const aw = box(
        g,
        -0.83 + i * 0.235,
        0.67,
        0.6,
        0.235,
        0.07,
        0.49,
        i % 2 ? 0xf9edcf : color,
      );
      aw.rotation.x = 0.17;
    }
  } else if (kind === "hotpot") {
    roof(g, 0, h + 0.28, -0.3, 1.7, 1.25, color);
    box(g, -0.77, 1.02, 0.4, 0.22, 1.1, 0.18, color);
    sign(g, brand.name.slice(0, 3), 0, 1.09, 0.47, 1.1, color);
  } else if (kind === "bbq") {
    box(g, 0, h + 0.1, -0.25, 1.8, 0.16, 1.35, color);
    for (const x of [-0.45, 0.45]) {
      cylinder(g, x, h + 0.45, -0.4, 0.12, 0.65, 0x777b75);
      cylinder(g, x, h + 0.8, -0.4, 0.19, 0.08, 0x555c56);
    }
  } else {
    box(g, 0.16, h + 0.1, -0.25, 1.94, 0.13, 1.45, color);
    box(g, 0.6, h + 0.35, -0.35, 0.4, 0.4, 0.7, 0x444c4d);
  }
  g.add(createMenuBoard(brand, h));
  // Storefront, warm windows, door and timber mullions.
  for (const x of [-0.52, 0.52]) {
    box(g, x, 0.43, 0.373, 0.43, 0.43, 0.025, 0x95b4ae);
    box(g, x, 0.43, 0.396, 0.025, 0.46, 0.035, 0x88745e);
    box(g, x, 0.39, 0.399, 0.46, 0.025, 0.035, 0x88745e);
  }
  box(g, 0, 0.35, 0.382, 0.3, 0.6, 0.025, 0x716252);
  box(g, 0.09, 0.34, 0.405, 0.025, 0.025, 0.025, 0xe6c18a);
  if (kind !== "hotpot")
    sign(g, brand.name, 0, h * 0.85 + 0.04, 0.405, 1.34, color);
  box(g, 0, 0.07, 0.64, 0.7, 0.1, 0.25, 0xc7baa6);
  box(g, 0, 0.035, 0.85, 0.84, 0.07, 0.2, 0xd4c8b4);
  // Small pavilion / kiosk, garden and terrace.
  box(g, -1.15, 0.3, -0.62, 0.43, 0.6, 0.48, color);
  roof(g, -1.15, 0.73, -0.62, 0.56, 0.62, 0x9a8771);
  if (kind === "hotpot") pot(g, 1.03, 0.35, color, 0.85);
  else if (kind === "bbq") {
    table(g, 1.1, 0.23, 0x89735d);
    cylinder(g, 1.1, 0.44, 0.23, 0.22, 0.07, 0x555f58);
    for (let i = 0; i < 3; i++)
      box(g, 1.02 + i * 0.08, 0.49, 0.23, 0.055, 0.02, 0.2, 0xb87959);
  } else if (kind === "chinese") {
    cylinder(g, 1.05, 0.39, 0.15, 0.37, 0.12, 0xdac08b);
    for (let i = 0; i < 5; i++)
      leaf(
        g,
        1.05 + Math.sin(i * 1.3) * 0.2,
        0.5,
        0.15 + Math.cos(i * 1.3) * 0.2,
        0.1,
        0xecdcb6,
      );
  } else umbrella(g, 1.06, 0.23, brand.color);
  tree(g, -1.2, 0.6, 0.83);
  tree(g, 0.9, -1.11, 0.88);
  tree(g, -0.8, -1.2, 0.6);
  box(g, -0.8, 0.1, 1.12, 0.7, 0.19, 0.18, 0xa3a574);
  for (let i = 0; i < 4; i++)
    leaf(g, -1.05 + i * 0.17, 0.24, 1.12, 0.11, i % 2 ? 0x84956b : 0xd5a168);
  lamp(g, 0.55, 1.2);
  table(g, -0.45, 1.07, 0x977c60);
  // Freestanding English signpost.
  cylinder(g, 1.33, 0.46, -0.62, 0.025, 0.92, 0x77664f);
  sign(g, brand.english, 1.33, 0.88, -0.6, 0.8, brand.color, true);
  return g;
}
function axialPositions() {
  const cells: { q: number; r: number; ring: number }[] = [];
  for (let q = -3; q <= 3; q++)
    for (let r = -3; r <= 3; r++) {
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      if (ring > 0 && ring <= 3) cells.push({ q, r, ring });
    }
  return cells
    .sort(
      (a, b) => a.ring - b.ring || Math.atan2(a.r, a.q) - Math.atan2(b.r, b.q),
    )
    .slice(0, brands.length)
    .sort(
      (a, b) =>
        Math.atan2(a.r * 1.5, a.q * 1.732 + a.r * 0.866) -
        Math.atan2(b.r * 1.5, b.q * 1.732 + b.r * 0.866),
    );
}

export class IslandScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly labels = new CSS2DRenderer();
  readonly roots = new Map<string, THREE.Group>();
  readonly positions = new Map<string, THREE.Vector3>();
  private labelObjects = new Map<string, CSS2DObject>();
  private tiles: THREE.Mesh[] = [];
  private people: Walker[] = [];
  private clouds: THREE.Group[] = [];
  private seaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x41657e) },
    },
    vertexShader: `varying vec2 vSea; void main() { vec4 world = modelMatrix * vec4(position, 1.0); vSea = world.xz; gl_Position = projectionMatrix * viewMatrix * world; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vSea;
      void main() {
        float swell = sin(vSea.x * .22 + vSea.y * .31 + uTime * .15);
        float ripple = sin(vSea.y * 1.1 + sin(vSea.x * .21) + uTime * .24);
        float shade = swell * .012 + ripple * .004;
        gl_FragColor = vec4(uColor * (1.0 + shade), 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
  private boats: CoastalBoat[] = [];
  private streetLamps: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  private menuMaterials: THREE.MeshStandardMaterial[] = [];
  private nightLights: THREE.PointLight[] = [];
  private lampsOn = false;
  private lastLightUpdate = 0;
  private bridges: THREE.Group[] = [];
  private connectionGroup = new THREE.Group();
  private ring: THREE.Mesh;
  private sun: THREE.DirectionalLight;
  private ambient: THREE.HemisphereLight;
  private raycaster = new THREE.Raycaster();
  private pointerStart = { x: 0, y: 0 };
  private targetPosition: THREE.Vector3 | null = null;
  private targetLook: THREE.Vector3 | null = null;
  private selected: string | null = null;
  private visibleIds = new Set(brands.map((b) => b.id));
  private showNames = true;
  private showLinks = false;
  private frozen = false;
  private topView = false;
  private clock = 0;
  private last = 0;
  private frame = 0;
  private width = 0;
  private height = 0;
  private destroyed = false;
  private hovered: string | null = null;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private resizeObserver: ResizeObserver;
  private lastEvent = 0;
  constructor(
    private host: HTMLElement,
    private callbacks: Callbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "王品集團與品牌的互動 3D 群島；亦可使用品牌清單探索",
    );
    this.renderer.domElement.setAttribute("role", "img");
    host.append(this.renderer.domElement);
    this.labels.domElement.className = "scene-labels";
    this.labels.domElement.setAttribute("aria-label", "品牌島嶼");
    host.append(this.labels.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.reduced.matches;
    this.controls.dampingFactor = 0.065;
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.minPolarAngle = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 65;
    this.controls.enablePan = true;
    this.controls.addEventListener("start", () => {
      this.targetPosition = null;
      this.targetLook = null;
    });
    this.ambient = new THREE.HemisphereLight(0xfff9e6, 0x87958b, 2.4);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffeed0, 3.4);
    this.sun.position.set(-12, 24, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -22,
      right: 22,
      top: 22,
      bottom: -22,
      near: 1,
      far: 75,
    });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun);
    const fill = new THREE.DirectionalLight(0xd8e4e6, 1);
    fill.position.set(10, 8, -15);
    this.scene.add(fill);
    const geometry = new THREE.CylinderGeometry(R, R * 0.94, 0.42, 6);
    const cells = axialPositions();
    const records = [
      { id: "wowprime", p: new THREE.Vector3(), brand: null },
      ...brands.map((brand, i) => ({
        id: brand.id,
        p: new THREE.Vector3(
          Math.sqrt(3) * R * (cells[i].q + cells[i].r / 2) * 1.055,
          0,
          1.5 * R * cells[i].r * 1.055,
        ),
        brand,
      })),
    ];
    for (const { id, p, brand } of records) {
      const root = new THREE.Group();
      root.position.copy(p);
      this.scene.add(root);
      this.roots.set(id, root);
      this.positions.set(id, p.clone());
      const tile = new THREE.Mesh(
        geometry,
        mat(id === "wowprime" ? 0xd4b9a0 : 0xd2c7ae),
      );
      tile.position.y = -0.23;
      tile.receiveShadow = true;
      tile.castShadow = true;
      tile.userData.id = id;
      root.add(tile);
      this.tiles.push(tile);
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.99, R * 0.99, 0.055, 6),
        mat(
          id === "wowprime"
            ? 0xe6d4bd
            : [0xe1d9be, 0xe6d8bf, 0xd7d7b7, 0xe9d9c1][
                records.indexOf(records.find((x) => x.id === id)!) % 4
              ],
        ),
      );
      top.position.y = 0.009;
      top.receiveShadow = true;
      top.userData.id = id;
      root.add(top);
      this.tiles.push(top);
      box(root, 0, 0.052, 0.87, 0.32, 0.035, 2, 0xf3e8d3);
      box(root, 0.5, 0.052, 1.07, 2, 0.035, 0.3, 0xf3e8d3);
      if (brand) {
        const model = restaurant(brand, brands.indexOf(brand));
        root.add(model);
        model.traverse((o) => {
          o.userData.id = id;
        });
      } else this.headquarters(root);
      const el = document.createElement("button");
      el.className =
        "island-label" + (id === "wowprime" ? " headquarters" : "");
      el.dataset.brand = id;
      el.innerHTML = `<i style="--brand-color:${brand?.color || "#ac4139"}"></i><span>${brand?.name || "王品集團"}</span>`;
      el.setAttribute("aria-label", `探索${brand?.name || "王品集團"}`);
      el.onclick = (e) => {
        e.stopPropagation();
        callbacks.select(id);
      };
      const label = new CSS2DObject(el);
      label.position.set(0, -0.08, 1.86);
      root.add(label);
      this.labelObjects.set(id, label);
    }
    // Bridges connect neighboring hexes; these are scenery, not business relationships.
    const entries = [...this.positions.entries()];
    const positions = entries.map((e) => e[1]);
    for (let a = 0; a < positions.length; a++)
      for (let b = a + 1; b < positions.length; b++) {
        const p = positions[a],
          q = positions[b],
          dist = p.distanceTo(q);
        if (dist > 4.05) continue;
        const bridge = new THREE.Group();
        bridge.userData = { from: entries[a][0], to: entries[b][0] };
        this.bridges.push(bridge);
        this.scene.add(bridge);
        const mid = p.clone().add(q).multiplyScalar(0.5);
        const angle = Math.atan2(q.x - p.x, q.z - p.z);
        box(bridge, mid.x, -0.025, mid.z, 0.35, 0.09, 0.46, 0xb49c78, angle);
        for (const s of [-1, 1]) {
          const dx = Math.cos(angle) * 0.2 * s,
            dz = -Math.sin(angle) * 0.2 * s;
          box(
            bridge,
            mid.x + dx,
            0.12,
            mid.z + dz,
            0.035,
            0.06,
            0.52,
            0x998367,
            angle,
          );
        }
      }
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      this.seaMaterial,
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.49;
    sea.name = "ocean";
    this.scene.add(sea);
    this.scene.background = new THREE.Color(0x41657e);
    const shoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xa8d2d1,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const shoreGeometry = new THREE.RingGeometry(R * 1.01, R * 1.09, 6);
    for (const root of this.roots.values()) {
      const shore = new THREE.Mesh(shoreGeometry, shoreMaterial);
      shore.rotation.set(-Math.PI / 2, 0, Math.PI / 6);
      shore.position.y = -0.47;
      root.add(shore);
    }
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.92, 2.02, 6),
      new THREE.MeshBasicMaterial({
        color: 0xac443b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.ring.rotation.set(-Math.PI / 2, 0, Math.PI / 6);
    this.ring.position.y = 0.075;
    this.ring.visible = false;
    this.scene.add(this.ring);
    this.scene.add(this.connectionGroup);
    this.createLife();
    const coast = createCoast(this.positions, lamp);
    this.scene.add(coast.group);
    this.boats = coast.boats;
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name === "street-lamp")
        this.streetLamps.push(
          object as THREE.Mesh<
            THREE.BufferGeometry,
            THREE.MeshStandardMaterial
          >,
        );
      if (
        object instanceof THREE.Mesh &&
        object.name === "signature-menu-board"
      )
        this.menuMaterials.push(object.material as THREE.MeshStandardMaterial);
    });
    // Six non-shadowing lights illuminate the nearest streets; all lamps retain warm emissive glow and ground pools.
    for (let i = 0; i < 6; i++) {
      const light = new THREE.PointLight(0xffbb68, 0, 4.5, 2);
      light.visible = false;
      this.nightLights.push(light);
      this.scene.add(light);
    }
    this.camera.position.set(25, 30, 32);
    this.controls.target.set(0, 0, 0);
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      this.pointerStart = { x: e.clientX, y: e.clientY };
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (
        Math.hypot(
          e.clientX - this.pointerStart.x,
          e.clientY - this.pointerStart.y,
        ) > 7
      )
        return;
      const id = this.pick(e);
      if (id) callbacks.select(id);
    });
    this.renderer.domElement.addEventListener("pointermove", (e) => {
      const id = this.pick(e);
      if (this.hovered !== id) {
        this.hovered = id;
        this.renderer.domElement.style.cursor = id ? "pointer" : "grab";
      }
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.overview(true);
    this.frame = requestAnimationFrame((t) => this.animate(t));
  }
  private headquarters(g: THREE.Group) {
    box(g, 0, 0.12, 0, 1.9, 0.24, 1.8, 0xd9c5a7);
    box(g, 0, 0.8, -0.2, 1.4, 1.4, 1.2, 0xf2e7d3);
    box(g, 0, 1.74, -0.2, 1.05, 0.55, 0.95, 0xf2e7d3);
    roof(g, 0, 2.2, -0.2, 1.2, 1.15, 0xa73f38);
    for (const x of [-0.45, 0, 0.45]) {
      box(g, x, 0.82, 0.413, 0.23, 0.68, 0.025, 0x98b0ac);
      box(g, x, 1.75, 0.29, 0.17, 0.25, 0.025, 0xb34d40);
    }
    sign(g, "王品集團", 0, 1.35, 0.43, 1.42, "#a43e38");
    sign(g, "WOWPRIME", 0, 2.22, 0.12, 0.95, "#a43e38", true);
    for (const x of [-1.1, 1.1]) {
      tree(g, x, -0.65, 1.1);
      tree(g, x, 0.5, 0.7);
    }
    cylinder(g, 0, 0.17, 1.05, 0.48, 0.16, 0xad9b7a);
    cylinder(g, 0, 0.27, 1.05, 0.37, 0.07, 0x84aaa5);
    cylinder(g, 0, 0.57, 1.05, 0.06, 0.56, 0xd0c3a5);
    leaf(g, 0, 0.89, 1.05, 0.12, 0xb3453d);
    lamp(g, -0.75, 1.25);
    lamp(g, 0.75, 1.25);
  }
  private createLife() {
    const initialRoute = createWalkingRoute("wowprime", null, this.positions);
    const clothing = [
      0xb34e3c, 0xe1b968, 0x507b7a, 0x5f6b86, 0xe7ddbc, 0x9b728a,
    ];
    for (let i = 0; i < 84; i++) {
      const root = new THREE.Group();
      const skin = [0xe5bb91, 0xc78f68, 0xf0cba6][i % 3];
      cylinder(root, 0, 0.25, 0, 0.068, 0.23, clothing[i % clothing.length]);
      leaf(root, 0, 0.44, 0, 0.086, skin);
      const hair = leaf(
        root,
        0,
        0.48,
        -0.018,
        0.087,
        [0x493d32, 0x654b36, 0x4c4840][i % 3],
      );
      hair.scale.y *= 0.55;
      const limbs: THREE.Group[] = [];
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.037, 0.15, 0);
        box(leg, 0, -0.06, 0, 0.042, 0.12, 0.045, 0x4c504b);
        box(leg, 0, -0.12, 0.018, 0.052, 0.035, 0.085, 0x363e3f);
        root.add(leg);
        limbs.push(leg);
      }
      for (const side of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(side * 0.093, 0.34, 0);
        box(arm, 0, -0.06, 0, 0.036, 0.12, 0.04, clothing[i % clothing.length]);
        leaf(arm, 0, -0.135, 0, 0.025, skin);
        root.add(arm);
        limbs.push(arm);
      }
      if (i % 5 === 0) box(root, 0.12, 0.17, 0.025, 0.1, 0.12, 0.055, 0xc3a16f);
      root.scale.setScalar(0.92 + (i % 4) * 0.055);
      root.name = "island-walker";
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = false;
      });
      this.scene.add(root);
      this.people.push({
        root,
        route: initialRoute,
        offset: 0,
        speed: 0.24 + (i % 5) * 0.028,
        limbs,
      });
    }
    this.assignWalkingRoutes();
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const puff = leaf(
          cloud,
          (j - 2) * 0.7,
          Math.sin(j * 1.7) * 0.18,
          Math.cos(j) * 0.3,
          0.78 + (j % 3) * 0.2,
          0xfff5e5,
        );
        puff.castShadow = false;
      }
      cloud.position.set(
        -25 + i * 5.8,
        6.5 + (i % 3) * 0.9,
        -13 - (i % 4) * 4.5,
      );
      cloud.scale.set(1.35, 0.7, 1);
      cloud.userData = {
        startX: cloud.position.x,
        baseY: cloud.position.y,
        speed: 0.26 + (i % 3) * 0.06,
      };
      cloud.name = "drifting-cloud";
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
  }
  private assignWalkingRoutes() {
    const visible = ["wowprime", ...this.visibleIds];
    const available = this.bridges.filter(
      (bridge) =>
        visible.includes(bridge.userData.from) &&
        visible.includes(bridge.userData.to),
    );
    const routes = available.length
      ? available.map((bridge) =>
          createWalkingRoute(
            bridge.userData.from,
            bridge.userData.to,
            this.positions,
          ),
        )
      : visible.map((id) => createWalkingRoute(id, null, this.positions));
    const count = Math.min(this.people.length, visible.length * 4);
    this.people.forEach((walker, i) => {
      walker.root.visible = i < count;
      walker.route = routes[i % routes.length];
      walker.offset =
        ((i * 0.61803398875) % 1) * walker.route.length -
        this.clock * walker.speed;
      this.updateWalker(walker, false);
    });
  }
  private updateWalker(walker: Walker, moving: boolean) {
    const p = sampleWalkingRoute(
      walker.route,
      this.clock * walker.speed + walker.offset,
    );
    walker.root.position.set(p.x, 0.075, p.z);
    walker.root.rotation.y = p.heading;
    const stride = moving
      ? Math.sin(this.clock * (6 + walker.speed * 4) + walker.offset) * 0.5
      : 0;
    walker.limbs.forEach((limb, index) => {
      limb.rotation.x = stride * (index === 0 || index === 3 ? 1 : -1);
    });
  }
  private pick(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
    const objects = [...this.roots.values()].filter((g) => g.visible);
    const hit = this.raycaster
      .intersectObjects(objects, true)
      .find((h) => h.object.userData.id);
    return hit?.object.userData.id as string | null;
  }
  private resize() {
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    if (!this.width || !this.height) return;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.labels.setSize(this.width, this.height);
    if (!this.selected) this.overview();
  }
  overview(immediate = false) {
    this.selected = null;
    this.ring.visible = false;
    const mobile = this.width < 760;
    const distance = mobile ? 62 : 47;
    this.targetLook = new THREE.Vector3(mobile ? 0 : -1.5, 0, 0);
    this.targetPosition = new THREE.Vector3(
      distance * 0.53,
      distance * 0.65,
      distance * 0.68,
    );
    if (immediate || this.reduced.matches) {
      this.camera.position.copy(this.targetPosition);
      this.controls.target.copy(this.targetLook);
      this.targetPosition = null;
      this.targetLook = null;
    }
    this.labelObjects.forEach((o) => o.element.classList.remove("selected"));
    this.updateConnections();
  }
  select(id: string) {
    const pos = this.positions.get(id);
    if (!pos) return;
    this.selected = id;
    this.targetLook = pos
      .clone()
      .add(new THREE.Vector3(this.width > 1100 ? 1.3 : 0, 0, 0));
    this.targetPosition = pos.clone().add(new THREE.Vector3(6, 9, 11));
    this.ring.position.set(pos.x, 0.075, pos.z);
    this.ring.visible = true;
    this.labelObjects.forEach((o, key) =>
      o.element.classList.toggle("selected", key === id),
    );
    this.updateConnections();
    if (this.reduced.matches) {
      this.camera.position.copy(this.targetPosition);
      this.controls.target.copy(this.targetLook);
      this.targetPosition = null;
      this.targetLook = null;
    }
  }
  filter(ids: string[]) {
    const next = new Set(ids);
    if (
      next.size === this.visibleIds.size &&
      [...next].every((id) => this.visibleIds.has(id))
    )
      return;
    this.visibleIds = next;
    for (const [id, g] of this.roots) {
      g.visible = id === "wowprime" || this.visibleIds.has(id);
    }
    this.assignWalkingRoutes();
    for (const bridge of this.bridges)
      bridge.visible = [bridge.userData.from, bridge.userData.to].every(
        (id) => id === "wowprime" || this.visibleIds.has(id),
      );
    this.updateConnections();
  }
  names(on: boolean) {
    this.showNames = on;
  }
  pause(on: boolean) {
    this.frozen = on;
  }
  bird(on: boolean) {
    this.topView = on;
    const pos = this.controls.target.clone();
    this.targetLook = pos;
    this.targetPosition = pos
      .clone()
      .add(
        on
          ? new THREE.Vector3(0.01, this.selected ? 19 : 42, 0.01)
          : new THREE.Vector3(
              this.selected ? 6 : 25,
              this.selected ? 9 : 30,
              this.selected ? 11 : 32,
            ),
      );
  }
  connections(on: boolean) {
    this.showLinks = on;
    this.updateConnections();
  }
  private updateConnections() {
    this.connectionGroup.traverse((o) => {
      if (o instanceof THREE.Line) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.connectionGroup.clear();
    if (!this.showLinks) return;
    const selected = brands.find((b) => b.id === this.selected);
    const hub = this.positions.get(selected?.id || "wowprime")!;
    const targets = brands.filter(
      (b) =>
        this.visibleIds.has(b.id) &&
        b.id !== selected?.id &&
        (!selected || selected.category === b.category),
    );
    for (const b of targets) {
      const end = this.positions.get(b.id)!;
      const curve = new THREE.QuadraticBezierCurve3(
        hub.clone().setY(0.5),
        hub
          .clone()
          .add(end)
          .multiplyScalar(0.5)
          .setY(hub.distanceTo(end) * 0.25 + 1),
        end.clone().setY(0.6),
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(35),
      );
      const line = new THREE.Line(
        geometry,
        new THREE.LineDashedMaterial({
          color: selected
            ? categories.find((c) => c.id === selected.category)!.color
            : 0xa6493e,
          dashSize: 0.18,
          gapSize: 0.11,
          transparent: true,
          opacity: 0.75,
        }),
      );
      line.computeLineDistances();
      this.connectionGroup.add(line);
    }
  }
  time(minutes: number) {
    const state = getSceneTimeState(minutes);
    this.lampsOn = state.lampsOn;
    const night = state.phase === "night",
      dusk = state.phase === "dusk",
      dawn = state.phase === "dawn";
    const seaColor = night ? 0x20394e : dusk || dawn ? 0x526c80 : 0x41657e;
    (this.seaMaterial.uniforms.uColor.value as THREE.Color).set(seaColor);
    this.scene.background = new THREE.Color(seaColor);
    this.sun.color.set(night ? 0x9fb5dc : dusk || dawn ? 0xffbe79 : 0xffeed0);
    this.sun.intensity = night
      ? 0.45
      : dusk
        ? state.lampsOn
          ? 1.15
          : 2
        : dawn
          ? 1.5
          : 3.4;
    this.ambient.intensity = night ? 0.85 : dusk || dawn ? 1.5 : 2.4;
    this.renderer.toneMappingExposure = night ? 0.9 : 1.35;
    for (const bulb of this.streetLamps) {
      bulb.material.emissiveIntensity = state.lampsOn ? 3 : 0;
      (bulb.userData.pool.material as THREE.MeshBasicMaterial).opacity =
        state.lampsOn ? 0.48 : 0;
      (bulb.userData.halo.material as THREE.SpriteMaterial).opacity =
        state.lampsOn ? 0.36 : 0;
    }
    for (const material of this.menuMaterials)
      material.emissiveIntensity = state.lampsOn ? 0.45 : 0;
    for (const color of [0x95b4ae, 0x98b0ac]) {
      const material = mat(color);
      material.emissive.set(0xe6aa58);
      material.emissiveIntensity = state.lampsOn ? 0.4 : 0;
    }
    this.updateStreetLights();
    document.documentElement.dataset.time =
      state.phase === "dawn" ? "dusk" : state.phase;
  }
  private updateStreetLights() {
    const candidates = this.streetLamps
      .filter((bulb) => {
        for (
          let object: THREE.Object3D | null = bulb;
          object;
          object = object.parent
        )
          if (!object.visible) return false;
        return true;
      })
      .map((bulb) => bulb.getWorldPosition(new THREE.Vector3()))
      .sort(
        (a, b) =>
          a.distanceToSquared(this.camera.position) -
          b.distanceToSquared(this.camera.position),
      );
    this.nightLights.forEach((light, index) => {
      light.visible = this.lampsOn && index < candidates.length;
      if (light.visible) {
        light.position.copy(candidates[index]);
        light.intensity = 3.5;
      }
    });
  }
  private animate(now: number) {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame((t) => this.animate(t));
    if (document.hidden) {
      this.last = now;
      return;
    }
    const dt = Math.min((now - (this.last || now)) / 1000, 0.05);
    this.last = now;
    if (this.targetPosition && this.targetLook) {
      const a = 1 - Math.exp(-dt * 5);
      this.camera.position.lerp(this.targetPosition, a);
      this.controls.target.lerp(this.targetLook, a);
      if (this.camera.position.distanceTo(this.targetPosition) < 0.015) {
        this.targetPosition = null;
        this.targetLook = null;
      }
    }
    if (!this.frozen && !this.reduced.matches) {
      this.clock += dt;
      this.seaMaterial.uniforms.uTime.value = this.clock;
      for (const walker of this.people)
        if (walker.root.visible) this.updateWalker(walker, true);
      for (const cloud of this.clouds) {
        cloud.position.x =
          ((cloud.userData.startX + 35 + this.clock * cloud.userData.speed) %
            70) -
          35;
        cloud.position.y =
          cloud.userData.baseY +
          Math.sin(this.clock * 0.16 + cloud.userData.startX) * 0.12;
      }
      for (const boat of this.boats) {
        if (boat.route) {
          const a = boat.phase + this.clock * boat.route.speed;
          boat.model.position.x = boat.route.x + Math.cos(a) * boat.route.rx;
          boat.model.position.z = boat.route.z + Math.sin(a) * boat.route.rz;
          boat.model.rotation.y = Math.atan2(
            -Math.sin(a) * boat.route.rx,
            Math.cos(a) * boat.route.rz,
          );
        }
        boat.model.position.y =
          boat.base.y + Math.sin(this.clock * 1.25 + boat.phase) * 0.025;
        boat.model.rotation.z = Math.sin(this.clock * 0.8 + boat.phase) * 0.025;
      }
      if (this.clock - this.lastEvent > 16) {
        this.lastEvent = this.clock;
        const b = brands[Math.floor(this.clock / 16) % brands.length];
        this.callbacks.activity(`一位旅人走進了${b.name}的島嶼。`);
      }
    }
    const occupied: { x: number; y: number; w: number }[] = [];
    const ordered = [...this.labelObjects.entries()].sort(
      ([a], [b]) =>
        (a === this.selected ? -2 : a === "wowprime" ? -1 : 0) -
        (b === this.selected ? -2 : b === "wowprime" ? -1 : 0),
    );
    for (const [id, label] of ordered) {
      const allowed =
        this.showNames &&
        this.roots.get(id)!.visible &&
        (!this.selected ||
          id === this.selected ||
          this.camera.position.distanceTo(this.positions.get(id)!) < 19);
      const projected = this.positions
        .get(id)!
        .clone()
        .add(label.position)
        .project(this.camera);
      const x = ((projected.x + 1) * this.width) / 2,
        y = ((1 - projected.y) * this.height) / 2;
      const w =
        id === "wowprime"
          ? 78
          : Math.max(
              57,
              (brands.find((b) => b.id === id)?.name.length || 4) * 11 + 24,
            );
      label.visible =
        allowed &&
        projected.z < 1 &&
        x > 12 &&
        x < this.width - 12 &&
        y > 15 &&
        y < this.height - 15 &&
        !occupied.some(
          (p) =>
            Math.abs(p.y - y) < 26 && Math.abs(p.x - x) < (p.w + w) / 2 + 3,
        );
      if (label.visible) occupied.push({ x, y, w });
    }
    this.controls.update();
    if (this.lampsOn && now - this.lastLightUpdate > 250) {
      this.lastLightUpdate = now;
      this.updateStreetLights();
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
  dispose() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (
          o.geometry !== boxGeo &&
          o.geometry !== sphereGeo &&
          o.geometry !== cylinderGeo
        )
          o.geometry.dispose();
        const mm = Array.isArray(o.material) ? o.material : [o.material];
        mm.forEach((m) => {
          if (
            m instanceof THREE.MeshBasicMaterial ||
            m instanceof THREE.MeshStandardMaterial
          )
            m.map?.dispose();
          m.dispose();
        });
      }
    });
    lampGlowTexture?.dispose();
    lampGlowTexture = undefined;
    this.renderer.dispose();
    this.labels.domElement.remove();
    this.renderer.domElement.remove();
  }
}
