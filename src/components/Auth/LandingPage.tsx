"use client";

import { useState, useRef, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import locales from "@/constants/locales";
import { motion, useInView } from "motion/react";
import {
  BookCopy,
  Target,
  Trophy,
  Cloud,
  Sparkles,
  Star,
  Camera,
  Brain,
  PenTool,
  Volume2,
  Gamepad2,
  Layers,
  ClipboardList,
  Upload,
  FileText,
  MessageSquareText,
  Zap,
  BookOpen,
  MessageCircle,
  BarChart3,
  Highlighter,
  Download,
  Rocket,
  CheckCircle2,
  School,
  Crown,
  GraduationCap,
  Users,
  ArrowRight,
  Globe,
  Check,
  Medal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const sectionVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeOut },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: easeOut },
  },
};

const sectionTitleVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

const pillVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

function gridContainer(stagger: number) {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };
}

function AnimatedSection({
  children,
  className,
  staggerDelay = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{ ...sectionVariants, visible: { transition: { staggerChildren: staggerDelay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GalaxyBackground() {
  const { stars, lines } = useMemo(() => {
    const s: { x: number; y: number; r: number; o: number }[] = [];
    for (let i = 0; i < 140; i++) {
      s.push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        r: Math.random() * 2.5 + 1,
        o: Math.random() * 0.5 + 0.15,
      });
    }
    const l: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
    const maxDist = 200;
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        const dx = s[i].x - s[j].x;
        const dy = s[i].y - s[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          l.push({
            x1: s[i].x,
            y1: s[i].y,
            x2: s[j].x,
            y2: s[j].y,
            o: (1 - d / maxDist) * 0.3,
          });
        }
      }
    }
    return { stars: s, lines: l };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <svg
        className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] animate-float-3 opacity-100 dark:opacity-70"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        {lines.map((line, i) => (
          <line
            key={`l${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeWidth={1}
            opacity={line.o}
            className="text-emerald-500 dark:text-emerald-400"
          />
        ))}
        {stars.map((star, i) => (
          <circle
            key={`s${i}`}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="currentColor"
            opacity={star.o}
            className="text-emerald-400 dark:text-emerald-300"
          />
        ))}
      </svg>
    </div>
  );
}

function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""}`}>
      <svg
        className="w-full h-[60px] sm:h-[80px]"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,80 1440,60 L1440,120 L0,120 Z"
          className="fill-white/30 dark:fill-slate-900/30"
        />
        <path
          d="M0,80 C240,40 480,100 720,60 C960,20 1200,100 1440,80 L1440,120 L0,120 Z"
          className="fill-[#FDFBF7]/50 dark:fill-[#0D1117]/50"
        />
      </svg>
    </div>
  );
}

const glassBase = "bg-white/[0.08] dark:bg-white/[0.02] backdrop-blur-xl border border-white/[0.15] dark:border-white/[0.05] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]";
const glassCard = `${glassBase} bg-emerald-50/[0.05] dark:bg-emerald-900/[0.04]`;

function GoogleIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const { language, update } = useSettingStore();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google");
  };

  const handleLocaleChange = (locale: string) => {
    update({ language: locale });
    i18n.changeLanguage(locale);
    document.documentElement.setAttribute("lang", locale);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0D1117] text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-200 dark:selection:bg-emerald-900 overflow-hidden">
      <GalaxyBackground />

      {/* Locale Switcher */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`${glassBase} hover:bg-white/20 dark:hover:bg-white/[0.06]`}
            >
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
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hero Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
        className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 sm:pt-40 sm:pb-32 flex flex-col items-center text-center"
      >
        <motion.div
          variants={heroItemVariants}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${glassCard} mb-8 hover:scale-105 transition-transform cursor-default`}
        >
          <BookCopy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium tracking-wide uppercase text-slate-600 dark:text-slate-300">
            {t("header.about.tagline")}
          </span>
        </motion.div>

        <motion.h1
          variants={heroItemVariants}
          className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl text-slate-900 dark:text-white leading-[1.1]"
        >
          <span className="inline-block hover:-translate-y-2 transition-transform duration-300">Mr.</span>
          <span className="inline-block mx-2 rotate-12 hover:rotate-0 transition-transform duration-300 text-5xl sm:text-7xl">🆖</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-300 animate-gradient-shift">
            ProReader
          </span>
        </motion.h1>

        <motion.p
          variants={heroItemVariants}
          className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed font-medium"
        >
          {t("header.about.description")}
        </motion.p>

        <motion.button
          variants={heroItemVariants}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignIn}
          disabled={loading}
          className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300
            bg-slate-900 dark:bg-white text-white dark:text-slate-900
            hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]
            disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          {loading ? <SpinnerIcon /> : <GoogleIcon />}
          <span>{loading ? t("header.auth.loading") : t("header.auth.signIn")}</span>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>

      {/* Why You'll Love It - Glassmorphism Grid */}
      <AnimatedSection className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-12">
          <Star className="h-6 w-6 text-amber-500" />
          <h2 className="text-3xl font-bold tracking-tight">{t("header.about.whyLove.title")}</h2>
        </motion.div>
        <motion.div variants={gridContainer(0.12)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Target, Watermark: Target, title: "personalized", desc: "personalized", color: "text-emerald-600 dark:text-emerald-400", colSpan: "" },
            { icon: Trophy, Watermark: Trophy, title: "gamified", desc: "gamified", color: "text-amber-600 dark:text-amber-400", colSpan: "" },
            { icon: Cloud, Watermark: Cloud, title: "private", desc: "private", color: "text-blue-600 dark:text-blue-400", colSpan: "md:col-span-2" },
          ].map((card) => (
             <motion.div
               key={card.title}
               variants={cardVariants}
               whileHover={{ y: -8, scale: 1.01 }}
               className={`${card.colSpan} group relative overflow-hidden ${glassCard} rounded-[2.5rem] p-10 transition-shadow duration-500 hover:shadow-2xl hover:shadow-emerald-500/10`}
             >
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
               <div className="absolute -top-10 -right-10 p-8 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500">
                 <card.Watermark className="h-48 w-48 text-emerald-500" />
               </div>
               <motion.div whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: "spring", stiffness: 300 }}>
                 <card.icon className={`relative z-10 h-12 w-12 mb-6 ${card.color}`} />
               </motion.div>
              <h3 className="relative z-10 text-3xl font-bold mb-3">{t(`header.about.whyLove.${card.title}.title`)}</h3>
              <p className="relative z-10 text-xl text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">{t(`header.about.whyLove.${card.desc}.desc`)}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* Powerful Features - Glass Grid */}
      <AnimatedSection className="relative z-10 max-w-7xl mx-auto px-6 py-24" staggerDelay={0.2}>
        <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-12">
          <Sparkles className="h-8 w-8 text-purple-500" />
          <h2 className="text-4xl font-bold tracking-tight">{t("header.about.features.title")}</h2>
        </motion.div>
        <motion.div variants={gridContainer(0.5)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Camera, key: "ocr", color: "text-blue-600 dark:text-blue-400" },
            { icon: Brain, key: "visual", color: "text-purple-600 dark:text-purple-400" },
            { icon: BarChart3, key: "difficulty", color: "text-emerald-600 dark:text-emerald-400" },
            { icon: Highlighter, key: "cefrHighlight", color: "text-sky-600 dark:text-sky-400" },
            { icon: PenTool, key: "adaptation", color: "text-green-600 dark:text-green-400" },
            { icon: Volume2, key: "tts", color: "text-teal-600 dark:text-teal-400" },
            { icon: MessageCircle, key: "tutor", color: "text-indigo-600 dark:text-indigo-400" },
            { icon: MessageSquareText, key: "sentenceAnalysis", color: "text-orange-600 dark:text-orange-400" },
            { icon: BookOpen, key: "glossary", color: "text-teal-600 dark:text-teal-400" },
            { icon: Layers, key: "flashcard", color: "text-cyan-600 dark:text-cyan-400" },
            { icon: Gamepad2, key: "spelling", color: "text-pink-600 dark:text-pink-400" },
            { icon: ClipboardList, key: "quiz", color: "text-violet-600 dark:text-violet-400" },
            { icon: Target, key: "test", color: "text-red-600 dark:text-red-400" },
            { icon: Medal, key: "achievements", color: "text-amber-600 dark:text-amber-400" },
            { icon: Download, key: "wordExport", color: "text-rose-600 dark:text-rose-400" },
          ]          .map(({ icon: Icon, key, color }) => (
             <motion.div
               key={key}
               variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
               className={`group flex flex-col p-8 rounded-[2rem] ${glassCard} transition-shadow duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 relative overflow-hidden`}
             >
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
              <motion.div whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: "spring", stiffness: 300 }}>
                 <Icon className={`h-7 w-7 mb-6 ${color}`} />
               </motion.div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100">{t(`header.about.features.${key}.title`)}</h3>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">{t(`header.about.features.${key}.desc`)}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* For Schools & Teachers - Dark Glass Section */}
      <div className="relative z-10 bg-slate-900/90 dark:bg-slate-900/50 backdrop-blur-xl text-white py-32 rounded-[3rem] mx-4 sm:mx-8 my-12 overflow-hidden shadow-2xl border border-white/[0.06]">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent opacity-60 pointer-events-none" />
        <AnimatedSection className="relative max-w-7xl mx-auto px-6" staggerDelay={0.15}>
          <motion.div variants={sectionTitleVariants} className="max-w-2xl mb-16">
            <h2 className="text-4xl font-bold tracking-tight flex items-center gap-3 mb-6">
              <School className="h-10 w-10 text-teal-400" />
              {t("header.about.roles.title")}
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed">{t("header.about.roles.intro")}</p>
          </motion.div>
          <motion.div variants={gridContainer(0.15)} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Crown, title: "admin", color: "text-amber-400", items: ["manageSchools", "manageUsers", "manageClasses", "uploadTexts"] },
              { icon: GraduationCap, title: "teacher", color: "text-blue-400", items: ["manageStudents", "uploadTexts", "viewAiQuestions", "exportData", "viewLeaderboard"] },
              { icon: Users, title: "student", color: "text-emerald-400", items: ["learn", "cloudSync", "history", "leaderboard"] },
            ].map((role) => (
              <motion.div
                key={role.title}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] rounded-[2.5rem] p-8 hover:bg-white/[0.06] transition-colors duration-300 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/8 via-emerald-500/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
                <motion.div whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: "spring", stiffness: 300 }}>
                  <role.icon className={`h-10 w-10 mb-6 ${role.color}`} />
                </motion.div>
                <h3 className="text-2xl font-bold mb-6">{t(`header.about.roles.${role.title}.title`)}</h3>
                <ul className="space-y-4 text-slate-300">
                  {role.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="h-4.5 w-4.5 text-emerald-400 dark:text-emerald-500 shrink-0 mt-1" />
                      <span className="text-lg">{t(`header.about.roles.${role.title}.${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </AnimatedSection>
      </div>

      <WaveDivider />

      {/* Learning Journey - Flowing list */}
      <AnimatedSection className="relative z-10 py-24" staggerDelay={0.15}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={sectionTitleVariants} className="flex items-center gap-3 mb-16">
            <Rocket className="h-8 w-8 text-blue-500" />
            <h2 className="text-4xl font-bold tracking-tight">{t("header.about.workflow.title")}</h2>
          </motion.div>
          <motion.div variants={gridContainer(0.05)} className="flex flex-wrap gap-4">
            {[
              { num: 1, icon: Upload, key: "upload" },
              { num: 2, icon: FileText, key: "summary" },
              { num: 3, icon: Brain, key: "mindmap" },
              { num: 4, icon: BarChart3, key: "difficulty" },
              { num: 5, icon: Highlighter, key: "cefrHighlight" },
              { num: 6, icon: PenTool, key: "adapt" },
              { num: 7, icon: MessageCircle, key: "tutor" },
              { num: 8, icon: MessageSquareText, key: "analyze" },
              { num: 9, icon: Zap, key: "highlight" },
              { num: 10, icon: BookOpen, key: "glossary" },
              { num: 11, icon: Gamepad2, key: "spelling" },
              { num: 12, icon: Layers, key: "vocabQuiz" },
              { num: 13, icon: Target, key: "test" },
            ].map(({ num, icon: Icon, key }) => (
              <motion.div
                key={key}
                variants={pillVariants}
                whileHover={{ scale: 1.08, y: -4 }}
                className={`group flex items-center gap-4 ${glassCard} rounded-full py-3 px-6 hover:shadow-lg hover:shadow-emerald-500/10 transition-colors duration-300 cursor-default relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 400, delay: num * 0.03 }}
                  className="text-sm font-bold text-emerald-500/70"
                >
                  {num.toString().padStart(2, "0")}
                </motion.span>
                <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                <span className="text-base font-semibold group-hover:text-emerald-900 dark:group-hover:text-emerald-100 transition-colors">{t(`header.about.workflow.${key}`)}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      <WaveDivider flip />

      {/* Reading Skills & Bottom CTA */}
      <AnimatedSection className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center" staggerDelay={0.15}>
        <motion.div variants={sectionTitleVariants} className="inline-flex items-center justify-center gap-3 mb-10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <h2 className="text-3xl font-bold">{t("header.about.skills.title")}</h2>
        </motion.div>
        <motion.div variants={gridContainer(0.1)} className="flex flex-wrap justify-center gap-4 mb-24">
          {["mainIdea", "detail", "inference", "vocabulary", "purpose"].map((skill) => (
            <motion.span
              key={skill}
              variants={pillVariants}
              whileHover={{ y: -6, scale: 1.05 }}
              className={`px-8 py-4 ${glassCard} rounded-full text-lg font-bold hover:shadow-xl hover:shadow-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300 cursor-default relative overflow-hidden`}
            >
              <span className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full" />
              {t(`header.about.skills.${skill}`)}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          variants={cardVariants}
          className={`relative max-w-3xl mx-auto text-center ${glassCard} rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] px-6 py-10 sm:p-12 md:p-16 shadow-2xl overflow-hidden group`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-200/20 via-transparent to-transparent dark:from-emerald-900/10 pointer-events-none group-hover:from-emerald-300/30 transition-all duration-500" />

          <h2 className="relative z-10 text-4xl font-extrabold mb-10 leading-tight">{t("header.about.tagline")}</h2>
          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignIn}
            disabled={loading}
            className="relative z-10 group inline-flex items-center gap-4 px-10 py-5 rounded-full text-lg font-bold whitespace-nowrap transition-all duration-300
              bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]
              disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <SpinnerIcon /> : <GoogleIcon />}
            <span>{loading ? t("header.auth.loading") : t("header.auth.signIn")}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <p className="relative z-10 text-slate-500 dark:text-slate-400 text-base mt-10 font-medium tracking-wide uppercase">{t("header.about.builtWith")}</p>
        </motion.div>
      </AnimatedSection>
    </div>
  );
}
