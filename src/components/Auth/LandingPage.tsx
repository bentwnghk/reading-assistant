"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  BookCopy,
  Target,
  Trophy,
  Shield,
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
} from "lucide-react";

export function LandingPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50/50 to-indigo-50 dark:from-blue-950/40 dark:via-purple-950/20 dark:to-indigo-950/40 pointer-events-none" />
        <div className="relative max-w-screen-lg mx-auto px-6 py-20 sm:py-28 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <BookCopy className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            <h1 className="text-4xl sm:text-5xl font-bold flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">Mr.</span>
              <span className="text-3xl sm:text-4xl leading-none">🆖</span>
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent relative overflow-hidden">
                ProReader
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent animate-shimmer" />
              </span>
            </h1>
          </div>

          <p className="text-lg sm:text-xl font-medium text-muted-foreground mb-3 tracking-wide uppercase">
            {t("header.about.tagline")}
          </p>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-foreground/80 mb-10 leading-relaxed">
            {t("header.about.description")}
          </p>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-semibold shadow-lg transition-all duration-200
              bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
              dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-400 dark:hover:to-indigo-400
              text-white hover:shadow-xl hover:scale-105 active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {/* Google logo SVG */}
            {loading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? t("header.auth.loading") : t("header.auth.signIn")}
          </button>
        </div>
      </div>

      {/* Why You'll Love It */}
      <div className="max-w-screen-lg mx-auto px-6 py-12">
        <h2 className="text-center font-semibold text-xl flex items-center justify-center gap-2 mb-6">
          <Star className="h-5 w-5 text-yellow-500" />
          {t("header.about.whyLove.title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-5 text-center shadow-sm">
            <Target className="h-7 w-7 mx-auto mb-2 text-blue-500" />
            <div className="font-semibold mb-1">{t("header.about.whyLove.personalized.title")}</div>
            <div className="text-sm text-muted-foreground">{t("header.about.whyLove.personalized.desc")}</div>
          </div>
          <div className="bg-card border rounded-xl p-5 text-center shadow-sm">
            <Trophy className="h-7 w-7 mx-auto mb-2 text-amber-500" />
            <div className="font-semibold mb-1">{t("header.about.whyLove.gamified.title")}</div>
            <div className="text-sm text-muted-foreground">{t("header.about.whyLove.gamified.desc")}</div>
          </div>
          <div className="bg-card border rounded-xl p-5 text-center shadow-sm">
            <Shield className="h-7 w-7 mx-auto mb-2 text-green-500" />
            <div className="font-semibold mb-1">{t("header.about.whyLove.private.title")}</div>
            <div className="text-sm text-muted-foreground">{t("header.about.whyLove.private.desc")}</div>
          </div>
        </div>
      </div>

      {/* For Schools & Teachers */}
      <div className="bg-muted/40 dark:bg-muted/10">
        <div className="max-w-screen-lg mx-auto px-6 py-12">
          <h2 className="font-semibold text-xl flex items-center gap-2 mb-2">
            <School className="h-5 w-5 text-indigo-500" />
            {t("header.about.roles.title")}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">{t("header.about.roles.intro")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="font-semibold">{t("header.about.roles.admin.title")}</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t("header.about.roles.admin.manageUsers")}</li>
                <li>• {t("header.about.roles.admin.assignTeachers")}</li>
                <li>• {t("header.about.roles.admin.createClasses")}</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">{t("header.about.roles.teacher.title")}</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t("header.about.roles.teacher.manageStudents")}</li>
                <li>• {t("header.about.roles.teacher.trackProgress")}</li>
                <li>• {t("header.about.roles.teacher.exportData")}</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-500" />
                <span className="font-semibold">{t("header.about.roles.student.title")}</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t("header.about.roles.student.learn")}</li>
                <li>• {t("header.about.roles.student.cloudSync")}</li>
                <li>• {t("header.about.roles.student.history")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Powerful Features */}
      <div className="max-w-screen-lg mx-auto px-6 py-12">
        <h2 className="font-semibold text-xl flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {t("header.about.features.title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: <BarChart3 className="h-4 w-4 text-emerald-500 shrink-0" />, key: "difficulty" },
            { icon: <Highlighter className="h-4 w-4 text-sky-500 shrink-0" />, key: "cefrHighlight" },
            { icon: <MessageCircle className="h-4 w-4 text-primary shrink-0" />, key: "tutor" },
            { icon: <Camera className="h-4 w-4 text-blue-500 shrink-0" />, key: "ocr" },
            { icon: <PenTool className="h-4 w-4 text-green-500 shrink-0" />, key: "adaptation" },
            { icon: <Brain className="h-4 w-4 text-purple-500 shrink-0" />, key: "visual" },
            { icon: <MessageSquareText className="h-4 w-4 text-orange-500 shrink-0" />, key: "sentenceAnalysis" },
            { icon: <Target className="h-4 w-4 text-red-500 shrink-0" />, key: "test" },
            { icon: <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />, key: "glossary" },
            { icon: <Layers className="h-4 w-4 text-cyan-500 shrink-0" />, key: "flashcard" },
            { icon: <Gamepad2 className="h-4 w-4 text-pink-500 shrink-0" />, key: "spelling" },
            { icon: <ClipboardList className="h-4 w-4 text-violet-500 shrink-0" />, key: "quiz" },
            { icon: <Volume2 className="h-4 w-4 text-teal-500 shrink-0" />, key: "tts" },
            { icon: <Download className="h-4 w-4 text-rose-500 shrink-0" />, key: "wordExport" },
          ].map(({ icon, key }) => (
            <div key={key} className="flex items-start gap-3 bg-card border rounded-lg p-3">
              <div className="mt-0.5">{icon}</div>
              <div>
                <div className="font-medium text-sm">{t(`header.about.features.${key}.title`)}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t(`header.about.features.${key}.desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Journey */}
      <div className="bg-muted/40 dark:bg-muted/10">
        <div className="max-w-screen-lg mx-auto px-6 py-12">
          <h2 className="font-semibold text-xl flex items-center gap-2 mb-6">
            <Rocket className="h-5 w-5 text-blue-500" />
            {t("header.about.workflow.title")}
          </h2>
          <div className="bg-card border rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {[
                { num: 1, color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300", icon: <Upload className="h-3.5 w-3.5 text-muted-foreground" />, key: "upload" },
                { num: 2, color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300", icon: <FileText className="h-3.5 w-3.5 text-muted-foreground" />, key: "summary" },
                { num: 3, color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300", icon: <Brain className="h-3.5 w-3.5 text-muted-foreground" />, key: "mindmap" },
                { num: 4, color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300", icon: <PenTool className="h-3.5 w-3.5 text-muted-foreground" />, key: "adapt" },
                { num: 5, color: "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300", icon: <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />, key: "difficulty" },
                { num: 6, color: "bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300", icon: <Highlighter className="h-3.5 w-3.5 text-muted-foreground" />, key: "cefrHighlight" },
                { num: 7, color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300", icon: <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />, key: "tutor" },
                { num: 8, color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300", icon: <Target className="h-3.5 w-3.5 text-muted-foreground" />, key: "test" },
                { num: 9, color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300", icon: <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />, key: "analyze" },
                { num: 10, color: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300", icon: <Zap className="h-3.5 w-3.5 text-muted-foreground" />, key: "highlight" },
                { num: 11, color: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300", icon: <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />, key: "glossary" },
                { num: 12, color: "bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300", icon: <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />, key: "spelling" },
                { num: 13, color: "bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300", icon: <Layers className="h-3.5 w-3.5 text-muted-foreground" />, key: "vocabQuiz" },
              ].map(({ num, color, icon, key }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${color} text-xs font-bold shrink-0`}>{num}</span>
                  {icon}
                  <span className="text-sm">{t(`header.about.workflow.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reading Skills */}
      <div className="max-w-screen-lg mx-auto px-6 py-10">
        <h2 className="font-semibold text-xl flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          {t("header.about.skills.title")}
        </h2>
        <div className="flex flex-wrap gap-2 mb-10">
          {["mainIdea", "detail", "inference", "vocabulary", "purpose"].map((skill) => (
            <span key={skill} className="inline-flex items-center bg-muted px-3 py-1.5 rounded-full text-sm font-medium">
              {t(`header.about.skills.${skill}`)}
            </span>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-12 border-t">
          <p className="text-muted-foreground text-sm mb-8">{t("header.about.builtWith")}</p>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-semibold shadow-lg transition-all duration-200
              bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
              dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-400 dark:hover:to-indigo-400
              text-white hover:shadow-xl hover:scale-105 active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? t("header.auth.loading") : t("header.auth.signIn")}
          </button>
        </div>
      </div>
    </div>
  );
}
