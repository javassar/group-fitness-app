import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ICONS_DIR = path.resolve('public/icons');
const sourcePng = path.join(ICONS_DIR, 'source.png');
const sourceSvg = path.join(ICONS_DIR, 'source.svg');

const inputSource = fs.existsSync(sourcePng) ? sourcePng : sourceSvg;
if (!fs.existsSync(inputSource)) {
  console.error('No icon source found in public/icons/ (need source.png or source.svg)');
  process.exit(1);
}

console.log(`Generating icons from: ${inputSource}`);

async function generate() {
  const sourceBuffer = fs.readFileSync(inputSource);

  // 1. icon-192.png
  await sharp(sourceBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));
  console.log('✓ icon-192.png (192x192)');

  // 2. icon-512.png
  await sharp(sourceBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));
  console.log('✓ icon-512.png (512x512)');

  // 3. icon-512-maskable.png (artwork inside central 80%, 410px with padding)
  const innerSize = 410;
  const pad = 51; // (512 - 410) / 2 = 51
  await sharp(sourceBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: '#120809',
    })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'));
  console.log('✓ icon-512-maskable.png (512x512 maskable)');

  // 4. apple-touch-icon.png (180x180, fully opaque)
  await sharp(sourceBuffer)
    .resize(180, 180)
    .flatten({ background: '#120809' })
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png (180x180)');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
