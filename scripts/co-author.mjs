#!/usr/bin/env node

/**
 * Print a Co-authored-by trailer: harness tool + model.
 * Usage: node scripts/co-author.mjs <Harness> <Model>
 */

import { pathToFileURL } from "node:url";

export function slug(value) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9.+-]/g, "");
}

export function coAuthorTrailer(harness, model) {
  const name = `${harness.trim()} + ${model.trim()}`;
  const email = `${slug(harness)}+${slug(model)}@noreply.humanmax.ai`;
  return `Co-authored-by: ${name} <${email}>`;
}

const invokedDirectly =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const harness = process.argv[2];
  const model = process.argv.slice(3).join(" ");
  if (!harness || !model) {
    process.stderr.write("usage: node scripts/co-author.mjs <Harness> <Model>\n");
    process.exitCode = 2;
  } else {
    process.stdout.write(`${coAuthorTrailer(harness, model)}\n`);
  }
}
