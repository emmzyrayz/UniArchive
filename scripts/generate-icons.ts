// scripts/generate-icons.ts
// Regenerates every app icon from the vector logo. Run after changing the
// logo, and commit the outputs:
//
//   pnpm icons
//
// Outputs:
//   src/app/favicon.ico          16/32/48 (PNG-in-ICO)     Next file convention
//   src/app/icon.png             512                       Next file convention
//   src/app/apple-icon.png       180, opaque               Next file convention
//   public/icon-192.png          192                       manifest
//   public/icon-512.png          512                       manifest
//   public/icon-maskable-512.png 512, safe-zone padding    manifest (maskable)
//   public/logo.png              512                       JSON-LD Organization.logo
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";

const SOURCE = "src/assets/svg/uniarchive.svg"; // 384×384, black mark on #fafafa
const SOURCE_SIZE = 384;
// The logo's own square colour (--color-neutral-50): padding blends into it
const TILE = "#fafafa";

const svg = readFileSync(SOURCE);

/** The logo rasterised straight at `size` (vector, so no upscaling blur). */
function logo(size: number): sharp.Sharp {
  return sharp(svg, { density: Math.ceil((72 * size) / SOURCE_SIZE) + 1 })
    .resize(size, size)
    .flatten({ background: TILE });
}

async function writePng(path: string, image: sharp.Sharp): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  await image.png({ compressionLevel: 9 }).toFile(path);
  console.log(`✓ ${path}`);
}

/**
 * Maskable icons are cropped to a circle (or other shape) by the OS; content
 * must sit inside the central 80%. The logo is scaled to 80% on a tile of the
 * same colour, which leaves the mark itself with ~20% padding on every side.
 */
async function maskable(size: number): Promise<sharp.Sharp> {
  const inner = Math.round(size * 0.8);
  const mark = await logo(inner).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 3, background: TILE },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .removeAlpha();
}

/** ICO container holding PNG images (supported by every current browser). */
async function writeIco(path: string, sizes: number[]): Promise<void> {
  const images = await Promise.all(sizes.map((s) => logo(s).png().toBuffer()));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  images.forEach((png, i) => {
    const size = sizes[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colours
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  });

  writeFileSync(path, Buffer.concat([header, ...entries, ...images]));
  console.log(`✓ ${path}`);
}

async function main(): Promise<void> {
  await writeIco("src/app/favicon.ico", [16, 32, 48]);
  await writePng("src/app/icon.png", logo(512));
  // iOS shows transparency as black, so this one must be fully opaque
  await writePng("src/app/apple-icon.png", logo(180).removeAlpha());
  await writePng("public/icon-192.png", logo(192));
  await writePng("public/icon-512.png", logo(512));
  await writePng("public/icon-maskable-512.png", await maskable(512));
  await writePng("public/logo.png", logo(512));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
