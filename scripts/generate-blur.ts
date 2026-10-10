import fs from "fs";
import path from "path";
import sharp from "sharp";

async function generateBlurMap() {
  const imagesDir = path.join(process.cwd(), "public", "images");
  const outputJson = path.join(process.cwd(), "common", "constants", "blur-placeholders.json");
  const blurMap: Record<string, string> = {};

  if (!fs.existsSync(imagesDir)) {
    console.log("No public/images directory found.");
    return;
  }

  const files = fs.readdirSync(imagesDir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      try {
        const filePath = path.join(imagesDir, file);
        const buffer = await sharp(filePath)
          .resize(20, 10, { fit: "cover" })
          .webp({ quality: 20 })
          .toBuffer();
        const base64 = `data:image/webp;base64,${buffer.toString("base64")}`;
        blurMap[`/images/${file}`] = base64;
      } catch (err) {
        console.warn(`Could not generate blur for ${file}:`, err);
      }
    }
  }

  fs.writeFileSync(outputJson, JSON.stringify(blurMap, null, 2), "utf-8");
  console.log(`Generated blur placeholders for ${Object.keys(blurMap).length} images -> ${outputJson}`);
}

generateBlurMap().catch(console.error);
