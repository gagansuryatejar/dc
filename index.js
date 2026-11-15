/**
 * Root entrypoint for NEXUS AI.
 * Compatible with Bot-Hosting.net, Pterodactyl, Render, and standard Node.js hosts.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

// Self-heal: ensure discord-api-types is installed if missing
if (!fs.existsSync("./node_modules/discord-api-types")) {
  console.log("⚡ [NEXUS AI] Installing discord-api-types...");
  try {
    execSync("npm install discord-api-types@0.37.120", { stdio: "inherit" });
  } catch (err) {
    console.warn("⚠️ [NEXUS AI] Dependency install warning:", err);
  }
}

// If dist/src/index.js does not exist yet (e.g. fresh clone), build it automatically
if (!fs.existsSync("./dist/src/index.js")) {
  console.log("⚡ [NEXUS AI] dist/src/index.js not found. Running prisma db push and build...");
  try {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    execSync("npm run build", { stdio: "inherit" });
  } catch (err) {
    console.error("❌ [NEXUS AI] Automatic build failed:", err);
  }
}

// Ensure database directory exists and schema is synced
if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data", { recursive: true });
}

// Ensure Prisma client binary is generated
if (!fs.existsSync("./node_modules/.prisma/client/index.js")) {
  console.log("⚡ [NEXUS AI] Generating Prisma client...");
  try {
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch (err) {
    console.warn("⚠️ [NEXUS AI] Prisma generate warning:", err);
  }
}

if (!fs.existsSync("./data/nexus.db")) {
  console.log("⚡ [NEXUS AI] Initializing database schema...");
  try {
    execSync("npx prisma db push", { stdio: "inherit" });
  } catch (err) {
    console.warn("⚠️ [NEXUS AI] Database initialization warning:", err);
  }
}

// Load and start NEXUS AI
console.log("🚀 [NEXUS AI] Starting engine from dist/src/index.js...");
await import("./dist/src/index.js");
