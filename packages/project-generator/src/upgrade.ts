import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import type { FileOwnershipClass } from "@humanmax/contracts";
import { fileDigest, generateProject } from "./generate.ts";

export type UpgradeAction =
  | "replace"
  | "merge"
  | "skip"
  | "create"
  | "unchanged";

export type UpgradeFile = {
  path: string;
  ownership: FileOwnershipClass;
  action: UpgradeAction;
  currentDigest?: string;
  nextDigest: string;
};

export type UpgradePlan = {
  destination: string;
  wrote: false;
  files: UpgradeFile[];
};

export function planUpgrade(request: { destination: string }): UpgradePlan {
  const destination = request.destination;
  const name = basename(destination);
  const next = generateProject({ destination, name, dryRun: true });
  const files: UpgradeFile[] = next.files.map((file) => {
    const fullPath = `${destination}/${file.path}`;
    const nextDigest = fileDigest(file.contents);
    if (!existsSync(fullPath)) {
      return {
        path: file.path,
        ownership: file.ownership,
        action: "create",
        nextDigest,
      };
    }
    const currentDigest = fileDigest(readFileSync(fullPath, "utf8"));
    if (currentDigest === nextDigest) {
      return {
        path: file.path,
        ownership: file.ownership,
        action: "unchanged",
        currentDigest,
        nextDigest,
      };
    }
    const action: UpgradeAction =
      file.ownership === "user-owned"
        ? "skip"
        : file.ownership === "mergeable"
          ? "merge"
          : "replace";
    return {
      path: file.path,
      ownership: file.ownership,
      action,
      currentDigest,
      nextDigest,
    };
  });
  return { destination, wrote: false, files };
}
