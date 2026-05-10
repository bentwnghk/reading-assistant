"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Shuffle,
  Wrench,
  Stethoscope,
  CircleDot,
  Swords,
  ArrowLeft,
  Trophy,
  Star,
  Target,
} from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { cn } from "@/utils/style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GrammarWordScramble from "./GrammarWordScramble";
import GrammarWorkshop from "./GrammarWorkshop";
import GrammarErrorSurgery from "./GrammarErrorSurgery";
import GrammarRoulette from "./GrammarRoulette";
import GrammarDuel from "./GrammarDuel";

type ActiveGame = "scramble" | "workshop" | "surgery" | "roulette" | "duel" | null;

const GAME_CONFIG = [
  {
    id: "roulette" as const,
    icon: CircleDot,
    color: "text-purple-500",
    cardBorder: "hover:border-purple-300 dark:hover:border-purple-700",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    nameKey: "reading.grammar.games.roulette.name",
    nameZhKey: "reading.grammar.games.roulette.nameZh",
    descKey: "reading.grammar.games.roulette.description",
    scoreField: "grammarRouletteHighScore" as const,
    accuracyField: "grammarRouletteAccuracy" as const,
  },
  {
    id: "surgery" as const,
    icon: Stethoscope,
    color: "text-red-500",
    cardBorder: "hover:border-red-300 dark:hover:border-red-700",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    nameKey: "reading.grammar.games.surgery.name",
    nameZhKey: "reading.grammar.games.surgery.nameZh",
    descKey: "reading.grammar.games.surgery.description",
    scoreField: "grammarSurgeryHighScore" as const,
    accuracyField: "grammarSurgeryAccuracy" as const,
  },
  {
    id: "workshop" as const,
    icon: Wrench,
    color: "text-green-500",
    cardBorder: "hover:border-green-300 dark:hover:border-green-700",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    nameKey: "reading.grammar.games.workshop.name",
    nameZhKey: "reading.grammar.games.workshop.nameZh",
    descKey: "reading.grammar.games.workshop.description",
    scoreField: "grammarWorkshopHighScore" as const,
    accuracyField: "grammarWorkshopAccuracy" as const,
  },
  {
    id: "duel" as const,
    icon: Swords,
    color: "text-orange-500",
    cardBorder: "hover:border-orange-300 dark:hover:border-orange-700",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    nameKey: "reading.grammar.games.duel.name",
    nameZhKey: "reading.grammar.games.duel.nameZh",
    descKey: "reading.grammar.games.duel.description",
    scoreField: "grammarDuelHighScore" as const,
    accuracyField: "grammarDuelAccuracy" as const,
  },
  {
    id: "scramble" as const,
    icon: Shuffle,
    color: "text-blue-500",
    cardBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    nameKey: "reading.grammar.games.scramble.name",
    nameZhKey: "reading.grammar.games.scramble.nameZh",
    descKey: "reading.grammar.games.scramble.description",
    scoreField: "grammarScrambleHighScore" as const,
    accuracyField: "grammarScrambleAccuracy" as const,
  },
] as const;

interface GrammarGamesProps {
  /** Called when a game sets activeTab back */
  onBack?: () => void;
}

export default function GrammarGames({ onBack: _onBack }: GrammarGamesProps) {
  const { t } = useTranslation();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const store = useReadingStore();

  const handleBack = () => setActiveGame(null);

  if (activeGame === "scramble") return <GrammarWordScramble onBack={handleBack} />;
  if (activeGame === "workshop") return <GrammarWorkshop onBack={handleBack} />;
  if (activeGame === "surgery") return <GrammarErrorSurgery onBack={handleBack} />;
  if (activeGame === "roulette") return <GrammarRoulette onBack={handleBack} />;
  if (activeGame === "duel") return <GrammarDuel onBack={handleBack} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("reading.grammar.games.description")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_CONFIG.map((game) => {
          const Icon = game.icon;
          const highScore = store[game.scoreField] as number;
          const avgAccuracy = store[game.accuracyField] as number;

          return (
            <div
              key={game.id}
              className={cn(
                "relative flex flex-col gap-3 border rounded-xl p-4 cursor-pointer",
                "transition-all duration-200 hover:shadow-md",
                game.cardBorder,
                "bg-card"
              )}
              onClick={() => setActiveGame(game.id)}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", game.iconBg)}>
                  <Icon className={cn("h-5 w-5", game.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm leading-tight">
                    {t(game.nameKey)}
                  </h4>
                  <p className="text-xs text-muted-foreground font-noto-sans-tc">
                    {t(game.nameZhKey)}
                  </p>
                </div>
                {highScore > 0 && (
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {highScore}
                      </span>
                    </div>
                    {avgAccuracy > 0 && (
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          {avgAccuracy}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(game.descKey)}
              </p>

              <Button size="sm" className="w-full mt-auto" variant="outline">
                <Star className="h-3.5 w-3.5 mr-1.5" />
                {t("reading.grammar.games.play")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Reusable back button used inside every game component */
export function GameBackButton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="mb-3 -ml-1">
      <ArrowLeft className="h-4 w-4 mr-1" />
      {t("reading.grammar.games.backToGames")}
    </Button>
  );
}

/** Reusable mode selector used on every game setup screen */
export function GameModeSelector({
  mode,
  onChange,
}: {
  mode: GrammarGameMode;
  onChange: (m: GrammarGameMode) => void;
}) {
  const { t } = useTranslation();

  const modes: { key: GrammarGameMode; label: string; desc: string }[] = [
    { key: "practice", label: t("reading.grammar.games.practice"), desc: t("reading.grammar.games.practiceDesc") },
    { key: "arcade",   label: t("reading.grammar.games.arcade"),   desc: t("reading.grammar.games.arcadeDesc") },
    { key: "mastery",  label: t("reading.grammar.games.mastery"),  desc: t("reading.grammar.games.masteryDesc") },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all",
            mode === m.key
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          <span className="text-xs font-semibold">{m.label}</span>
          <span className="text-[10px] leading-tight opacity-70">{m.desc}</span>
        </button>
      ))}
    </div>
  );
}

/** Shared feedback overlay shown after each answer */
export function AnswerFeedback({
  isCorrect,
  explanation,
  points,
}: {
  isCorrect: boolean;
  explanation: string;
  points?: number;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "w-full rounded-xl border-2 p-4 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200",
        isCorrect
          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
          : "border-red-400 bg-red-50 dark:bg-red-900/20"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-bold text-sm",
            isCorrect ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-400"
          )}
        >
          {isCorrect ? t("reading.grammar.games.correct") : t("reading.grammar.games.incorrect")}
        </span>
        {points !== undefined && isCorrect && (
          <Badge variant="secondary" className="text-xs font-bold">
            +{points}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
    </div>
  );
}

/** Score/streak stat row used on completion screens */
export function GameStatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-bold", highlight && "text-primary")}>{value}</span>
    </div>
  );
}
