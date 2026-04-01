"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import locales from "@/constants/locales";
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
      {/* Locale Switcher */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
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

      {/* Organic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 blur-3xl animate-pulse duration-[10000ms]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-amber-100/50 dark:bg-amber-900/20 blur-3xl animate-pulse duration-[8000ms] delay-1000" />
      </div>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 sm:pt-40 sm:pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 mb-8 shadow-sm hover:scale-105 transition-transform cursor-default">
          <BookCopy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium tracking-wide uppercase text-slate-600 dark:text-slate-300">
            {t("header.about.tagline")}
          </span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl text-slate-900 dark:text-white leading-[1.1]">
          <span className="inline-block hover:-translate-y-2 transition-transform duration-300">Mr.</span>
          <span className="inline-block mx-2 rotate-12 hover:rotate-0 transition-transform duration-300 text-5xl sm:text-7xl">🆖</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
            ProReader
          </span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed font-medium">
          {t("header.about.description")}
        </p>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300
            bg-slate-900 dark:bg-white text-white dark:text-slate-900 
            hover:bg-slate-800 dark:hover:bg-slate-100 hover:shadow-2xl hover:shadow-slate-900/20 dark:hover:shadow-white/20 hover:-translate-y-1 active:translate-y-0
            disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          {loading ? (
            <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span>{loading ? t("header.auth.loading") : t("header.auth.signIn")}</span>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Why You'll Love It - Asymmetrical Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-center gap-3 mb-12">
          <Star className="h-6 w-6 text-amber-500" />
          <h2 className="text-3xl font-bold tracking-tight">{t("header.about.whyLove.title")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1 group relative overflow-hidden bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2.5rem] p-10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
            <div className="absolute -top-10 -right-10 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 group-hover:opacity-20">
              <Target className="h-48 w-48 text-emerald-500" />
            </div>
            <Target className="relative z-10 h-12 w-12 mb-6 text-emerald-600 dark:text-emerald-400" />
            <h3 className="relative z-10 text-3xl font-bold mb-3">{t("header.about.whyLove.personalized.title")}</h3>
            <p className="relative z-10 text-xl text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">{t("header.about.whyLove.personalized.desc")}</p>
          </div>
          <div className="md:col-span-1 group relative overflow-hidden bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2.5rem] p-10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
            <div className="absolute -top-10 -right-10 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 group-hover:opacity-20">
              <Trophy className="h-40 w-40 text-amber-500" />
            </div>
            <Trophy className="relative z-10 h-12 w-12 mb-6 text-amber-600 dark:text-amber-400" />
            <h3 className="relative z-10 text-3xl font-bold mb-3">{t("header.about.whyLove.gamified.title")}</h3>
            <p className="relative z-10 text-xl text-slate-600 dark:text-slate-400 leading-relaxed">{t("header.about.whyLove.gamified.desc")}</p>
          </div>
          <div className="md:col-span-2 group relative overflow-hidden bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2.5rem] p-10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
            <div className="absolute -bottom-20 -right-10 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 group-hover:opacity-20">
              <Cloud className="h-64 w-64 text-blue-500" />
            </div>
            <Cloud className="relative z-10 h-12 w-12 mb-6 text-blue-600 dark:text-blue-400" />
            <h3 className="relative z-10 text-3xl font-bold mb-3">{t("header.about.whyLove.private.title")}</h3>
            <p className="relative z-10 text-xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">{t("header.about.whyLove.private.desc")}</p>
          </div>
        </div>
      </div>

      {/* Powerful Features - Dense but Organic Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-center gap-3 mb-12">
          <Sparkles className="h-8 w-8 text-purple-500" />
          <h2 className="text-4xl font-bold tracking-tight">{t("header.about.features.title")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Camera, key: "ocr", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { icon: Brain, key: "visual", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
            { icon: BarChart3, key: "difficulty", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { icon: Highlighter, key: "cefrHighlight", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/30" },
            { icon: PenTool, key: "adaptation", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
            { icon: Volume2, key: "tts", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/30" },
            { icon: MessageCircle, key: "tutor", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
            { icon: MessageSquareText, key: "sentenceAnalysis", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
            { icon: BookOpen, key: "glossary", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/30" },
            { icon: Layers, key: "flashcard", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
            { icon: Gamepad2, key: "spelling", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/30" },
            { icon: ClipboardList, key: "quiz", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
            { icon: Target, key: "test", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
            { icon: Medal, key: "achievements", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
            { icon: Download, key: "wordExport", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
          ].map(({ icon: Icon, key, color, bg }) => (
            <div key={key} className={`group flex flex-col p-8 rounded-[2.5rem] bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${bg} transition-transform group-hover:rotate-6 group-hover:scale-110`}>
                <Icon className={`h-7 w-7 ${color}`} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100">{t(`header.about.features.${key}.title`)}</h3>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">{t(`header.about.features.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* For Schools & Teachers - Bold Contrast Section */}
      <div className="relative z-10 bg-slate-900 dark:bg-slate-900/50 text-white py-32 rounded-[3rem] mx-4 sm:mx-8 my-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <h2 className="text-4xl font-bold tracking-tight flex items-center gap-3 mb-6">
              <School className="h-10 w-10 text-teal-400" />
              {t("header.about.roles.title")}
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed">{t("header.about.roles.intro")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Crown, title: "admin", color: "text-amber-400", items: ["manageSchools", "manageUsers", "manageClasses", "uploadTexts"] },
              { icon: GraduationCap, title: "teacher", color: "text-blue-400", items: ["manageStudents", "uploadTexts", "viewAiQuestions", "exportData", "viewLeaderboard"] },
              { icon: Users, title: "student", color: "text-emerald-400", items: ["learn", "cloudSync", "history", "leaderboard"] }
            ].map((role) => (
              <div key={role.title} className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-[2.5rem] p-8 hover:bg-slate-800 hover:-translate-y-2 transition-all duration-300">
                <role.icon className={`h-10 w-10 mb-6 ${role.color} group-hover:scale-110 transition-transform duration-300`} />
                <h3 className="text-2xl font-bold mb-6">{t(`header.about.roles.${role.title}.title`)}</h3>
                <ul className="space-y-4 text-slate-300">
                  {role.items.map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-slate-500 group-hover:bg-slate-400 transition-colors shrink-0" />
                      <span className="text-lg">{t(`header.about.roles.${role.title}.${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learning Journey - Flowing list */}
      <div className="relative z-10 bg-white/50 dark:bg-slate-800/20 py-24 border-y border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-16">
            <Rocket className="h-8 w-8 text-blue-500" />
            <h2 className="text-4xl font-bold tracking-tight">{t("header.about.workflow.title")}</h2>
          </div>
          <div className="flex flex-wrap gap-4">
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
              <div key={key} className="group flex items-center gap-4 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-full py-3 px-6 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 cursor-default hover:scale-105 hover:shadow-lg">
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors">{num.toString().padStart(2, '0')}</span>
                <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                <span className="text-base font-semibold group-hover:text-emerald-900 dark:group-hover:text-emerald-100 transition-colors">{t(`header.about.workflow.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reading Skills & Bottom CTA */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="inline-flex items-center justify-center gap-3 mb-10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <h2 className="text-3xl font-bold">{t("header.about.skills.title")}</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mb-24">
          {["mainIdea", "detail", "inference", "vocabulary", "purpose"].map((skill) => (
            <span 
              key={skill} 
              className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-lg font-bold shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 cursor-default"
            >
              {t(`header.about.skills.${skill}`)}
            </span>
          ))}
        </div>

        <div className="relative max-w-3xl mx-auto text-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-[4rem] p-16 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-100/50 via-transparent to-transparent dark:from-emerald-900/20 pointer-events-none" />
          
          <h2 className="relative z-10 text-4xl font-extrabold mb-10 leading-tight">{t("header.about.tagline")}</h2>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="relative z-10 group inline-flex items-center gap-4 px-10 py-5 rounded-full text-lg font-bold whitespace-nowrap transition-all duration-300
              bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-2 active:translate-y-0
              disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? (
              <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{loading ? t("header.auth.loading") : t("header.auth.signIn")}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="relative z-10 text-slate-500 dark:text-slate-400 text-base mt-10 font-medium tracking-wide uppercase">{t("header.about.builtWith")}</p>
        </div>
      </div>
    </div>
  );
}
