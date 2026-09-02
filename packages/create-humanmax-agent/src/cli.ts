#!/usr/bin/env node
import { basename, resolve } from "node:path";
import { generateProject } from "@humanmax/project-generator";

const usage = `Usage: create-humanmax-agent <directory> [--defaults] [--dry-run] [--apply]

Preview bootstrap: TypeScript tool-agent, base profile, assisted autonomy.
Does not write sg-core, production enforcement, or a second tool registry.

  --defaults   Use the Preview path (no wizard). Implied when no other profile is requested.
  --dry-run    Print the file plan without writing.
  --apply      Allow writing into a non-empty directory.

Passing tests is not production enforcement or certification.
`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("-")));
const positionals = args.filter((arg) => !arg.startsWith("-"));

if (flags.has("-h") || flags.has("--help")) {
  process.stdout.write(usage);
  process.exit(0);
}

if (args.some((arg) => arg.includes("sg-core"))) {
  process.stderr.write("Preview does not generate sg-core.\n");
  process.exitCode = 2;
} else if (positionals.length !== 1 || !positionals[0]) {
  process.stderr.write(usage);
  process.exitCode = 2;
} else {
  const destination = resolve(positionals[0]);
  try {
    const plan = generateProject({
      destination,
      name: basename(destination),
      dryRun: flags.has("--dry-run"),
      apply: flags.has("--apply"),
    });
    if (plan.wrote) {
      process.stdout.write(`Created ${plan.name} in ${plan.destination}\n`);
    } else {
      process.stdout.write(plan.files.map((file) => file.path).join("\n") + "\n");
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  }
}
