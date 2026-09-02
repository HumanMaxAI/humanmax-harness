import { cpSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptsDir);
const source = join(packageRoot, "../../packs");
const dest = join(packageRoot, "packs");

function assertNoSymlinks(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, name.name);
    if (name.isSymbolicLink() || lstatSync(child).isSymbolicLink()) {
      throw new Error(`refusing to embed symbolic link: ${child}`);
    }
    if (name.isDirectory()) {
      assertNoSymlinks(child);
    }
  }
}

assertNoSymlinks(source);
rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, { recursive: true, dereference: false });
assertNoSymlinks(dest);
