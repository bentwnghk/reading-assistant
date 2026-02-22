"use client";
import {
  useState,
  useLayoutEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Password } from "@/components/Internal/PasswordInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingStore, AVAILABLE_MODELS, VISION_MODELS, TTS_VOICES } from "@/store/setting";
import locales from "@/constants/locales";
import { cn } from "@/utils/style";
import { CircleHelp, Settings, Sparkles, Volume2 } from "lucide-react";

type SettingProps = {
  open: boolean;
  onClose: () => void;
};

const BUILD_MODE = process.env.NEXT_PUBLIC_BUILD_MODE;
const VERSION = process.env.NEXT_PUBLIC_VERSION;

const formSchema = z.object({
  provider: z.string(),
  mode: z.string().optional(),
  model: z.enum(AVAILABLE_MODELS),
  visionModel: z.enum(VISION_MODELS),
  summaryModel: z.enum(AVAILABLE_MODELS),
  mindMapModel: z.enum(AVAILABLE_MODELS),
  adaptedTextModel: z.enum(AVAILABLE_MODELS),
  simplifyModel: z.enum(AVAILABLE_MODELS),
  readingTestModel: z.enum(AVAILABLE_MODELS),
  glossaryModel: z.enum(AVAILABLE_MODELS),
  sentenceAnalysisModel: z.enum(AVAILABLE_MODELS),
  ttsVoice: z.enum(TTS_VOICES),
  autoSpeakFlashcard: z.boolean().optional(),
  openAIApiKey: z.string().optional(),
  openAIApiProxy: z.string().optional(),
  openaicompatibleApiKey: z.string().optional(),
  openaicompatibleApiProxy: z.string().optional(),
  accessPassword: z.string().optional(),
  language: z.string().optional(),
  theme: z.string().optional(),
  debug: z.enum(["enable", "disable"]).optional(),
  smoothTextStreamType: z.enum(["character", "word", "line"]).optional(),
});

let preLoading = false;

function InfoTooltip({ content }: { content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen} disableHoverableContent>
        <TooltipTrigger asChild>
          <CircleHelp
            className="h-3.5 w-3.5 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Setting({ open, onClose }: SettingProps) {
  const { t } = useTranslation();
  const { mode, provider, update } = useSettingStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: async () => {
      return new Promise((resolve) => {
        const state = useSettingStore.getState();
        const rest = { ...state };
        delete (rest as any).update;
        resolve(rest as z.infer<typeof formSchema>);
      });
    },
  });

  function handleClose(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: z.infer<typeof formSchema>) {
    update(values);
    onClose();
  }

  function handleModeChange(mode: string) {
    update({ mode });
  }

  async function handleProviderChange(provider: string) {
    update({ provider });
  }

  async function updateSetting(key: string, value?: string | number | boolean) {
    update({ [key]: value });
  }

  function handleReset() {
    const { reset } = useSettingStore.getState();
    reset();
    form.reset();
  }

  useLayoutEffect(() => {
    if (open && !preLoading) {
      preLoading = true;
    }
  }, [open]);

  useLayoutEffect(() => {
    if (open && mode === "") {
      const { openAIApiKey, accessPassword, update } = useSettingStore.getState();
      const requestMode = !openAIApiKey && accessPassword ? "proxy" : "local";
      update({ mode: requestMode });
      form.setValue("mode", requestMode);
    }
  }, [open, mode, form]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md print:hidden">
        <DialogHeader>
          <DialogTitle>{t("setting.title")}</DialogTitle>
          <DialogDescription>{t("setting.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <div className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1 gap-1">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("setting.tabGeneral")}</span>
                </TabsTrigger>
                <TabsTrigger value="models" className="flex-1 gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("setting.tabModels")}</span>
                </TabsTrigger>
                <TabsTrigger value="tts" className="flex-1 gap-1">
                  <Volume2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("setting.tabTTS")}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className={BUILD_MODE === "export" ? "hidden" : ""}>
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem className="from-item">
                        <FormLabel className="from-label flex items-center gap-1">
                          {t("setting.mode")}
                          <InfoTooltip content={t("setting.modeTip")} />
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleModeChange(value);
                            }}
                          >
                            <SelectTrigger className="form-field">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">
                                {t("setting.local")}
                              </SelectItem>
                              <SelectItem value="proxy">
                                {t("setting.proxy")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.provider")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleProviderChange(value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openaicompatible">
                              OpenAI Compatible
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className={cn("space-y-4", { hidden: mode === "proxy" })}>
                  <div
                    className={cn("space-y-4", {
                      hidden: provider !== "openaicompatible",
                    })}
                  >
                    <FormField
                      control={form.control}
                      name="openaicompatibleApiKey"
                      render={({ field }) => (
                        <FormItem className="from-item">
                          <FormLabel className="from-label">
                            {t("setting.apiKeyLabel")}
                          </FormLabel>
                          <FormControl className="form-field">
                            <Password
                              type="text"
                              placeholder={t("setting.apiKeyPlaceholder")}
                              {...field}
                              onBlur={() =>
                                updateSetting("openaicompatibleApiKey", form.getValues("openaicompatibleApiKey"))
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("setting.apiKeyTipBefore")}
                    <a
                      href="https://api.mr5ai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      https://api.mr5ai.com
                    </a>
                    {t("setting.apiKeyTipAfter")}
                  </p>
                  <div
                    className={cn("space-y-4", {
                      hidden: provider !== "openaicompatible",
                    })}
                  >
                    <FormField
                      control={form.control}
                      name="openaicompatibleApiProxy"
                      render={({ field }) => (
                        <FormItem className="from-item">
                          <FormLabel className="from-label">
                            {t("setting.apiUrlLabel")}
                          </FormLabel>
                          <FormControl className="form-field">
                            <Input
                              placeholder={t("setting.apiUrlPlaceholder")}
                              {...field}
                              onBlur={() =>
                                updateSetting("openaicompatibleApiProxy", form.getValues("openaicompatibleApiProxy"))
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div
                  className={cn("space-y-4", {
                    hidden: mode === "local" || BUILD_MODE === "export",
                  })}
                >
                  <FormField
                    control={form.control}
                    name="accessPassword"
                    render={({ field }) => (
                      <FormItem className="from-item">
                        <FormLabel className="from-label flex items-center gap-1">
                          {t("setting.accessPassword")}
                          <InfoTooltip content={t("setting.accessPasswordTip")} />
                        </FormLabel>
                        <FormControl className="form-field">
                          <Password
                            type="text"
                            placeholder={t("setting.accessPasswordPlaceholder")}
                            {...field}
                            onBlur={() =>
                              updateSetting("accessPassword", form.getValues("accessPassword"))
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.language")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("language", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue placeholder={t("setting.system")} />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="system">{t("setting.system")}</SelectItem>
                             {Object.entries(locales).map(([key, value]) => (
                               <SelectItem key={key} value={key}>
                                 {value}
                               </SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.theme")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("theme", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">{t("setting.system")}</SelectItem>
                            <SelectItem value="light">{t("setting.light")}</SelectItem>
                            <SelectItem value="dark">{t("setting.dark")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="models" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
                <FormField
                  control={form.control}
                  name="visionModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.visionModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("visionModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VISION_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="summaryModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.summaryModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("summaryModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mindMapModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.mindMapModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("mindMapModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adaptedTextModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.adaptedTextModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("adaptedTextModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="simplifyModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.simplifyModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("simplifyModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="readingTestModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.readingTestModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("readingTestModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="glossaryModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.glossaryModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("glossaryModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sentenceAnalysisModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.sentenceAnalysisModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("sentenceAnalysisModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="tts" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="ttsVoice"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.ttsVoice")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("ttsVoice", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TTS_VOICES.map((voice) => (
                              <SelectItem key={voice} value={voice}>
                                {voice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autoSpeakFlashcard"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label flex items-center gap-1">
                        {t("setting.autoSpeakFlashcard")}
                        <InfoTooltip content={t("setting.autoSpeakFlashcardTip")} />
                      </FormLabel>
                      <FormControl>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={field.value}
                          onClick={() => {
                            const newValue = !field.value;
                            field.onChange(newValue);
                            updateSetting("autoSpeakFlashcard", newValue);
                          }}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            field.value ? "bg-primary" : "bg-input"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                              field.value ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

          </div>
        </Form>
        <DialogFooter className="flex-col gap-2">
          <Button type="button" className="w-full" onClick={form.handleSubmit(handleSubmit)}>
            {t("setting.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            {t("setting.resetAllSettings")}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {t("setting.version")}: v{VERSION}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Setting;
