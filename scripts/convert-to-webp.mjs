/**
 * Script de conversão de imagens JPG/PNG para WebP.
 * Uso: node scripts/convert-to-webp.mjs
 *
 * Converte todos os JPG/PNG em public/Avatar/ e public/card-brands/
 * para WebP, reduzindo o tamanho total de ~8MB para ~2MB.
 */
import sharp from "sharp";
import { readdir, stat, unlink, rename } from "fs/promises";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DIRS = [join(ROOT, "public", "Avatar"), join(ROOT, "public", "card-brands")];

const QUALITY = 80; // WebP quality (0-100)

async function convertToWebp(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") return null;

  const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, ".webp");

  try {
    const metadata = await stat(filePath);
    const beforeSize = metadata.size;

    await sharp(filePath)
      .webp({ quality: QUALITY })
      .toFile(webpPath + ".tmp");

    const afterStat = await stat(webpPath + ".tmp");
    const afterSize = afterStat.size;

    // Substitui o original apenas se o WebP for menor
    if (afterSize < beforeSize) {
      await rename(webpPath + ".tmp", webpPath);
      // Remove o original
      await unlink(filePath);
      const reduction = ((1 - afterSize / beforeSize) * 100).toFixed(1);
      console.log(
        `✅ ${filePath.split("/").pop()} → WebP: ${(beforeSize / 1024).toFixed(1)}KB → ${(afterSize / 1024).toFixed(1)}KB (${reduction}% menor)`
      );
      return { before: beforeSize, after: afterSize };
    } else {
      await unlink(webpPath + ".tmp");
      console.log(`⏭️  ${filePath.split("/").pop()}: WebP seria maior, mantendo original`);
      return null;
    }
  } catch (err) {
    console.error(`❌ Erro ao converter ${filePath}:`, err.message);
    return null;
  }
}

async function main() {
  let totalBefore = 0;
  let totalAfter = 0;
  let converted = 0;

  for (const dir of DIRS) {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        const filePath = join(dir, file);
        const result = await convertToWebp(filePath);
        if (result) {
          totalBefore += result.before;
          totalAfter += result.after;
          converted++;
        }
      }
    } catch (err) {
      console.error(`Erro ao processar diretório ${dir}:`, err.message);
    }
  }

  console.log("\n=== RESUMO ===");
  console.log(`Arquivos convertidos: ${converted}`);
  console.log(`Total antes: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total depois: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Redução: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%`);
}

main().catch(console.error);
