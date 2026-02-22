import fs from "fs";

// Create a simple SVG icon with "AI" text on an indigo background
function createSvgIcon(size) {
  const rx = Math.round(size * 0.167);
  const fontSize = Math.round(size * 0.5);
  const textY = Math.round(size * 0.625);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#6366f1"/>
  <text x="${size / 2}" y="${textY}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="${fontSize}" fill="white">AI</text>
</svg>`;
}

// Write SVG icons (browsers accept SVG for PWA icons)
fs.writeFileSync("public/icon-192.svg", createSvgIcon(192));
fs.writeFileSync("public/icon-512.svg", createSvgIcon(512));

// Also write as .png extension (actually SVG content, but works for dev)
// For production, you'd use a proper PNG conversion tool
fs.writeFileSync("public/icon-192.png", createSvgIcon(192));
fs.writeFileSync("public/icon-512.png", createSvgIcon(512));

console.log("Icons created: icon-192.png, icon-512.png");
