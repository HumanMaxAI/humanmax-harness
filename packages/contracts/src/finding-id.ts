import { createHash } from "node:crypto";
import type { FileLocation, SubjectRef } from "./types.ts";

export type FindingIdentityInput = {
  ruleId: string;
  subject: SubjectRef;
  location?: FileLocation;
};

export function findingId(input: FindingIdentityInput): string {
  const material = JSON.stringify({
    ruleId: input.ruleId,
    subject: {
      type: input.subject.type,
      id: input.subject.id,
    },
    location: input.location
      ? { file: input.location.file, line: input.location.line ?? null }
      : null,
  });
  const digest = createHash("sha256").update(material).digest("hex").slice(0, 32);
  return `finding_${digest}`;
}
