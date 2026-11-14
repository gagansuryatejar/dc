import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(process.cwd(), "src/dashboard/public");
const distDir = path.resolve(process.cwd(), "dist/dashboard/public");

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
  }
  console.log(`[Build] Copied ${files.length} static dashboard files to dist/dashboard/public/`);
}
