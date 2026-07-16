import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';

async function run() {
  await sharp('public/BitScribe_Emblem.svg').resize(512, 512).png().toFile('src-tauri/icons/icon.png');
  // Resize to 256x256 for the .ico to prevent Windows RC.exe RC2176 "old DIB" error
  await sharp('src-tauri/icons/icon.png').resize(256, 256).toFile('src-tauri/icons/icon_256.png');
  const buf = await pngToIco('src-tauri/icons/icon_256.png');
  fs.writeFileSync('src-tauri/icons/icon.ico', buf);
  fs.writeFileSync('public/logo.ico', buf);
  fs.copyFileSync('src-tauri/icons/icon.png', 'public/logo.png');
  // Clean up temporary 256px png
  if (fs.existsSync('src-tauri/icons/icon_256.png')) {
    fs.unlinkSync('src-tauri/icons/icon_256.png');
  }
  console.log('Icons generated successfully.');
}
run().catch(console.error);
