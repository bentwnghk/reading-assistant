"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { Crown, RotateCcw, LogOut, Trophy, Flame } from "lucide-react";

import { useSpellingBattle } from "@/hooks/useSpellingBattle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/style";

interface SpellingBattleResultsProps {
  onExit: () => void;
}

const M = "reading.glossary.spelling.multiplayer";
const TIER = "reading.glossary.spelling.resultTier";

// Performance tier by accuracy — mirrors the solo game's thresholds so a
// battle result feels consistent with solo play.
type Tier = "master" | "great" | "good" | "keepGoing";

const TIER_CONFIG: Record<Tier, { emoji: string; color: string; badge: string; particle: string }> = {
  master: { emoji: "👑", color: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", particle: "#fbbf24" },
  great: { emoji: "🌟", color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", particle: "#34d399" },
  good: { emoji: "💪", color: "text-blue-600 dark:text-blue-400", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", particle: "#60a5fa" },
  keepGoing: { emoji: "❤️", color: "text-rose-600 dark:text-rose-400", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", particle: "#fb7185" },
};

function getTier(accuracy: number): Tier {
  if (accuracy >= 80) return "master";
  if (accuracy >= 60) return "great";
  if (accuracy >= 40) return "good";
  return "keepGoing";
}

function FloatingParticles({ color, count }: { color: string; count: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 6,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-float-up rounded-full opacity-60"
          style={{
            left: `${p.x}%`,
            bottom: "-10%",
            width: p.size,
            height: p.size,
            backgroundColor: color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export function SpellingBattleResults({ onExit }: SpellingBattleResultsProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const battle = useSpellingBattle();
  const myUserId = session?.user?.id;

  const ranking = battle.finalRanking;
  const me = ranking.find((r) => r.userId === myUserId);
  const totalWords = battle.totalWords || ranking.length;
  const myAccuracy = me && totalWords > 0 ? Math.round((me.correctCount / totalWords) * 100) : 0;
  const myTier = getTier(myAccuracy);
  const iWon = me?.rank === 1;

  const [animateIn, setAnimateIn] = useState(false);
  const confettiFiredRef = useRef(false);

  // Staggered entrance.
  useEffect(() => {
    const tm = setTimeout(() => setAnimateIn(true), 80);
    return () => clearTimeout(tm);
  }, []);

  // Confetti for the winner (and a smaller burst for other top-3 finishers).
  useEffect(() => {
    if (!me || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    if (me.rank > 3) return; // only celebrate top-3
    import("canvas-confetti")
      .then((mod) => {
        const confetti = mod.default;
        const gold = ["#facc15", "#f59e0b", "#fcd34d", "#fde68a"];
        const festive = ["#a855f7", "#6366f1", "#22d3ee", "#10b981"];
        const isWinner = me.rank === 1;
        confetti({
          particleCount: isWinner ? 100 : 50,
          spread: isWinner ? 80 : 60,
          origin: { y: 0.55 },
          colors: gold,
          disableForReducedMotion: true,
        });
        if (isWinner) {
          setTimeout(() => {
            confetti({
              particleCount: 70,
              spread: 100,
              startVelocity: 30,
              origin: { y: 0.5 },
              colors: festive,
              disableForReducedMotion: true,
            });
          }, 280);
        }
      })
      .catch(() => {});
  }, [me]);

  if (!me) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-muted-foreground">{t(`${M}.noResult`)}</p>
        <Button variant="outline" onClick={onExit}>
          <LogOut className="h-4 w-4 mr-2" />
          {t(`${M}.leave`)}
        </Button>
      </div>
    );
  }

  const tierCfg = TIER_CONFIG[myTier];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* My result headline */}
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-500",
          iWon && "border-amber-500/50",
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
        style={iWon ? { background: "linear-gradient(135deg, rgba(255,237,160,0.15) 0%, rgba(251,191,36,0.06) 50%, rgba(255,237,160,0.15) 100%)" } : undefined}
      >
        {iWon && <FloatingParticles color={tierCfg.particle} count={20} />}
        <CardContent className="relative flex flex-col items-center gap-2 py-8 text-center">
          <div className="text-5xl">
            {me.rank === 1 ? "🏆" : me.rank === 2 ? "🥈" : me.rank === 3 ? "🥉" : `#${me.rank}`}
          </div>
          <p className="text-xl font-bold">
            {iWon ? t(`${M}.youWon`) : t(`${M}.youFinished`, { rank: me.rank })}
          </p>
          {/* Tier badge */}
          <Badge className={cn("gap-1", tierCfg.badge)}>
            <span>{tierCfg.emoji}</span>
            {t(`${TIER}.${myTier}`)}
          </Badge>
          <div className="mt-1 flex items-center gap-5 text-sm">
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-bold">{me.total}</span>
              <span className="text-muted-foreground">{t(`${M}.points`)}</span>
            </span>
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{myAccuracy}%</span>
            </span>
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{me.correctCount}</span>/{totalWords}
            </span>
            {me.correctCount >= 3 && (
              <span className="flex items-center gap-1 text-orange-500">
                <Flame className="h-4 w-4" />
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final ranking */}
      <Card
        className={cn(
          "transition-all duration-500",
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
        style={{ transitionDelay: animateIn ? "120ms" : "0ms" }}
      >
        <CardContent className="py-4">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <Crown className="h-4 w-4 text-amber-500" />
            {t(`${M}.finalRanking`)}
          </div>
          <div className="space-y-2">
            {ranking.map((entry, idx) => {
              const isMe = entry.userId === myUserId;
              const acc = totalWords > 0 ? Math.round((entry.correctCount / totalWords) * 100) : 0;
              const entryTier = TIER_CONFIG[getTier(acc)];
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2.5 transition-all duration-500",
                    entry.rank === 1 && "border-amber-500/40 bg-amber-500/5",
                    isMe && entry.rank !== 1 && "border-primary/40 bg-primary/5",
                    animateIn ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
                  )}
                  style={{ transitionDelay: animateIn ? `${200 + idx * 70}ms` : "0ms" }}
                >
                  <span className="w-7 text-center text-lg font-bold">
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                  </span>
                  <Avatar className="h-8 w-8">
                    {entry.image && <AvatarImage src={entry.image} alt={entry.name ?? ""} />}
                    <AvatarFallback className="text-xs">
                      {(entry.name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <span className="text-sm font-medium">
                      {entry.name ?? t(`${M}.anonymous`)}
                    </span>
                    {isMe && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {t(`${M}.you`)}
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("ml-2 text-xs", entryTier.badge)}>
                      {entryTier.emoji}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{entry.total}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.correctCount}/{totalWords}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div
        className={cn(
          "flex flex-wrap justify-center gap-2 transition-all duration-500",
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
        style={{ transitionDelay: animateIn ? "350ms" : "0ms" }}
      >
        {battle.isHost && (
          <Button onClick={battle.requestRematch}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t(`${M}.rematch`)}
          </Button>
        )}
        <Button variant="outline" onClick={onExit}>
          <LogOut className="h-4 w-4 mr-2" />
          {t(`${M}.leave`)}
        </Button>
      </div>
      {!battle.isHost && (
        <p className="text-center text-xs text-muted-foreground">{t(`${M}.hostControlsRematch`)}</p>
      )}
    </div>
  );
}
