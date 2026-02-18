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

    switch (provider) {
      case "openai":
        const { openAIApiKey = "", openAIApiProxy } =
          useSettingStore.getState();
        if (mode === "local") {
          options.baseURL = completePath(
            openAIApiProxy || OPENAI_BASE_URL,
            "/v1"
          );
          options.apiKey = multiApiKeyPolling(openAIApiKey);
        } else {
          options.baseURL = location.origin + "/api/ai/openai/v1";
        }
        break;
      case "openaicompatible":
        const { openaicompatibleApiKey = "", openaicompatibleApiProxy } =
          useSettingStore.getState();
        if (mode === "local") {
          options.baseURL = completePath(openaicompatibleApiProxy, "/v1");
          options.apiKey = multiApiKeyPolling(openaicompatibleApiKey);
        } else {
          options.baseURL = location.origin + "/api/ai/openaicompatible/v1";
        }
        break;
      default:
        break;
    }

    if (mode === "proxy") {
      options.apiKey = generateSignature(accessPassword, Date.now());
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
