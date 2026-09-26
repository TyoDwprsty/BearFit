// Generates PWA icons from the Beru mascot SVG.  Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const beru = `
<ellipse cx="76" cy="176" rx="19" ry="13" fill="#A96A3D"/>
<ellipse cx="124" cy="176" rx="19" ry="13" fill="#A96A3D"/>
<ellipse cx="76" cy="179" rx="10" ry="6" fill="#F6DDBD"/>
<ellipse cx="124" cy="179" rx="10" ry="6" fill="#F6DDBD"/>
<ellipse cx="100" cy="138" rx="50" ry="42" fill="#C98B57"/>
<ellipse cx="100" cy="146" rx="31" ry="27" fill="#F6DDBD"/>
<circle cx="62" cy="44" r="17" fill="#C98B57"/>
<circle cx="138" cy="44" r="17" fill="#C98B57"/>
<circle cx="62" cy="44" r="9" fill="#F2B09A"/>
<circle cx="138" cy="44" r="9" fill="#F2B09A"/>
<circle cx="100" cy="80" r="47" fill="#C98B57"/>
<path d="M56 62 Q100 40 144 62 L147 74 Q100 52 53 74 Z" fill="#FF8A3D"/>
<circle cx="100" cy="56" r="4" fill="#FFFFFF" opacity="0.9"/>
<ellipse cx="82" cy="86" rx="5.5" ry="6.5" fill="#2B2335"/>
<ellipse cx="118" cy="86" rx="5.5" ry="6.5" fill="#2B2335"/>
<circle cx="84" cy="83.5" r="2" fill="#FFFFFF"/>
<circle cx="120" cy="83.5" r="2" fill="#FFFFFF"/>
<ellipse cx="100" cy="104" rx="17" ry="13" fill="#F6DDBD"/>
<ellipse cx="100" cy="98" rx="6.5" ry="4.8" fill="#2B2335"/>
<path d="M93 106 Q100 113 107 106" stroke="#2B2335" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<ellipse cx="70" cy="101" rx="8" ry="5" fill="#FF8FA3" opacity="0.65"/>
<ellipse cx="130" cy="101" rx="8" ry="5" fill="#FF8FA3" opacity="0.65"/>
<ellipse cx="58" cy="138" rx="13" ry="21" fill="#B97A48" transform="rotate(25 58 138)"/>
<circle cx="50" cy="156" r="10" fill="#C98B57"/>
<ellipse cx="154" cy="108" rx="13" ry="23" fill="#B97A48" transform="rotate(25 154 108)"/>
<circle cx="164" cy="86" r="11" fill="#C98B57"/>
<ellipse cx="164" cy="87" rx="5" ry="4" fill="#F2B09A"/>`;

const icon = ({ rounded, scale }) => {
  const size = 200 * scale;
  const off = (512 - size) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="#FFC940"/>
  <circle cx="256" cy="${256 + 8 * scale}" r="${92 * scale}" fill="#FFE08A"/>
  <g transform="translate(${off} ${off + 6 * scale}) scale(${scale})">${beru}</g>
</svg>`;
};

// Monochrome silhouette for the Android status-bar badge.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <circle cx="26" cy="24" r="12" fill="#fff"/><circle cx="70" cy="24" r="12" fill="#fff"/>
  <circle cx="48" cy="50" r="32" fill="#fff"/>
</svg>`;

await mkdir("public/icons", { recursive: true });

const any = Buffer.from(icon({ rounded: true, scale: 2.05 }));
const full = Buffer.from(icon({ rounded: false, scale: 2.05 }));
const maskable = Buffer.from(icon({ rounded: false, scale: 1.6 }));

await sharp(any).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(any).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512, 512).png().toFile("public/icons/maskable-512.png");
await sharp(full).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(badge)).resize(96, 96).png().toFile("public/icons/badge-96.png");
await sharp(any).resize(48, 48).png().toFile("public/icons/favicon-48.png");

console.log("Icons written to public/icons/");
