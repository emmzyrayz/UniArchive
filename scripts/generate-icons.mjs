// scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("src/assets/svg/uniarchive.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icon-192x192.png");
console.log("✓ icon-192x192.png");

await sharp(svg).resize(512, 512).png().toFile("public/icon-512x512.png");
console.log("✓ icon-512x512.png");