import { EXIT_USAGE, previewCommands } from "./index.ts";

const usage = `humanmax <command>

Preview commands: ${previewCommands().join(", ")}

This binary is a scaffold stub. Implementation has not landed.
`;

process.stderr.write(usage);
process.exitCode = EXIT_USAGE;
