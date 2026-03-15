import { getRuntimeConfig } from "@/lib/runtime-config";
import { getStorageProvider, isStorageConfigured } from "@/lib/db";

export async function GET() {
  const config = getRuntimeConfig();
  const storageProvider = getStorageProvider();
  const storageConfigured = isStorageConfigured();

  return Response.json({
    service: "Hypermind for You",
    provider: "Anthropic",
    modelName: config.modelName,
    availableModels: config.availableModels,
    storageProvider,
    storageConfigured,
    hasAnthropicApiKey: config.hasAnthropicApiKey,
    hasCouncilPassword: config.hasCouncilPassword,
    isStudioReady: config.isStudioReady,
    isCouncilReady: config.isCouncilReady,
  });
}
