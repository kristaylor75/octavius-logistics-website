// Generate every brand raster from one source image (the octopus mark).
//
//   node scripts/gen-brand-assets.mjs <source-image>
//
// Produces:
//   public/octavius-mark.png   — header logo (96px, retina for the 32px slot)
//   src/app/icon.png           — modern favicon (256px, Next auto-links it)
//   src/app/apple-icon.png     — iOS home-screen icon (180px)
//   src/app/favicon.ico        — legacy / direct /favicon.ico hits (48px PNG-in-ICO)
//
// The source should be a transparent PNG. If it has a solid background, pass
// `--key` to flood-remove a near-uniform background sampled from the corners.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const src = process.argv[2];
const KEY = process.argv.includes("--key");
if (!src) {
  console.error("usage: node scripts/gen-brand-assets.mjs <source-image> [--key]");
  process.exit(1);
}

// Optional: knock out a near-uniform background (sampled at the top-left corner).
async function maybeKey(input) {
  if (!KEY) return input;
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const [br, bg, bb] = [data[0], data[1], data[2]];
  const tol = 38;
  for (let i = 0; i < data.length; i += ch) {
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    if (dr * dr + dg * dg + db * db < tol * tol) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toBuffer();
}

// Trim, contain into a square of `size` with transparent padding `pad` (fraction).
async function square(input, size, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const fg = await sharp(input)
    .trim({ threshold: 12 })
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fg, gravity: "center" }])
    .png()
    .toBuffer();
}

// Wrap a single PNG in a minimal ICO container (modern browsers read PNG-in-ICO).
function pngToIco(png, dim) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const dir = Buffer.alloc(16);
  dir.writeUInt8(dim >= 256 ? 0 : dim, 0); // width  (0 == 256)
  dir.writeUInt8(dim >= 256 ? 0 : dim, 1); // height
  dir.writeUInt8(0, 2); // palette
  dir.writeUInt8(0, 3); // reserved
  dir.writeUInt16LE(1, 4); // color planes
  dir.writeUInt16LE(32, 6); // bits per pixel
  dir.writeUInt32LE(png.length, 8); // bytes in resource
  dir.writeUInt32LE(22, 12); // offset to image data
  return Buffer.concat([header, dir, png]);
}

const keyed = await maybeKey(src);

writeFileSync("public/octavius-mark.png", await square(keyed, 96, 0.04));
writeFileSync("src/app/icon.png", await square(keyed, 256, 0.08));
writeFileSync("src/app/apple-icon.png", await square(keyed, 180, 0.1));
writeFileSync("src/app/favicon.ico", pngToIco(await square(keyed, 48, 0.06), 48));

console.log(`brand assets generated from ${src}${KEY ? " (background keyed)" : ""}`);
