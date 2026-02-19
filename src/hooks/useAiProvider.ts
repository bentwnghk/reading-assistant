import { useSettingStore } from "@/store/setting";
import {
  createAIProvider,
  type AIProviderOptions,
} from "@/utils/deep-research/provider";
import {
  OPENAI_BASE_URL,
} from "@/constants/urls";
import { multiApiKeyPolling } from "@/utils/model";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";

function useModelProvider() {
  async function createModelProvider(model: string, settings?: any) {
    const { mode, provider, accessPassword } = useSettingStore.getState();
    const options: AIProviderOptions = {
      baseURL: "",
      provider,
      model,
      settings,
    };

    if (mode === "proxy") {
      options.apiKey = generateSignature(accessPassword, Date.now());
      switch (provider) {
        case "openai":
          options.baseURL = location.origin + "/api/ai/openai/v1";
          break;
        case "openaicompatible":
          options.baseURL = location.origin + "/api/ai/openaicompatible/v1";
          break;
        case "google":
          options.baseURL = location.origin + "/api/ai/google/v1beta";
          break;
        case "anthropic":
          options.baseURL = location.origin + "/api/ai/anthropic/v1";
          break;
        case "deepseek":
          options.baseURL = location.origin + "/api/ai/deepseek/v1";
          break;
        case "xai":
          options.baseURL = location.origin + "/api/ai/xai/v1";
          break;
        case "mistral":
          options.baseURL = location.origin + "/api/ai/mistral/v1";
          break;
        case "openrouter":
          options.baseURL = location.origin + "/api/ai/openrouter/v1";
          break;
        case "ollama":
          options.baseURL = location.origin + "/api/ai/ollama/v1";
          break;
        case "pollinations":
          options.baseURL = location.origin + "/api/ai/pollinations/v1";
          break;
        default:
          break;
      }
    } else {
      switch (provider) {
        case "openai":
          const { openAIApiKey = "", openAIApiProxy } =
            useSettingStore.getState();
          options.baseURL = completePath(
            openAIApiProxy || OPENAI_BASE_URL,
            "/v1"
          );
          options.apiKey = multiApiKeyPolling(openAIApiKey);
          break;
        case "openaicompatible":
          const { openaicompatibleApiKey = "", openaicompatibleApiProxy } =
            useSettingStore.getState();
          options.baseURL = completePath(openaicompatibleApiProxy, "/v1");
          options.apiKey = multiApiKeyPolling(openaicompatibleApiKey);
          break;
        default:
          break;
      }
    }

    return await createAIProvider(options);
  }

  function hasApiKey(): boolean {
    const { provider } = useSettingStore.getState();

    switch (provider) {
      case "openai":
        const { openAIApiKey } = useSettingStore.getState();
        return openAIApiKey.length > 0;
      case "openaicompatible":
        const { openaicompatibleApiKey } = useSettingStore.getState();
        return openaicompatibleApiKey.length > 0;
      default:
        return false;
    }
  }

  return {
    createModelProvider,
    hasApiKey,
  };
}

export default useModelProvider;
