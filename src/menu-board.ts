import * as THREE from "three";
import type { Brand } from "./types.ts";
// Original, code-drawn food pictograms; names come from the same verified brand data as the detail card.
function foodIcon(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
) {
  c.save();
  c.translate(x, y);
  c.fillStyle = "#e4d6bc";
  c.beginPath();
  c.ellipse(0, 5, 43, 31, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#fff8e9";
  c.beginPath();
  c.ellipse(0, 0, 40, 29, 0, 0, Math.PI * 2);
  c.fill();
  if (/鍋|湯|粥|麵|飯/.test(name)) {
    c.fillStyle = /辣|麻|椒/.test(name) ? "#ae5a3b" : "#d7b778";
    c.beginPath();
    c.ellipse(0, 0, 30, 20, 0, 0, Math.PI * 2);
    c.fill();
    for (let j = 0; j < 5; j++) {
      c.fillStyle = j % 2 ? "#6f8a59" : "#f1d9aa";
      c.beginPath();
      c.ellipse(
        Math.sin(j * 2) * 20,
        Math.cos(j * 2) * 11,
        7,
        4,
        j,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  } else if (/蝦|蟹|龍蝦/.test(name)) {
    c.strokeStyle = "#c27750";
    c.lineWidth = 10;
    c.beginPath();
    c.arc(0, 0, 19, -0.8, 2.7);
    c.stroke();
    c.strokeStyle = "#f0b581";
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-16 + i * 10, -14);
      c.lineTo(-18 + i * 10, 8);
      c.stroke();
    }
  } else if (/冰沙|啤酒/.test(name)) {
    c.fillStyle = "#a8b277";
    c.fillRect(-13, -23, 26, 42);
    c.strokeStyle = "#f0d89d";
    c.lineWidth = 4;
    c.strokeRect(-13, -23, 26, 42);
  } else {
    const fried = /豬排|香酥|雞腿/.test(name);
    c.fillStyle = fried ? "#c29348" : "#9a5b40";
    c.beginPath();
    c.ellipse(-3, 0, 27, 17, -0.25, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = fried ? "#ecd09a" : "#d49b79";
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-20 + i * 12, -12);
      c.lineTo(-25 + i * 12, 13);
      c.stroke();
    }
    c.fillStyle = "#6e8b54";
    c.beginPath();
    c.arc(26, -12, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#c06842";
    c.beginPath();
    c.arc(27, 9, 6, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
export function createMenuBoard(brand: Brand, roofHeight: number) {
  const group = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 576;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#faf0d9";
  c.fillRect(0, 0, 768, 576);
  c.fillStyle = brand.color;
  c.fillRect(0, 0, 768, 98);
  c.fillStyle = "#fff5df";
  c.font = '600 42px "PingFang TC","Microsoft JhengHei",sans-serif';
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(`${brand.name} · 招牌精選`, 384, 52, 710);
  brand.dishes.slice(0, 3).forEach((name, i) => {
    const y = 177 + i * 145;
    foodIcon(c, name, 90, y);
    c.fillStyle = brand.color;
    c.font = "500 24px Georgia";
    c.textAlign = "left";
    c.fillText(`0${i + 1}`, 156, y - 32);
    c.fillStyle = "#493f32";
    c.font = `600 ${Math.min(43, 500 / name.length)}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    c.fillText(name, 156, y + 13, 550);
    if (i < 2) {
      c.fillStyle = "#dbceb6";
      c.fillRect(40, y + 72, 688, 2);
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 1,
    emissiveMap: texture,
    emissive: 0xffd6a4,
    emissiveIntensity: 0,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.125), material);
  board.name = "signature-menu-board";
  board.userData.dishes = brand.dishes.slice(0, 3);
  group.add(board);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.58, 1.2, 0.065),
    new THREE.MeshStandardMaterial({ color: 0x78644d, roughness: 1 }),
  );
  frame.position.z = -0.04;
  frame.castShadow = true;
  group.add(frame);
  // Place the board in front of the eaves and upper roof volumes, so no cuisine-specific roof hides a dish.
  group.position.set(0, roofHeight + 1.02, 0.62);
  for (const x of [-0.6, 0.6]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.7, 0.045),
      new THREE.MeshStandardMaterial({ color: 0x78644d }),
    );
    post.position.set(x, -0.8, -0.03);
    group.add(post);
  }
  return group;
}
