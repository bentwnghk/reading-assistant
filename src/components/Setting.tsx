"use client";
import {
  useState,
  useEffect,
  useLayoutEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingStore, AVAILABLE_MODELS, VISION_MODELS, IMAGE_MODELS, RESTRICTED_IMAGE_MODELS, TUTOR_MODELS, BASIC_TUTOR_MODELS, READING_TEXT_MODELS, TTS_VOICES, TTS_VOICE_LABELS, TTS_PLAYBACK_RATES, RESTRICTED_MODELS, RESTRICTED_TUTOR_MODELS, RESTRICTED_MODEL_FIELD_NAMES, enforceRestrictedModels } from "@/store/setting";
import locales from "@/constants/locales";
import { cn } from "@/utils/style";
import { CircleHelp, Settings, Sparkles, Volume2, Bell, Trash2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import ReminderPreferences from "@/components/ReminderPreferences";
import SubscriptionPanel from "@/components/Subscription/SubscriptionPanel";
import SchoolSubscriptionPanel from "@/components/Subscription/SchoolSubscriptionPanel";
import useSchoolSubscription from "@/hooks/useSchoolSubscription";
import i18n, { resolveLanguagePreference } from "@/utils/i18n";

type SettingProps = {
  open: boolean;
  onClose: () => void;
};

const BUILD_MODE = process.env.NEXT_PUBLIC_BUILD_MODE;

const formSchema = z.object({
  provider: z.string(),
  mode: z.enum(["local", "proxy", "subscription"]).optional(),
  visionModel: z.enum(VISION_MODELS),
  imageModel: z.enum(IMAGE_MODELS),
  prereadingModel: z.enum(AVAILABLE_MODELS),
  summaryModel: z.enum(AVAILABLE_MODELS),
  mindMapModel: z.enum(AVAILABLE_MODELS),
  adaptedTextModel: z.enum(AVAILABLE_MODELS),
  simplifyModel: z.enum(AVAILABLE_MODELS),
  readingTestModel: z.enum(AVAILABLE_MODELS),
  glossaryModel: z.enum(AVAILABLE_MODELS),
  suggestVocabModel: z.enum(AVAILABLE_MODELS),
  sentenceAnalysisModel: z.enum(AVAILABLE_MODELS),
  collocationModel: z.enum(AVAILABLE_MODELS),
  grammarModel: z.enum(AVAILABLE_MODELS),
  readingTextModel: z.enum(READING_TEXT_MODELS),
  tutorModel: z.enum(TUTOR_MODELS),
  basicTutorModel: z.enum(BASIC_TUTOR_MODELS),
  ttsVoice: z.enum(TTS_VOICES),
  ttsPlaybackRate: z.union([z.literal(0.25), z.literal(0.5), z.literal(0.75), z.literal(1.0)]),
  autoSpeakFlashcard: z.boolean().optional(),
  gameSoundEffects: z.boolean().optional(),
  cheatMode: z.boolean().optional(),
  showGiveAnswer: z.boolean().optional(),
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
        <TooltipContent className="max-w-64">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Setting({ open, onClose }: SettingProps) {
  const { t } = useTranslation();
  const { mode, provider, freeAccessGranted, update } = useSettingStore();
  const { status: authStatus, data: sessionData } = useSession();
  const isAuthenticated = authStatus === "authenticated";
  const [pricingInfo, setPricingInfo] = useState<{ monthly: number; currency: string; trialPeriodDays: number } | null>(null);
  const [schoolPricingInfo, setSchoolPricingInfo] = useState<{ monthly: number; currency: string; trialPeriodDays: number } | null>(null);
  const { subscription: schoolSub } = useSchoolSubscription();
  const hasActiveSchoolSubscription =
    schoolSub?.hasSubscription === true &&
    (schoolSub.status === "active" || schoolSub.status === "trialing");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Restricted preview models are only visible to super-admins and
  // meter-billing (local mode) users; hidden from everyone else's dropdowns.
  const showRestrictedModels =
    sessionData?.user?.role === "super-admin" || mode === "local";
  const availableModelOptions = showRestrictedModels
    ? AVAILABLE_MODELS
    : AVAILABLE_MODELS.filter((m) => !RESTRICTED_MODELS.includes(m));
  const readingTextModelOptions = showRestrictedModels
    ? READING_TEXT_MODELS
    : READING_TEXT_MODELS.filter((m) => !RESTRICTED_MODELS.includes(m));
  const tutorModelOptions = showRestrictedModels
    ? TUTOR_MODELS
    : TUTOR_MODELS.filter((m) => !RESTRICTED_TUTOR_MODELS.includes(m));
  // The premium image model is only selectable by admins/super-admins and
  // meter-billing (mode "local") users.
  const isAdminRole =
    sessionData?.user?.role === "admin" ||
    sessionData?.user?.role === "super-admin";
  const imageModelOptions =
    isAdminRole || mode === "local"
      ? IMAGE_MODELS
      : IMAGE_MODELS.filter((m) => !RESTRICTED_IMAGE_MODELS.includes(m));

  useEffect(() => {
    fetch("/api/subscription/pricing")
      .then((r) => r.json())
      .then((data) => {
        if (data.monthly) {
          setPricingInfo({
            monthly: typeof data.monthly === "number" ? data.monthly : data.monthly.amount,
            currency: data.monthly.currency || data.currency || "usd",
            trialPeriodDays: data.trialPeriodDays || 0,
          });
        }
        if (data.schoolMonthly) {
          setSchoolPricingInfo({
            monthly: typeof data.schoolMonthly === "number" ? data.schoolMonthly : data.schoolMonthly.amount,
            currency: data.schoolMonthly.currency || data.currency || "usd",
            trialPeriodDays: data.schoolTrialPeriodDays || 0,
          });
        } else if (data.monthly) {
          setSchoolPricingInfo({
            monthly: typeof data.monthly === "number" ? data.monthly : data.monthly.amount,
            currency: data.monthly.currency || data.currency || "usd",
            trialPeriodDays: data.schoolTrialPeriodDays || data.trialPeriodDays || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  function getFormValues(): z.infer<typeof formSchema> {
    const state = useSettingStore.getState();
    const { update: _u, reset: _r, loadFromServer: _l, ...rest } = state;
    return rest as z.infer<typeof formSchema>;
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getFormValues(),
  });

  // Reset the form from the store every time the dialog opens so that
  // server-loaded settings (from AuthProvider → loadFromServer) are
  // always reflected, regardless of when they arrived relative to mount.
  useEffect(() => {
    if (open) {
      enforceRestrictedModels(sessionData?.user?.role);
      form.reset(getFormValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: z.infer<typeof formSchema>) {
    update(values);
    useSettingStore.getState().syncNow();
    onClose();
  }

  function handleModeChange(mode: string) {
    update({ mode: mode as import("@/store/setting").ApiMode });
    // Leaving meter billing revokes restricted models for non-super-admins;
    // reset any such selections in both the store and the open form.
    const resets = enforceRestrictedModels(sessionData?.user?.role);
    for (const field of RESTRICTED_MODEL_FIELD_NAMES) {
      const value = resets[field];
      if (value !== undefined) {
        form.setValue(field, value);
      }
    }
  }

  async function handleProviderChange(provider: string) {
    update({ provider });
  }

  async function updateSetting(key: string, value?: string | number | boolean) {
    update({ [key]: value });
    if (key === "language" && typeof value === "string") {
      localStorage.setItem("language", value);
      const resolvedLanguage = resolveLanguagePreference(value);
      i18n.changeLanguage(resolvedLanguage);
      document.documentElement.setAttribute("lang", resolvedLanguage);
    }
  }

  function handleReset() {
    const { reset } = useSettingStore.getState();
    reset();
    form.reset();
  }

  async function handleDeleteAccount() {
    if (!sessionData?.user?.email) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          toast.error(t("setting.deleteAccountSuperAdmin"));
        } else {
          toast.error(data.error || t("setting.deleteAccountError"));
        }
        return;
      }
      toast.success(t("setting.deleteAccountSuccess"));
      signOut({ callbackUrl: "/" });
    } catch {
      toast.error(t("setting.deleteAccountError"));
    } finally {
      setIsDeleting(false);
    }
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
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full h-auto">
                <TabsTrigger value="general" className="flex-1 gap-1 whitespace-normal">
                  <Settings className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("setting.tabGeneral")}</span>
                </TabsTrigger>
                <TabsTrigger value="models" className="flex-1 gap-1 whitespace-normal">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("setting.tabModels")}</span>
                </TabsTrigger>
                <TabsTrigger value="tts" className="flex-1 gap-1 whitespace-normal">
                  <Volume2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("setting.tabTTS")}</span>
                </TabsTrigger>
                {isAuthenticated && (
                  <TabsTrigger value="notifications" className="flex-1 gap-1 whitespace-normal">
                    <Bell className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("reminder.tabNotifications")}</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
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
                              <SelectItem value="subscription">
                                {t("setting.subscription")}
                              </SelectItem>
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
                              Mr.🆖 AI Hub
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className={cn("space-y-4", { hidden: mode === "proxy" || mode === "subscription" })}>
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
                            <Input
                              type="password"
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
                              readOnly
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
                    hidden: mode === "local" || mode === "subscription" || BUILD_MODE === "export",
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
                        <div className="col-span-3 lg:col-span-4 space-y-1">
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t("setting.accessPasswordPlaceholder")}
                              {...field}
                              onBlur={() =>
                                updateSetting("accessPassword", form.getValues("accessPassword"))
                              }
                            />
                          </FormControl>
                          {freeAccessGranted && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              {t("setting.freeAccessNotice")}
                            </p>
                          )}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div
                  className={cn("space-y-4", {
                    hidden: mode !== "subscription",
                  })}
                >
                  {!isAuthenticated ? (
                    <div className="rounded-lg border border-border bg-muted/50 p-4 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {t("subscription.signInPrompt")}
                      </p>
                    </div>
                  ) : (
                    <>
                      {schoolPricingInfo && (
                        <SchoolSubscriptionPanel
                          monthlyPrice={schoolPricingInfo.monthly}
                          currency={schoolPricingInfo.currency}
                          trialPeriodDays={schoolPricingInfo.trialPeriodDays || undefined}
                        />
                      )}
                      {pricingInfo && (
                        <SubscriptionPanel
                          monthlyPrice={pricingInfo.monthly}
                          currency={pricingInfo.currency}
                          trialPeriodDays={pricingInfo.trialPeriodDays || undefined}
                          disabled={hasActiveSchoolSubscription}
                        />
                      )}
                    </>
                  )}
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
                <FormField
                  control={form.control}
                  name="cheatMode"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label flex items-center gap-1">
                        {t("setting.cheatMode")}
                        <InfoTooltip content={t("setting.cheatModeTip")} />
                      </FormLabel>
                      <FormControl>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={field.value}
                          onClick={() => {
                            const newValue = !field.value;
                            field.onChange(newValue);
                            updateSetting("cheatMode", newValue);
                            if (!newValue) {
                              updateSetting("showGiveAnswer", false);
                              form.setValue("showGiveAnswer", false);
                            }
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
                <FormField
                  control={form.control}
                  name="showGiveAnswer"
                  render={({ field }) => {
                    const cheatModeValue = form.watch("cheatMode");
                    return (
                      <FormItem className="from-item">
                        <FormLabel className="from-label flex items-center gap-1">
                          {t("setting.showGiveAnswer")}
                          <InfoTooltip content={t("setting.showGiveAnswerTip")} />
                        </FormLabel>
                        <FormControl>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={field.value}
                            disabled={!cheatModeValue}
                            onClick={() => {
                              if (!cheatModeValue) return;
                              const newValue = !field.value;
                              field.onChange(newValue);
                              updateSetting("showGiveAnswer", newValue);
                            }}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              cheatModeValue
                                ? "cursor-pointer"
                                : "cursor-not-allowed opacity-50",
                              field.value && cheatModeValue ? "bg-primary" : "bg-input"
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
                    );
                  }}
                />
                {isAuthenticated && sessionData?.user?.role !== "super-admin" && (
                  <div className="rounded-lg border border-destructive/50 p-4 space-y-3">
                    <h3 className="text-sm font-medium text-destructive">
                      {t("setting.dangerZone")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("setting.deleteAccountDescription")}
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteConfirmEmail("");
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("setting.deleteAccount")}
                    </Button>
                  </div>
                )}
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
                  name="imageModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.imageModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("imageModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {imageModelOptions.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                            {/* Keep the current value listed (disabled) when
                                it's filtered out for this role, so the Select
                                still renders the active model correctly. */}
                            {field.value &&
                              !imageModelOptions.includes(field.value) && (
                                <SelectItem
                                  key={field.value}
                                  value={field.value}
                                  disabled
                                >
                                  {field.value}
                                </SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prereadingModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.prereadingModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("prereadingModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModelOptions.map((m) => (
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
                            {availableModelOptions.map((m) => (
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
                            {availableModelOptions.map((m) => (
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
                            {availableModelOptions.map((m) => (
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
                            {availableModelOptions.map((m) => (
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
                            {availableModelOptions.map((m) => (
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
                            {availableModelOptions.map((m) => (
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
                  name="suggestVocabModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.suggestVocabModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("suggestVocabModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModelOptions.map((m) => (
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
                  name="collocationModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.collocationModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("collocationModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModelOptions.map((m) => (
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
                            {availableModelOptions.map((m) => (
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
                  name="grammarModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.grammarModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("grammarModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModelOptions.map((m) => (
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
                  name="readingTextModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.readingTextModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("readingTextModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {readingTextModelOptions.map((m) => (
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
                  name="basicTutorModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.basicTutorModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("basicTutorModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BASIC_TUTOR_MODELS.map((m) => (
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
                  name="tutorModel"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.tutorModel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateSetting("tutorModel", value);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tutorModelOptions.map((m) => (
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

              <TabsContent value="tts" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
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
                                {TTS_VOICE_LABELS[voice]}
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
                  name="ttsPlaybackRate"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.ttsPlaybackRate")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={String(field.value)}
                          onValueChange={(value) => {
                            const numValue = parseFloat(value) as import("@/store/setting").TTSPlaybackRate;
                            field.onChange(numValue);
                            updateSetting("ttsPlaybackRate", numValue);
                          }}
                        >
                          <SelectTrigger className="form-field">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TTS_PLAYBACK_RATES.map((rate) => (
                              <SelectItem key={rate} value={String(rate)}>
                                {rate}x
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
                <FormField
                  control={form.control}
                  name="gameSoundEffects"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label flex items-center gap-1">
                        {t("setting.gameSoundEffects")}
                        <InfoTooltip content={t("setting.gameSoundEffectsTip")} />
                      </FormLabel>
                      <FormControl>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={field.value}
                          onClick={() => {
                            const newValue = !field.value;
                            field.onChange(newValue);
                            updateSetting("gameSoundEffects", newValue);
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

              {isAuthenticated && (
                <TabsContent value="notifications" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
                  <ReminderPreferences />
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter className="flex-col gap-2">
              <Button type="submit" className="w-full">
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("setting.deleteAccount")}</DialogTitle>
            <DialogDescription>
              {t("setting.deleteAccountDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("setting.deleteAccountConfirmLabel")}
              </label>
              <Input
                type="email"
                placeholder={t("setting.deleteAccountConfirmPlaceholder")}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={
                isDeleting ||
                deleteConfirmEmail.toLowerCase() !==
                  (sessionData?.user?.email ?? "").toLowerCase()
              }
              onClick={handleDeleteAccount}
            >
              {isDeleting
                ? "..."
                : t("setting.deleteAccountButton")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("setting.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default Setting;
