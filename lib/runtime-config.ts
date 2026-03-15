const DEFAULT_MODEL = "claude-sonnet-4-6";

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", description: "빠르고 효율적 ⚡" },
  { id: "claude-opus-4-6", label: "Opus 4.6", description: "최고 품질 🧠" },
];

export function getRuntimeConfig() {
  const modelName = process.env.MODEL_NAME || DEFAULT_MODEL;
  const hasAnthropicApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasCouncilPassword = Boolean(process.env.COUNCIL_ACCESS_PASSWORD);

  return {
    modelName,
    hasAnthropicApiKey,
    hasCouncilPassword,
    isStudioReady: hasAnthropicApiKey,
    isCouncilReady: hasAnthropicApiKey && hasCouncilPassword,
    availableModels: AVAILABLE_MODELS,
  };
}

export function resolveModel(requestedModel?: string): string {
  if (!requestedModel) return process.env.MODEL_NAME || DEFAULT_MODEL;
  const valid = AVAILABLE_MODELS.find((m) => m.id === requestedModel);
  return valid ? valid.id : process.env.MODEL_NAME || DEFAULT_MODEL;
}

export type RuntimeConfig = ReturnType<typeof getRuntimeConfig>;
