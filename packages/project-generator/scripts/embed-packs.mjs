import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptsDir);
const source = join(packageRoot, "../../packs");
const dest = join(packageRoot, "packs");

rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, { recursive: true });
