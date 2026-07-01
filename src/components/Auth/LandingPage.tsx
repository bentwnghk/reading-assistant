"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import locales from "@/constants/locales";
import { resolveLanguagePreference } from "@/utils/i18n";
import { motion, useInView } from "motion/react";
import { ArrowRight, ArrowDown, Globe, Check, Plus, Minus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  HeroReadingMockup,
  UploadMockup,
  UnderstandMockup,
  AITutorMockup,
  PracticeMockup,
  MasterMockup,
  DashboardMockup,
  AssignmentsMockup,
  VocabularyMockup,
} from "@/components/Auth/landing/Mockups";
import { FeaturesShowcase } from "@/components/Auth/landing/FeaturesShowcase";

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

type ChapterProps = {
  num: string;
  eyebrow: string;
  title: string;
  lede: string;
  bullets: string[];
  mockup: React.ReactNode;
  flip?: boolean;
};

function Chapter({ num, eyebrow, title, lede, bullets, mockup, flip }: ChapterProps) {
  const text = (
    <div className="flex min-w-0 flex-col justify-center">
      <motion.div variants={fadeUp} className="mb-4 flex items-baseline gap-4">
        <span className="font-mono text-5xl font-light text-[var(--lp-accent)]/30 sm:text-6xl">{num}</span>
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--lp-accent)]">{eyebrow}</span>
      </motion.div>
      <motion.h3
        variants={fadeUp}
        className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-[var(--lp-ink)] sm:text-4xl"
        style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1' }}
      >
        {title}
      </motion.h3>
      <motion.p variants={fadeUp} className="mt-4 max-w-md text-base leading-relaxed text-[var(--lp-ink-soft)]">
        {lede}
      </motion.p>
      <motion.ul variants={fadeUp} className="mt-6 space-y-2.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--lp-ink)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
            <span>{b}</span>
          </li>
        ))}
      </motion.ul>
    </div>
  );

  const visual = (
    <motion.div variants={fadeUp} className={`min-w-0 ${flip ? "lg:order-first" : ""}`}>
      {mockup}
    </motion.div>
  );

  return (
    <Reveal className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {text}
      {visual}
    </Reveal>
  );
}

type FeatureBlockProps = {
  eyebrow: string;
  title: string;
  lede?: string;
  bullets: string[];
  mockup: React.ReactNode;
  flip?: boolean;
};

function FeatureBlock({ eyebrow, title, lede, bullets, mockup, flip }: FeatureBlockProps) {
  const text = (
    <div className="flex min-w-0 flex-col justify-center">
      <motion.div variants={fadeUp} className="mb-3 flex items-center gap-2.5">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--lp-accent)]">
          {eyebrow}
        </span>
      </motion.div>
      <motion.h3
        variants={fadeUp}
        className="font-display text-2xl font-semibold leading-[1.1] tracking-tight text-[var(--lp-ink)] sm:text-3xl"
        style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1' }}
      >
        {title}
      </motion.h3>
      {lede && (
        <motion.p variants={fadeUp} className="mt-3 max-w-md text-base leading-relaxed text-[var(--lp-ink-soft)]">
          {lede}
        </motion.p>
      )}
      <motion.ul variants={fadeUp} className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--lp-ink)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
            <span>{b}</span>
          </li>
        ))}
      </motion.ul>
    </div>
  );

  const visual = (
    <motion.div variants={fadeUp} className={`min-w-0 ${flip ? "lg:order-first" : ""}`}>
      {mockup}
    </motion.div>
  );

  return (
    <Reveal className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {text}
      {visual}
    </Reveal>
  );
}

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const { language, update } = useSettingStore();
  const [loading, setLoading] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google");
  };

  const handleLocaleChange = (locale: string) => {
    update({ language: locale });
    const resolvedLanguage = resolveLanguagePreference(locale);
    i18n.changeLanguage(resolvedLanguage);
    document.documentElement.setAttribute("lang", resolvedLanguage);
  };

  const chapters: Array<{ key: string; num: string; mockup: React.ReactNode; flip?: boolean }> = [
    { key: "encounter", num: "01", mockup: <UploadMockup /> },
    { key: "understand", num: "02", mockup: <UnderstandMockup />, flip: true },
    { key: "tutor", num: "03", mockup: <AITutorMockup /> },
    { key: "practice", num: "04", mockup: <PracticeMockup />, flip: true },
    {
      key: "master",
      num: "05",
      mockup: (
        <div className="flex flex-col gap-4">
          <MasterMockup />
          <VocabularyMockup />
        </div>
      ),
    },
  ];

  const faqCount = faqExpanded ? 10 : 5;

  return (
    <div className="min-h-screen bg-[var(--lp-paper)] text-[var(--lp-ink)] font-sans selection:bg-[var(--lp-highlight-soft)] overflow-x-hidden">
      {/* ── Top bar ── */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
        <span className="font-display text-lg font-semibold tracking-tight">
          Mr.<span className="align-middle text-2xl">🆖</span>{" "}
          <span className="text-[var(--lp-ink-soft)]">ProReader</span>
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-[var(--lp-ink-soft)] hover:text-[var(--lp-ink)]">
              <Globe className="h-5 w-5" />
              <span className="sr-only">{t("settings.language")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(locales).map(([code, name]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => handleLocaleChange(code)}
                className="flex items-center justify-between gap-4"
              >
                <span>{name}</span>
                {(language === code || (language === "system" && i18n.language === code)) && (
                  <Check className="h-4 w-4 text-[var(--lp-accent)]" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Hero ── */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-2 lg:gap-10 lg:pt-28">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.p
            variants={fadeUp}
            className="mb-6 font-mono text-xs uppercase tracking-[0.22em] text-[var(--lp-accent)]"
          >
            {t("header.about.tagline")}
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1' }}
          >
            {t("landing.hero.title")}{" "}
            <span className="lp-marker lp-marker--draw whitespace-nowrap font-semibold">{t("landing.hero.titleHighlight")}</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-md text-lg leading-relaxed text-[var(--lp-ink-soft)]">
            {t("header.about.description")}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--lp-accent)] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--lp-accent)]/20 transition-all hover:-translate-y-0.5 hover:bg-[var(--lp-accent-2)] active:translate-y-0 disabled:opacity-70"
            >
              {loading ? <SpinnerIcon /> : <GoogleIcon />}
              <span>{t("header.auth.signIn")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="#chapters"
              className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--lp-ink-soft)] transition-colors hover:text-[var(--lp-ink)]"
            >
              {t("landing.hero.seeItWork")}
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.3 }}
        >
          <HeroReadingMockup />
        </motion.div>
      </section>

      {/* ── Chapters ── */}
      <div id="chapters" className="mx-auto max-w-6xl px-6">
        <hr className="border-[var(--lp-rule)]" />
        <div className="space-y-24 py-20 sm:space-y-32 sm:py-28">
          {chapters.map((c) => (
            <Chapter
              key={c.key}
              num={c.num}
              eyebrow={t(`landing.chapters.${c.key}.eyebrow`)}
              title={t(`landing.chapters.${c.key}.title`)}
              lede={t(`landing.chapters.${c.key}.lede`)}
              bullets={t(`landing.chapters.${c.key}.bullets`, { returnObjects: true }) as string[]}
              mockup={c.mockup}
              flip={c.flip}
            />
          ))}
        </div>
        <hr className="border-[var(--lp-rule)]" />
      </div>

      {/* ── For classrooms & schools ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="rounded-3xl border border-[var(--lp-rule)] bg-[var(--lp-paper-2)] px-6 py-12 sm:px-12 sm:py-16">
          {/* shared section intro */}
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <motion.div variants={fadeUp} className="mb-3">
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--lp-accent)]">
                {t("landing.classrooms.eyebrow")}
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl"
              style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1' }}
            >
              {t("landing.classrooms.title")}
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--lp-ink-soft)]">
              {t("landing.classrooms.intro")}
            </motion.p>
            <motion.ul variants={fadeUp} className="mx-auto mt-6 grid max-w-lg gap-2.5 text-left sm:grid-cols-2">
              {(t(`landing.classrooms.bullets`, { returnObjects: true }) as string[]).map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--lp-ink)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
                  <span>{b}</span>
                </li>
              ))}
            </motion.ul>
          </Reveal>

          <div className="space-y-20">
            <FeatureBlock
              eyebrow={t("landing.classrooms.assignments.eyebrow")}
              title={t("landing.classrooms.assignments.title")}
              lede={t("landing.classrooms.assignments.lede")}
              bullets={t(`landing.classrooms.assignments.bullets`, { returnObjects: true }) as string[]}
              mockup={<AssignmentsMockup />}
            />
            <FeatureBlock
              eyebrow={t("landing.classrooms.insights.eyebrow")}
              title={t("landing.classrooms.insights.title")}
              lede={t("landing.classrooms.insights.lede")}
              bullets={t(`landing.classrooms.insights.bullets`, { returnObjects: true }) as string[]}
              mockup={<DashboardMockup />}
              flip
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <hr className="border-[var(--lp-rule)]" />
      </div>

      {/* ── Powerful features (collapsible) ── */}
      <FeaturesShowcase />

      <div className="mx-auto max-w-6xl px-6">
        <hr className="border-[var(--lp-rule)]" />
      </div>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <Reveal>
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1' }}
          >
            {t("header.about.faqs.title")}
          </motion.h2>
          <motion.div variants={fadeUp}>
            <Accordion type="single" collapsible className="space-y-3">
              {Array.from({ length: faqCount }, (_, i) => i + 1).map((n) => (
                <div key={n} className="rounded-xl border border-[var(--lp-rule)] bg-[var(--lp-surface)]">
                  <AccordionItem value={`faq-${n}`} className="border-b-0">
                    <AccordionTrigger className="px-5 py-4 text-left text-sm font-semibold hover:no-underline hover:text-[var(--lp-accent)]">
                      {t(`header.about.faqs.q${n}.q`)}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-[var(--lp-ink-soft)] [&_a]:text-[var(--lp-accent)] [&_strong]:text-[var(--lp-ink)] [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: t(`header.about.faqs.q${n}.a`) }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </div>
              ))}
            </Accordion>
            <div className="mt-6 text-center">
              <button
                onClick={() => setFaqExpanded((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lp-rule)] px-4 py-2 text-xs font-medium text-[var(--lp-ink-soft)] transition-colors hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]"
              >
                {faqExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {faqExpanded ? t("landing.faq.fewer") : t("landing.faq.more")}
              </button>
            </div>
          </motion.div>
        </Reveal>
      </section>

      {/* ── Final CTA ── */}
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-center">
        <Reveal>
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
            style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1' }}
          >
            {t("landing.hero.finalTitle")}
          </motion.h2>
          <motion.div variants={fadeUp} className="mt-8">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--lp-accent)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[var(--lp-accent)]/20 transition-all hover:-translate-y-0.5 hover:bg-[var(--lp-accent-2)] active:translate-y-0 disabled:opacity-70"
            >
              {loading ? <SpinnerIcon /> : <GoogleIcon />}
              <span>{t("header.auth.signIn")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--lp-ink-soft)]"
          >
            {t("header.about.builtWith")}
          </motion.p>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--lp-rule)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 py-8 text-xs text-[var(--lp-ink-soft)]">
          <Link href="/terms-of-service" className="transition-colors hover:text-[var(--lp-ink)]">
            {t("termsOfService")}
          </Link>
          <span>·</span>
          <Link href="/privacy-policy" className="transition-colors hover:text-[var(--lp-ink)]">
            {t("privacyPolicy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
