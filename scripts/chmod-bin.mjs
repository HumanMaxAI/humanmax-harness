import { chmodSync, existsSync } from "node:fs";

for (const file of process.argv.slice(2)) {
  if (!existsSync(file)) {
    throw new Error(`missing bin ${file}`);
  }
  chmodSync(file, 0o755);
}
