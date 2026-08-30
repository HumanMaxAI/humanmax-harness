export const PREVIEW_TEMPLATE = "tool-agent" as const;
export const PREVIEW_PROFILE = "base" as const;

export function defaultCreateOptions() {
  return {
    language: "typescript",
    template: PREVIEW_TEMPLATE,
    modelAdapter: "generic",
    autonomy: "assisted",
    profiles: [PREVIEW_PROFILE],
    ci: "github",
  } as const;
}
