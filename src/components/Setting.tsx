"use client";
import {
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
import { useSettingStore } from "@/store/setting";
import { OPENAI_BASE_URL } from "@/constants/urls";
import locales from "@/constants/locales";
import { cn } from "@/utils/style";

type SettingProps = {
  open: boolean;
  onClose: () => void;
};

const BUILD_MODE = process.env.NEXT_PUBLIC_BUILD_MODE;
const VERSION = process.env.NEXT_PUBLIC_VERSION;

const formSchema = z.object({
  provider: z.string(),
  mode: z.string().optional(),
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

  async function updateSetting(key: string, value?: string | number) {
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
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className={BUILD_MODE === "export" ? "hidden" : ""}>
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem className="from-item">
                    <FormLabel className="from-label">
                      {t("setting.mode")}
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
                        <SelectItem value="openai">OpenAI</SelectItem>
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
                  hidden: provider !== "openai",
                })}
              >
                <FormField
                  control={form.control}
                  name="openAIApiKey"
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
                            updateSetting("openAIApiKey", form.getValues("openAIApiKey"))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="openAIApiProxy"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="from-label">
                        {t("setting.apiUrlLabel")}
                      </FormLabel>
                      <FormControl className="form-field">
                        <Input
                          placeholder={OPENAI_BASE_URL}
                          {...field}
                          onBlur={() =>
                            updateSetting("openAIApiProxy", form.getValues("openAIApiProxy"))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
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
                    <FormLabel className="from-label">
                      {t("setting.accessPassword")}
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
                        <SelectItem value="">{t("setting.system")}</SelectItem>
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
              <p className="text-xs text-center text-muted-foreground">
                {t("setting.version")}: v{VERSION}
              </p>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default Setting;
