import sharp from "sharp";
import fs from "fs";

// Resoluções de splash iOS (portrait, px reais) — cobre SE ate 16 Pro Max
const DEVICES = [
  { w: 640, h: 1136, dw: 320, dh: 568, r: 2 }, // SE 1g
  { w: 750, h: 1334, dw: 375, dh: 667, r: 2 }, // SE 2/3, 8
  { w: 828, h: 1792, dw: 414, dh: 896, r: 2 }, // XR, 11
  { w: 1080, h: 2340, dw: 360, dh: 780, r: 3 }, // 13 mini
  { w: 1125, h: 2436, dw: 375, dh: 812, r: 3 }, // X, XS, 11 Pro
  { w: 1170, h: 2532, dw: 390, dh: 844, r: 3 }, // 12, 13, 14
  { w: 1179, h: 2556, dw: 393, dh: 852, r: 3 }, // 14 Pro, 15, 16
  { w: 1206, h: 2622, dw: 402, dh: 874, r: 3 }, // 16 Pro
  { w: 1242, h: 2688, dw: 414, dh: 896, r: 3 }, // XS Max, 11 Pro Max
  { w: 1284, h: 2778, dw: 428, dh: 926, r: 3 }, // 12/13/14 Plus Pro Max
  { w: 1290, h: 2796, dw: 430, dh: 932, r: 3 }, // 14/15/16 Pro Max
  { w: 1320, h: 2868, dw: 440, dh: 956, r: 3 }, // 16 Pro Max
];
const THEMES = [
  { name: "light", bg: "#F8F9FA" }, // --bg-page light
  { name: "dark", bg: "#0F1117" }, // --bg-page dark
];

(async () => {
  fs.mkdirSync("public/splash", { recursive: true });
  const links = [];
  for (const t of THEMES) {
    for (const d of DEVICES) {
      const iconSize = Math.round(d.w * 0.28);
      const icon = await sharp("public/icon-512.png").resize(iconSize, iconSize).toBuffer();
      const file = `splash/${d.w}x${d.h}-${t.name}.png`;
      await sharp({
        create: { width: d.w, height: d.h, channels: 3, background: t.bg },
      })
        .composite([{ input: icon, gravity: "center" }])
        .png({ compressionLevel: 9, palette: true })
        .toFile(`public/${file}`);
      const scheme =
        t.name === "dark"
          ? " and (prefers-color-scheme: dark)"
          : " and (prefers-color-scheme: light)";
      links.push(
        `    <link rel="apple-touch-startup-image" media="(device-width: ${d.dw}px) and (device-height: ${d.dh}px) and (-webkit-device-pixel-ratio: ${d.r})${scheme}" href="/${file}" />`
      );
    }
  }
  fs.writeFileSync("/tmp/splash-links.html", links.join("\n"));
  console.log(`gerados: ${THEMES.length * DEVICES.length} arquivos`);
})();
