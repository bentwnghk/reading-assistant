"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/style";
import { playSfx } from "@/utils/sfx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCw, Star, Zap, Trophy, Flame, Heart, Crown } from "lucide-react";
import { GameBackButton, GameStatRow } from "./GrammarGames";
import { AnimatedScore, burstConfetti } from "./GameFx";

type PerformanceTier = "master" | "great" | "good" | "keepGoing";

function getPerformanceTier(accuracy: number): PerformanceTier {
  if (accuracy >= 90) return "master";
  if (accuracy >= 70) return "great";
  if (accuracy >= 50) return "good";
  return "keepGoing";
}

const TIER_CONFIG: Record<
  PerformanceTier,
  {
    emoji: string;
    icon: typeof Star;
    scoreColor: string;
    glowColor: string;
    particleColor: string;
    ringClass: string;
    messageKey: string;
  }
> = {
  master: {
    emoji: "👑",
    icon: Crown,
    scoreColor: "text-amber-600 dark:text-amber-400",
    glowColor: "shadow-amber-400/50",
    particleColor: "bg-amber-400",
    ringClass: "ring-4 ring-amber-400/60",
    messageKey: "reading.grammar.games.result.master",
  },
  great: {
    emoji: "🌟",
    icon: Star,
    scoreColor: "text-emerald-600 dark:text-emerald-400",
    glowColor: "shadow-emerald-400/40",
    particleColor: "bg-emerald-400",
    ringClass: "ring-4 ring-emerald-400/50",
    messageKey: "reading.grammar.games.result.great",
  },
  good: {
    emoji: "💪",
    icon: Zap,
    scoreColor: "text-blue-600 dark:text-blue-400",
    glowColor: "shadow-blue-400/30",
    particleColor: "bg-blue-400",
    ringClass: "ring-4 ring-blue-400/40",
    messageKey: "reading.grammar.games.result.good",
  },
  keepGoing: {
    emoji: "❤️",
    icon: Heart,
    scoreColor: "text-rose-600 dark:text-rose-400",
    glowColor: "shadow-rose-400/25",
    particleColor: "bg-rose-400",
    ringClass: "ring-4 ring-rose-400/30",
    messageKey: "reading.grammar.games.result.keepGoing",
  },
};

function FloatingParticles({ color, count }: { color: string; count: number }) {
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 4 + Math.random() * 6,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className={cn("absolute rounded-full opacity-60 animate-float-up", color)}
          style={{
            left: `${p.x}%`,
            bottom: "-10%",
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

interface GameResultScreenProps {
  onBack: () => void;
  score: number;
  scoreLabel?: string;
  accuracy: number;
  isNewHigh: boolean;
  stats: { label: string; value: string | number; highlight?: boolean }[];
  onPlayAgain: () => void;
  onGenerateNew: () => void;
  isGenerating: boolean;
  showGenerateLabel?: boolean;
  scoreIcon?: React.ReactNode;
  scorePrefix?: React.ReactNode;
}

export default function GameResultScreen({
  onBack,
  score,
  scoreLabel,
  accuracy,
  isNewHigh,
  stats,
  onPlayAgain,
  onGenerateNew,
  isGenerating,
  showGenerateLabel = false,
  scoreIcon,
  scorePrefix,
}: GameResultScreenProps) {
  const { t } = useTranslation();
  const tier = getPerformanceTier(accuracy);
  const config = TIER_CONFIG[tier];
  const [animateIn, setAnimateIn] = useState(false);
  const Icon = config.icon;

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Confetti for top tiers (mirrors the spelling result screens). The ref
  // guard survives StrictMode's double-invoked effects in dev. New personal
  // best gets a fanfare even on lower tiers.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    if (isNewHigh) {
      playSfx("newBest");
      if (tier !== "master" && tier !== "great") {
        burstConfetti({ count: 40, spread: 70 });
      }
    }
    if (tier === "master" || tier === "great") {
      burstConfetti({ count: tier === "master" ? 100 : 50, spread: 75 });
      if (tier === "master") {
        setTimeout(() => {
          burstConfetti({ count: 70, spread: 100, colors: ["#a855f7", "#6366f1", "#22d3ee", "#10b981"] });
        }, 280);
      }
    }
  }, [tier, isNewHigh]);

  return (
    <div className="space-y-5">
      <GameBackButton onBack={onBack} />

      <div
        className={cn(
          "relative rounded-2xl border-2 p-6 text-center space-y-3 transition-all duration-700 overflow-hidden",
          config.ringClass,
          animateIn && "shadow-2xl " + config.glowColor,
          animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={{
          background:
            tier === "master"
              ? "linear-gradient(135deg, rgba(255,237,160,0.15) 0%, rgba(251,191,36,0.08) 50%, rgba(255,237,160,0.15) 100%)"
              : tier === "great"
              ? "linear-gradient(135deg, rgba(167,243,208,0.15) 0%, rgba(52,211,153,0.08) 50%, rgba(167,243,208,0.15) 100%)"
              : tier === "good"
              ? "linear-gradient(135deg, rgba(191,219,254,0.15) 0%, rgba(96,165,250,0.08) 50%, rgba(191,219,254,0.15) 100%)"
              : "linear-gradient(135deg, rgba(254,205,211,0.15) 0%, rgba(251,113,133,0.08) 50%, rgba(254,205,211,0.15) 100%)",
        }}
      >
        {tier === "master" && <FloatingParticles color={config.particleColor} count={20} />}
        {tier === "great" && <FloatingParticles color={config.particleColor} count={12} />}

        <div
          className={cn(
            "text-5xl transition-all duration-500 delay-200",
            animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"
          )}
        >
          {config.emoji}
        </div>

        <div
          className={cn(
            "transition-all duration-500 delay-300",
            animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {scorePrefix && <div className="flex items-center justify-center gap-2">{scorePrefix}</div>}
          {!scorePrefix && (
            <div className={cn("text-5xl font-black flex items-center justify-center gap-2", config.scoreColor)}>
              {scoreIcon}
              <AnimatedScore value={score} />
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-1">
            {scoreLabel || t("reading.grammar.games.score")}
          </div>
        </div>

        {isNewHigh && (
          <div
            className={cn(
              "transition-all duration-500 delay-500",
              animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )}
          >
            <Badge className="bg-amber-500 text-white text-sm px-3 py-1">
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              {t("reading.grammar.games.newBest")}
            </Badge>
          </div>
        )}

        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-500 [transition-delay:600ms]",
            animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            tier === "master" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
            tier === "great" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
            tier === "good" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
            tier === "keepGoing" && "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {t(config.messageKey)}
        </div>

        {tier === "master" && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none transition-opacity duration-700",
              animateIn ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
            }}
          />
        )}
      </div>

      <div
        className={cn(
          "border rounded-lg divide-y transition-all duration-500 [transition-delay:400ms]",
          animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {stats.map((s, i) => (
          <GameStatRow key={i} label={s.label} value={s.value} highlight={s.highlight} />
        ))}
      </div>

      <div
        className={cn(
          "flex gap-2 transition-all duration-500 [transition-delay:600ms]",
          animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <Button onClick={onPlayAgain} className="flex-1" disabled={isGenerating}>
          <Flame className="h-4 w-4 mr-1.5" />
          {t("reading.grammar.games.playAgain")}
        </Button>
        <Button variant="outline" onClick={onGenerateNew} disabled={isGenerating}>
          {isGenerating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {showGenerateLabel && (
            <span className="ml-1.5 hidden sm:inline">{t("reading.grammar.games.generateChallenges")}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
