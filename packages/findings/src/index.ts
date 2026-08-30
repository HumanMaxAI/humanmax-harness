export const RULE_PREFIX = "HMX-" as const;

export function ruleId(family: string, number: number): string {
  const n = String(number).padStart(3, "0");
  return `${RULE_PREFIX}${family.toUpperCase()}-${n}`;
}
