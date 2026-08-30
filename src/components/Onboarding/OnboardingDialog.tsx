"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Crown,
  Gauge,
  Gift,
  GraduationCap,
  KeyRound,
  Loader2,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import PricingCards from "@/components/Subscription/PricingCards";
import { useSettingStore, enforceRestrictedModels } from "@/store/setting";
import { useGlobalStore } from "@/store/global";
import { useReadingStore } from "@/store/reading";
import useSubscription from "@/hooks/useSubscription";
import useSchoolSubscription from "@/hooks/useSchoolSubscription";
import type { SubscriptionPlan } from "@/lib/subscription";
import { cn } from "@/utils/style";

type OnboardingStep = "choice" | "subscription" | "free" | "meter" | "done";

// Session-scope dismissal (module-level, resets on full reload): skip/X/ESC must
// not persist hasCompletedOnboarding, but still has to stop the auto-open
// effect from immediately re-showing the dialog in the same SPA session.
let _onboardingDismissed = false;
function setOnboardingDismissed(value: boolean) {
  _onboardingDismissed = value;
}
function isOnboardingDismissed() {
  return _onboardingDismissed;
}

function OptionCard({
  icon: Icon,
  title,
  desc,
  badge,
  trialText,
  bgClass,
  iconClass,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  badge?: string;
  trialText?: string | null;
  bgClass: string;
  iconClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-3.5 flex items-start gap-3 transition-colors",
        "hover:border-primary/60 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div
        className={cn(
          "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          bgClass,
        )}
      >
        <Icon className={cn("h-5 w-5", iconClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-sm">{title}</h4>
          {badge && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {desc}
        </p>
        {trialText && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-1">
            <Gift className="h-3.5 w-3.5 shrink-0" />
            <span>{trialText}</span>
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />
    </button>
  );
}

function NextStepCard({
  icon: Icon,
  bgClass,
  iconClass,
  title,
  desc,
}: {
  icon: React.ElementType;
  bgClass: string;
  iconClass: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          bgClass,
        )}
      >
        <Icon className={cn("h-5 w-5", iconClass)} />
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

function StepDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === active ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function OnboardingDialog() {
  const { t } = useTranslation();
  const { data: sessionData } = useSession();
  const { openaicompatibleApiKey, accessPassword, freeAccessGranted, authDataLoaded, update } = useSettingStore();
  const { hasCompletedOnboarding, setHasCompletedOnboarding, setOpenSetting } =
    useGlobalStore();
  const {
    subscription: personalSub,
    loading: personalLoading,
    createCheckout,
  } = useSubscription();
  const { subscription: schoolSub, loading: schoolLoading } =
    useSchoolSubscription();
  const [isHydrated, setIsHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("choice");
  const [passwordValue, setPasswordValue] = useState("");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [pricingInfo, setPricingInfo] = useState<{
    monthly: number;
    currency: string;
    trialPeriodDays: number;
  } | null>(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  const role = sessionData?.user?.role;
  const isEducator = role === "teacher" || role === "admin" || role === "super-admin";

  useEffect(() => {
    const unsubHydrate = useSettingStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    if (useSettingStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }
    return unsubHydrate;
  }, []);

  const hasActivePersonalSub = personalSub?.hasSubscription ?? false;
  const hasActiveSchoolSub = schoolSub?.hasSubscription ?? false;
  const needsSetup = !(
    hasActivePersonalSub ||
    hasActiveSchoolSub ||
    openaicompatibleApiKey ||
    accessPassword ||
    freeAccessGranted
  );

  useEffect(() => {
    if (open || hasCompletedOnboarding || !isHydrated) return;
    if (isOnboardingDismissed()) return;
    if (personalLoading || schoolLoading) return;
    // Wait for AuthProvider's sign-in sequence (server settings + free-access
    // ticket) to settle — otherwise whitelisted users get a setup flash.
    if (!authDataLoaded) return;
    if (!needsSetup) {
      setHasCompletedOnboarding(true);
      return;
    }
    if (useReadingStore.getState().id) return;
    setOpen(true);
  }, [
    open,
    hasCompletedOnboarding,
    isHydrated,
    personalLoading,
    schoolLoading,
    authDataLoaded,
    needsSetup,
    setHasCompletedOnboarding,
  ]);

  useEffect(() => {
    if (!open || pricingLoaded) return;
    fetch("/api/subscription/pricing")
      .then((r) => r.json())
      .then((data) => {
        if (data.monthly) {
          setPricingInfo({
            monthly:
              typeof data.monthly === "number" ? data.monthly : data.monthly.amount,
            currency: data.monthly.currency || data.currency || "usd",
            trialPeriodDays: data.trialPeriodDays || 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setPricingLoaded(true));
  }, [open, pricingLoaded]);

  function complete() {
    setHasCompletedOnboarding(true);
  }

  function handleOpenChange(next: boolean) {
    if (!next) setOnboardingDismissed(true);
    setOpen(next);
  }

  function handleSkip() {
    setOnboardingDismissed(true);
    setOpen(false);
  }

  function handleSelectPlan(plan: SubscriptionPlan) {
    complete();
    createCheckout(plan);
  }

  function handleOpenSettings(mode: "subscription" | "proxy" | "local") {
    update({ mode });
    enforceRestrictedModels(role);
    useSettingStore.getState().syncNow();
    complete();
    setOpen(false);
    setOpenSetting(true);
  }

  function handleSaveCredential(kind: "free" | "meter") {
    const value = (kind === "free" ? passwordValue : apiKeyValue).trim();
    if (!value) return;
    if (kind === "free") {
      update({ mode: "proxy", accessPassword: value });
    } else {
      update({ mode: "local", openaicompatibleApiKey: value });
    }
    enforceRestrictedModels(role);
    useSettingStore.getState().syncNow();
    complete();
    setStep("done");
    toast.success(
      kind === "free" ? t("onboarding.free.saved") : t("onboarding.meter.saved"),
    );
  }

  function handleStartReading() {
    complete();
    setOpen(false);
  }

  const stepIndex =
    step === "choice" ? 0 : step === "done" ? 2 : 1;
  const showBack = step === "subscription" || step === "free" || step === "meter";

  const trialPeriodDays = pricingInfo?.trialPeriodDays ?? 0;
  const subscriptionTrialText =
    !personalLoading &&
    personalSub?.trialEligible !== false &&
    trialPeriodDays > 0
      ? trialPeriodDays === 1
        ? t("subscription.trialPeriodOneDay")
        : t("subscription.trialPeriod", { days: trialPeriodDays })
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            {step === "done" ? t("onboarding.done.title") : t("onboarding.title")}
          </DialogTitle>
          <DialogDescription>
            {step === "choice" && t("onboarding.subtitle")}
            {step === "subscription" && t("onboarding.subscription.subtitle")}
            {step === "free" && t("onboarding.free.subtitle")}
            {step === "meter" && t("onboarding.meter.subtitle")}
            {step === "done" && t("onboarding.done.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {step === "choice" && (
          <div className="space-y-3">
            <OptionCard
              icon={Crown}
              title={t("onboarding.choice.subscription.title")}
              desc={t("onboarding.choice.subscription.desc")}
              badge={t("onboarding.choice.badgeRecommended")}
              trialText={subscriptionTrialText}
              bgClass="bg-blue-100 dark:bg-blue-900/40"
              iconClass="text-blue-600 dark:text-blue-400"
              onClick={() => setStep("subscription")}
            />
            <OptionCard
              icon={KeyRound}
              title={t("onboarding.choice.free.title")}
              desc={t("onboarding.choice.free.desc")}
              bgClass="bg-emerald-100 dark:bg-emerald-900/40"
              iconClass="text-emerald-600 dark:text-emerald-400"
              onClick={() => setStep("free")}
            />
            <OptionCard
              icon={Gauge}
              title={t("onboarding.choice.meter.title")}
              desc={t("onboarding.choice.meter.desc")}
              bgClass="bg-amber-100 dark:bg-amber-900/40"
              iconClass="text-amber-600 dark:text-amber-400"
              onClick={() => setStep("meter")}
            />
          </div>
        )}

        {step === "subscription" && (
          <div className="space-y-4">
            {isEducator && (
              <div className="rounded-lg border border-border p-3 space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm">
                      {t("onboarding.subscription.schoolTitle")}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {t("onboarding.subscription.schoolDesc")}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOpenSettings("subscription")}
                >
                  {t("onboarding.subscription.schoolCta")}
                </Button>
              </div>
            )}
            <div className="space-y-1">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("onboarding.subscription.personalTitle")}
              </h4>
              {personalLoading || !pricingLoaded ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pricingInfo ? (
                <PricingCards
                  monthlyPrice={pricingInfo.monthly}
                  currency={pricingInfo.currency}
                  trialPeriodDays={pricingInfo.trialPeriodDays || undefined}
                  trialEligible={personalSub?.trialEligible}
                  onSelect={handleSelectPlan}
                />
              ) : (
                <div className="rounded-lg border border-border p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t("onboarding.subscription.unavailable")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenSettings("subscription")}
                  >
                    {t("settingsBanner.openSettings")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "free" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="onboarding-access-password"
                className="text-sm font-medium"
              >
                {t("onboarding.free.label")}
              </label>
              <Input
                id="onboarding-access-password"
                type="password"
                autoComplete="off"
                placeholder={t("onboarding.free.placeholder")}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCredential("free");
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t("onboarding.free.hint")}
              </p>
            </div>
          </div>
        )}

        {step === "meter" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="onboarding-api-key" className="text-sm font-medium">
                {t("onboarding.meter.label")}
              </label>
              <Input
                id="onboarding-api-key"
                type="password"
                autoComplete="off"
                placeholder={t("onboarding.meter.placeholder")}
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCredential("meter");
                }}
              />
              <p className="text-xs text-muted-foreground">
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
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex justify-center pt-1">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center animate-in zoom-in-50 duration-300">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <NextStepCard
                icon={Upload}
                bgClass="bg-blue-100 dark:bg-blue-900/40"
                iconClass="text-blue-600 dark:text-blue-400"
                title={t("onboarding.done.upload.title")}
                desc={t("onboarding.done.upload.desc")}
              />
              <NextStepCard
                icon={BookOpen}
                bgClass="bg-emerald-100 dark:bg-emerald-900/40"
                iconClass="text-emerald-600 dark:text-emerald-400"
                title={t("onboarding.done.features.title")}
                desc={t("onboarding.done.features.desc")}
              />
              <NextStepCard
                icon={Settings}
                bgClass="bg-purple-100 dark:bg-purple-900/40"
                iconClass="text-purple-600 dark:text-purple-400"
                title={t("onboarding.done.settings.title")}
                desc={t("onboarding.done.settings.desc")}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex-1">
            {step === "choice" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleSkip}
              >
                {t("onboarding.skip")}
              </Button>
            )}
            {showBack && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setStep("choice")}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("onboarding.back")}
              </Button>
            )}
          </div>
          <div className="flex-1 flex justify-center">
            <StepDots total={3} active={stepIndex} />
          </div>
          <div className="flex-1 flex justify-end">
            {step === "done" && (
              <Button type="button" size="sm" onClick={handleStartReading}>
                {t("onboarding.startReading")}
              </Button>
            )}
            {(step === "free" || step === "meter") && (
              <Button
                type="button"
                size="sm"
                disabled={(step === "free" ? passwordValue : apiKeyValue).trim() === ""}
                onClick={() =>
                  handleSaveCredential(step === "free" ? "free" : "meter")
                }
              >
                {t("onboarding.save")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {(step === "subscription" || step === "free" || step === "meter") && (
          <p className="text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={() =>
                handleOpenSettings(
                  step === "subscription"
                    ? "subscription"
                    : step === "free"
                      ? "proxy"
                      : "local",
                )
              }
            >
              {t("onboarding.openSettingsHint")}
            </button>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingDialog;
