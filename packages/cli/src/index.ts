import { PREVIEW_CLI_COMMANDS } from "@humanmax/contracts";

export { PREVIEW_CLI_COMMANDS };

export const EXIT_USAGE = 2;

export function previewCommands(): readonly string[] {
  return PREVIEW_CLI_COMMANDS;
}
