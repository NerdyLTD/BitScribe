import fs from 'fs';
import sharp from 'sharp';

const svgContent = fs.readFileSync('public/BitScribe_Logo_Full.svg', 'utf8');
// Remove the solid background
let transparentSvg = svgContent.replace('<rect width="800" height="400" fill="#0A0D14" />', '');

// Save the transparent SVG
fs.writeFileSync('public/BitScribe_Logo_Full_Transparent.svg', transparentSvg);

// Convert to high-quality PNG (e.g., scale up to 2400x1200 or original 800x400)
// The user asked for "high quality", so we'll render at 3x resolution
sharp(Buffer.from(transparentSvg), { density: 216 }) // 72 * 3
  .resize(2400, 1200)
  .png()
  .toFile('public/BitScribe_Logo_Full_Transparent.png')
  .then(() => console.log('Generated public/BitScribe_Logo_Full_Transparent.png'))
  .catch(err => console.error('Error generating PNG:', err));
