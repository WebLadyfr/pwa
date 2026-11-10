// Génère des icônes PNG simples sans dépendance (zlib natif). Remplacer par un vrai design avant lancement.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

function png(size, { maskable }) {
  const bg = [0x25, 0x5a, 0x54], fg = [0xff, 0xff, 0xff];
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2, cy = size / 2;
  const R = size * (maskable ? 0.3 : 0.36), r = R * 0.62; // anneau (zone sûre plus petite si maskable)
  const corner = maskable ? 0 : size * 0.22;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // coins arrondis (transparents) pour l'icône non-maskable
      const dx = Math.max(corner - x, 0, x - (size - corner)), dy = Math.max(corner - y, 0, y - (size - corner));
      const outside = corner > 0 && Math.hypot(dx, dy) > corner;
      const ring = d <= R && d >= r;
      const bar = Math.abs(x + 0.5 - cx) < size * 0.02 && Math.abs(y + 0.5 - cy) < r * 0.8;
      const col = ring || bar ? fg : bg;
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2]; raw[i + 3] = outside ? 0 : 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192, { maskable: false }));
writeFileSync("public/icons/icon-512.png", png(512, { maskable: false }));
writeFileSync("public/icons/maskable-512.png", png(512, { maskable: true }));
console.log("Icônes générées dans public/icons");
