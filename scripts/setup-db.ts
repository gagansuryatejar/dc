/**
 * Database initialization script for NEXUS AI.
 * Ensures the data/ directory exists and synchronizes the Prisma schema with SQLite.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const dataDir = path.resolve(process.cwd(), "data");
const backupsDir = path.resolve(dataDir, "backups");

console.log("==> Ensuring SQLite data storage directories exist...");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

console.log("==> Generating Prisma client artifacts...");
execSync("npx prisma generate", { stdio: "inherit" });

console.log("==> Synchronizing database schema via Prisma db push...");
execSync("npx prisma db push", { stdio: "inherit" });

console.log("==> Database initialization complete!");
