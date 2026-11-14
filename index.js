/**
 * Root entrypoint for NEXUS AI.
 * Compatible with Bot-Hosting.net, Pterodactyl, Render, and standard Node.js hosts.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

// If dist/index.js does not exist yet (e.g. fresh clone), build it automatically
if (!fs.existsSync("./dist/index.js")) {
  console.log("⚡ [NEXUS AI] dist/index.js not found. Running prisma db push and build...");
  try {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    execSync("npm run build", { stdio: "inherit" });
  } catch (err) {
    console.error("❌ [NEXUS AI] Automatic build failed:", err);
  }
}

// Ensure database directory exists
if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data", { recursive: true });
}

// Load and start NEXUS AI
console.log("🚀 [NEXUS AI] Starting engine from dist/index.js...");
await import("./dist/index.js");
