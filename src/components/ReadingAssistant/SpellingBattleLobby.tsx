"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Crown,
  Copy,
  Check,
  LogOut,
  Play,
  Swords,
  DoorOpen,
  Loader2,
  AlertCircle,
  WifiOff,
  Volume2,
  Shuffle,
  Keyboard,
  HelpCircle,
  Zap,
  Flame,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ScrollText,
  Timer,
} from "lucide-react";
import copy from "copy-to-clipboard";

import { useSpellingBattle } from "@/hooks/useSpellingBattle";
import { useBattleStore } from "@/store/battle";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClassBattleTargetCombobox } from "@/components/Internal/ClassCombobox";
import { toast } from "sonner";
import GuideDialog from "@/components/Internal/GuideDialog";

interface SpellingBattleLobbyProps {
  /** Current reading-session id (reading-page context); enables the "current glossary" source. */
  defaultGlossarySessionId?: string;
  /** Inline word texts from the host's current selection (vocabulary-page context); enables the "selected words" source. */
  selectedWords?: string[];
  /** Called when the user exits multiplayer entirely. */
  onExit: () => void;
}

const M = "reading.glossary.spelling.multiplayer";

const DIFFICULTIES: SpellingDifficulty[] = ["easy", "medium", "hard"];

/** Mode picker options (reuses the solo game's mode icons + i18n keys). */
const MODE_OPTIONS: { value: SpellingGameMode; icon: React.ReactNode }[] = [
  { value: "listen-type", icon: <Volume2 className="h-4 w-4" /> },
  { value: "scramble", icon: <Shuffle className="h-4 w-4" /> },
  { value: "fill-blanks", icon: <Keyboard className="h-4 w-4" /> },
  { value: "mixed", icon: <HelpCircle className="h-4 w-4" /> },
];

// Mirror of WORD_DURATION_MS in `realtime/src/game/scoring.ts` — used only to
// display the per-word time limit in the lobby rules card. Keep in sync.
const WORD_DURATION_MS: Record<SpellingGameMode, Record<SpellingDifficulty, number>> = {
  "listen-type": { easy: 30_000, medium: 20_000, hard: 12_000 },
  scramble: { easy: 45_000, medium: 30_000, hard: 20_000 },
  "fill-blanks": { easy: 30_000, medium: 20_000, hard: 12_000 },
  mixed: { easy: 30_000, medium: 20_000, hard: 12_000 },
};
const BASE_MODES: SpellingGameMode[] = ["listen-type", "scramble", "fill-blanks"];

export function SpellingBattleLobby({ defaultGlossarySessionId, selectedWords, onExit }: SpellingBattleLobbyProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const battle = useSpellingBattle();

  const role = session?.user?.role;
  const canHostClassBattle = role === "teacher" || role === "admin" || role === "super-admin";

  // ── Create-form state ────────────────────────────────────────────────────
  const [sourceType, setSourceType] = useState<WordSourceType>(
    defaultGlossarySessionId ? "glossary" : selectedWords && selectedWords.length > 0 ? "selected" : "vocabulary",
  );
  const [vocabFilter, setVocabFilter] = useState<VocabularyFilter>("random");
  const [reviewListId, setReviewListId] = useState<string>("");
  const [gameMode, setGameMode] = useState<SpellingGameMode>("listen-type");
  const [difficulty, setDifficulty] = useState<SpellingDifficulty>("medium");
  const [wordCount, setWordCount] = useState(10);
  const [timed, setTimed] = useState(true);
  const [classBattle, setClassBattle] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [targetPresetId, setTargetPresetId] = useState<string>("");

  // ── Fetched data ─────────────────────────────────────────────────────────
  const [reviewLists, setReviewLists] = useState<{ id: string; name: string; wordCount: number }[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [rosters, setRosters] = useState<AssignmentPreset[]>([]);

  // ── Join form ────────────────────────────────────────────────────────────
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-connect on mount.
  useEffect(() => {
    void battle.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch review lists (for the source picker).
  useEffect(() => {
    fetch("/api/review-lists")
      .then((r) => (r.ok ? r.json() : []))
      .then((lists: { id: string; name: string; wordCount: number }[]) => setReviewLists(lists))
      .catch(() => {});
  }, []);

  // Fetch classes + saved rosters (teachers/admins only — for class battles).
  useEffect(() => {
    if (!canHostClassBattle) return;
    fetch("/api/classes")
      .then((r) => (r.ok ? r.json() : []))
      .then((c: ClassInfo[]) => {
        const sorted = [...c].sort((a, b) => a.name.localeCompare(b.name));
        setClasses(sorted);
      })
      .catch(() => {});
    // Saved rosters = assignment presets (reusable student groups shared
    // school-wide). Used to target a battle at an ad-hoc student group.
    fetch("/api/assignments/presets")
      .then((r) => (r.ok ? r.json() : []))
      .then((p: AssignmentPreset[]) => setRosters(p))
      .catch(() => {});
  }, [canHostClassBattle]);

  const buildSource = useCallback((): WordSource => {
    switch (sourceType) {
      case "glossary":
        return { type: "glossary", sourceId: defaultGlossarySessionId };
      case "vocabulary":
        return { type: "vocabulary", filter: vocabFilter };
      case "review-list":
        return { type: "review-list", sourceId: reviewListId };
      case "selected":
        return { type: "selected", words: selectedWords ?? [] };
    }
  }, [sourceType, defaultGlossarySessionId, vocabFilter, reviewListId, selectedWords]);

  const handleCreate = useCallback(() => {
    const source = buildSource();
    if (source.type === "glossary" && !defaultGlossarySessionId) {
      toast.error(t(`${M}.errors.needGlossary`));
      return;
    }
    if (source.type === "review-list" && !reviewListId) {
      toast.error(t(`${M}.errors.needReviewList`));
      return;
    }
    if (source.type === "selected" && (!source.words || source.words.length < 3)) {
      toast.error(t(`${M}.errors.needSelected`));
      return;
    }
    if (classBattle && !targetClassId && !targetPresetId) {
      toast.error(t(`${M}.errors.needClass`));
      return;
    }
    battle.clearError();
    battle.createRoom({
      config: { source, difficulty, gameMode, wordCount, timed, classBattle },
      targetClassId: classBattle && targetClassId ? targetClassId : undefined,
      targetPresetId: classBattle && targetPresetId ? targetPresetId : undefined,
    });
  }, [buildSource, defaultGlossarySessionId, reviewListId, classBattle, targetClassId, targetPresetId, difficulty, gameMode, wordCount, timed, battle, t]);

  const handleJoin = useCallback(() => {
    if (joinCode.trim().length < 4) {
      toast.error(t(`${M}.errors.invalidCode`));
      return;
    }
    battle.clearError();
    battle.joinRoom(joinCode);
  }, [joinCode, battle, t]);

  const handleCopy = useCallback(() => {
    if (!battle.roomCode) return;
    copy(battle.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [battle.roomCode]);

  const handleExit = useCallback(() => {
    battle.leaveRoom();
    battle.disconnect();
    onExit();
  }, [battle, onExit]);

  const acceptClassInvite = useCallback(() => {
    const invite = useBattleStore.getState().classInvite;
    if (!invite) return;
    battle.clearError();
    useBattleStore.getState().setClassInvite(null)
    battle.joinRoom(invite.roomCode);
  }, [battle]);

  // ── Render gates ─────────────────────────────────────────────────────────

  if (battle.isUnavailable) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t(`${M}.unavailable`)}</p>
          <Button variant="outline" onClick={onExit}>
            {t(`${M}.back`)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!battle.isConnected && !battle.isConnecting) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t(`${M}.connecting`)}</p>
          <Button onClick={() => void battle.connect()}>{t(`${M}.retry`)}</Button>
        </CardContent>
      </Card>
    );
  }

  if (battle.isConnecting && !battle.roomCode) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t(`${M}.connecting`)}</span>
        </CardContent>
      </Card>
    );
  }

  // ── In-room view ─────────────────────────────────────────────────────────
  if (battle.roomCode) {
    const players = battle.players ?? [];
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {battle.error && <ErrorBanner code={battle.error} t={t} onDismiss={battle.clearError} />}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Swords className="h-5 w-5" />
                {t(`${M}.roomTitle`)}
              </CardTitle>
              <Badge variant="secondary">
                {t(`${M}.status.${battle.status ?? "lobby"}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Room code */}
            <div className="flex items-center justify-center gap-3 rounded-lg border bg-muted/40 py-4">
              <span className="font-mono text-3xl font-bold tracking-[0.3em]">{battle.roomCode}</span>
              <Button size="icon" variant="ghost" onClick={handleCopy} title={t(`${M}.copyCode`)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">{t(`${M}.shareCode`)}</p>

            <Separator />

            {/* Players */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                {t(`${M}.players`)} ({players.length})
              </div>
              <div className="space-y-1.5">
                {players.map((p) => (
                  <PlayerRow key={p.userId} player={p} currentUserId={session?.user?.id} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Word source summary + actual count */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{t(`${M}.wordsLabel`)}</span>
              <Badge variant="outline">
                {battle.actualWordCount} {t(`${M}.words`)}
              </Badge>
            </div>

            <Separator />

            {/* Game rules — scoring, hints, streak, speed bonus */}
            <GameRulesCard config={battle.config} />

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {battle.isHost && (
                <Button
                  className="flex-1"
                  onClick={battle.startGame}
                  disabled={players.length < 2}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t(`${M}.startBattle`)}
                </Button>
              )}
              <Button variant="outline" onClick={handleExit}>
                <LogOut className="mr-2 h-4 w-4" />
                {t(`${M}.leave`)}
              </Button>
            </div>
            {battle.isHost && players.length < 2 && (
              <p className="text-center text-xs text-muted-foreground">{t(`${M}.needMorePlayers`)}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Lobby: create / join ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {battle.error && <ErrorBanner code={battle.error} t={t} onDismiss={battle.clearError} />}

      {/* Class-battle invite banner */}
      <ClassInviteBanner onAccept={acceptClassInvite} />

      {/* Create room */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Swords className="h-5 w-5" />
            {t(`${M}.createRoom`)}
            <GuideDialog
              titleKey={`${M}.help.title`}
              introKey={`${M}.help.intro`}
              itemsBaseKey={`${M}.help.items`}
              items={[
                { key: "create", icon: Swords, bgClass: "bg-fuchsia-500/10", iconClass: "text-fuchsia-500" },
                { key: "join", icon: DoorOpen, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
                { key: "gameplay", icon: Volume2, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
                { key: "ranking", icon: Crown, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
              ]}
              stepsTitleKey={`${M}.help.stepsTitle`}
              stepsKeys={[
                `${M}.help.steps.s1`,
                `${M}.help.steps.s2`,
                `${M}.help.steps.s3`,
                `${M}.help.steps.s4`,
              ]}
              tipTitleKey={`${M}.help.tipTitle`}
              tipContentKey={`${M}.help.tipContent`}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Word source */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">{t(`${M}.wordSource`)}</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as WordSourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {defaultGlossarySessionId && (
                  <SelectItem value="glossary">{t(`${M}.source.glossary`)}</SelectItem>
                )}
                {selectedWords && selectedWords.length > 0 && !defaultGlossarySessionId && (
                  <SelectItem value="selected">{t(`${M}.source.selected`, { count: selectedWords.length })}</SelectItem>
                )}
                <SelectItem value="vocabulary">{t(`${M}.source.vocabulary`)}</SelectItem>
                {reviewLists.length > 0 && (
                  <SelectItem value="review-list">{t(`${M}.source.reviewList`)}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Game mode */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">{t(`${M}.selectMode`)}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGameMode(opt.value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-all",
                    gameMode === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted hover:border-primary/40",
                  )}
                >
                  {opt.icon}
                  <span>{t(`reading.glossary.spelling.modes.${opt.value}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {sourceType === "vocabulary" && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">{t(`${M}.filter`)}</Label>
              <Select value={vocabFilter} onValueChange={(v) => setVocabFilter(v as VocabularyFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">{t("vocabulary.strategy.due")}</SelectItem>
                  <SelectItem value="hardest">{t("vocabulary.strategy.hardest")}</SelectItem>
                  <SelectItem value="newest">{t("vocabulary.strategy.newest")}</SelectItem>
                  <SelectItem value="random">{t("vocabulary.strategy.random")}</SelectItem>
                  <SelectItem value="weakest">{t("vocabulary.strategy.weakest")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {sourceType === "review-list" && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">{t(`${M}.source.reviewList`)}</Label>
              <Select value={reviewListId} onValueChange={setReviewListId}>
                <SelectTrigger>
                  <SelectValue placeholder={t(`${M}.selectList`)} />
                </SelectTrigger>
                <SelectContent>
                  {reviewLists.map((rl) => (
                    <SelectItem key={rl.id} value={rl.id}>
                      {rl.name} ({rl.wordCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">{t(`reading.glossary.spelling.selectDifficulty`)}</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as SpellingDifficulty)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {t(`reading.glossary.spelling.difficulty.${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Word count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground">{t(`reading.glossary.spelling.selectWordCount`)}</Label>
              <Badge variant="secondary">{wordCount}</Badge>
            </div>
            <Slider
              value={[wordCount]}
              min={5}
              max={30}
              step={1}
              onValueChange={(v) => setWordCount(v[0] ?? 10)}
            />
          </div>

          {/* Speed bonus toggle (per-word timer always applies; this only enables the speed-point bonus) */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm">{t(`${M}.speedBonus`)}</Label>
                <p className="text-xs text-muted-foreground">{t(`${M}.speedBonusDesc`)}</p>
              </div>
            </div>
            <Switch checked={timed} onCheckedChange={setTimed} />
          </div>

          {/* Class battle (teachers/admins) */}
          {canHostClassBattle && (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">{t(`${M}.classBattle`)}</Label>
                </div>
                <Switch checked={classBattle} onCheckedChange={setClassBattle} />
              </div>
              {classBattle && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">{t(`${M}.targetClass`)}</Label>
                  <ClassBattleTargetCombobox
                    classes={classes}
                    rosters={rosters}
                    value={targetClassId ? `class:${targetClassId}` : targetPresetId ? `preset:${targetPresetId}` : ""}
                    onChange={(v) => {
                      const [kind, id] = v.split(":");
                      setTargetClassId(kind === "class" ? id : "");
                      setTargetPresetId(kind === "preset" ? id : "");
                    }}
                    placeholder={t(`${M}.selectClass`)}
                    emptyLabel={t(`${M}.noTargets`)}
                    searchPlaceholder={t(`${M}.searchTargets`)}
                    rostersLabel={t(`${M}.groupRosters`)}
                    rosterCountLabel={(count) => t(`${M}.rosterStudentsCount`, { count })}
                  />
                </div>
              )}
            </>
          )}

          <Button className="w-full" onClick={handleCreate}>
            <Swords className="mr-2 h-4 w-4" />
            {t(`${M}.createAndHost`)}
          </Button>
        </CardContent>
      </Card>

      {/* Join room */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DoorOpen className="h-5 w-5" />
            {t(`${M}.joinRoom`)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">{t(`${M}.enterCode`)}</Label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={6}
              className="font-mono text-lg tracking-[0.3em]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
          </div>
          <Button onClick={handleJoin}>{t(`${M}.join`)}</Button>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onExit}>
          {t(`${M}.back`)}
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * Game rules card shown in the battle room while players wait for the host to
 * start. Summarises the match config (mode, difficulty, timed) and explains
 * the scoring formula (base points, speed bonus, streak bonus, hint policy,
 * wrong-answer penalty) so players know the rules before play begins.
 *
 * The per-word time limits mirror `WORD_DURATION_MS` in
 * `realtime/src/game/scoring.ts` (and the arena's local mirror). The hint
 * policy (cap = 3, escalating 10/20/30) mirrors `MAX_HINTS_PER_WORD` /
 * `HINT_COSTS`. Keep all three sites in sync.
 */
function GameRulesCard({ config }: { config: BattleRoomConfig | null }) {
  const { t } = useTranslation();
  const gameMode = config?.gameMode ?? "listen-type";
  const difficulty = config?.difficulty ?? "medium";
  const timed = config?.timed ?? false;

  // Per-word time label. For mixed mode the per-word mode is randomised
  // server-side, so show the min–max range across the three base modes.
  let timeLabel: string | null = null;
  if (timed) {
    if (gameMode === "mixed") {
      const secs = BASE_MODES.map((m) => WORD_DURATION_MS[m][difficulty] / 1000);
      const min = Math.min(...secs);
      const max = Math.max(...secs);
      timeLabel = min === max ? `${min}s` : t(`${M}.rulesTimeRange`, { min, max });
    } else {
      timeLabel = `${WORD_DURATION_MS[gameMode][difficulty] / 1000}s`;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ScrollText className="h-4 w-4" />
        {t(`${M}.rulesTitle`)}
      </div>

      {/* Match setup summary */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
        <SetupItem label={t(`${M}.rulesMode`)} value={t(`reading.glossary.spelling.modes.${gameMode}`)} />
        <SetupItem label={t(`${M}.rulesDifficulty`)} value={t(`reading.glossary.spelling.difficulty.${difficulty}`)} />
        {timeLabel && <SetupItem label={t(`${M}.rulesTimePerWord`)} value={timeLabel} icon={<Timer className="h-3 w-3" />} />}
        <SetupItem
          label={t(`${M}.rulesTimed`)}
          value={timed ? t(`${M}.rulesTimedOn`) : t(`${M}.rulesTimedOff`)}
        />
      </div>

      {/* Scoring rules */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t(`${M}.rulesScoring`)}
        </div>
        <RuleRow
          icon={<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
          title={t(`${M}.rulesCorrect`)}
          desc={t(`${M}.rulesCorrectDesc`)}
        />
        {timed && (
          <RuleRow
            icon={<Zap className="h-4 w-4 shrink-0 text-amber-500" />}
            title={t(`${M}.rulesSpeedBonus`)}
            desc={t(`${M}.rulesSpeedBonusDesc`)}
          />
        )}
        <RuleRow
          icon={<Flame className="h-4 w-4 shrink-0 text-orange-500" />}
          title={t(`${M}.rulesStreak`)}
          desc={t(`${M}.rulesStreakDesc`)}
        />
        <RuleRow
          icon={<Lightbulb className="h-4 w-4 shrink-0 text-yellow-500" />}
          title={t(`${M}.rulesHints`)}
          desc={t(`${M}.rulesHintsDesc`)}
          note={t(`${M}.rulesHintNote`)}
        />
        <RuleRow
          icon={<XCircle className="h-4 w-4 shrink-0 text-destructive" />}
          title={t(`${M}.rulesWrong`)}
          desc={t(`${M}.rulesWrongDesc`)}
        />
      </div>
    </div>
  );
}

function SetupItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1 font-medium">
        {icon}
        {value}
      </div>
    </div>
  );
}

function RuleRow({
  icon,
  title,
  desc,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-card p-2">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
        {note && (
          <div className="mt-0.5 text-[10px] italic text-muted-foreground/80">{note}</div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ player, currentUserId }: { player: BattlePlayerSummary; currentUserId?: string }) {
  const { t } = useTranslation();
  const isMe = player.userId === currentUserId;
  const initials = (player.name ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-2 ${isMe ? "border-primary/40 bg-primary/5" : ""}`}>
      <Avatar className="h-8 w-8">
        {player.image && <AvatarImage src={player.image} alt={player.name ?? ""} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 truncate text-sm">
        <span className="font-medium">{player.name ?? t("reading.glossary.spelling.multiplayer.anonymous")}</span>
        {isMe && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {t("reading.glossary.spelling.multiplayer.you")}
          </Badge>
        )}
      </div>
      {player.status === "disconnected" && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {t("reading.glossary.spelling.multiplayer.disconnected")}
        </Badge>
      )}
      {player.isHost && (
        <Crown className="h-4 w-4 text-amber-500" />
      )}
    </div>
  );
}

function ErrorBanner({
  code,
  t,
  onDismiss,
}: {
  code: string;
  t: (key: string) => string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{t(`reading.glossary.spelling.multiplayer.errors.${code}`)}</span>
      <Button size="sm" variant="ghost" onClick={onDismiss}>
        ✕
      </Button>
    </div>
  );
}

function ClassInviteBanner({ onAccept }: { onAccept: () => void }) {
  const { t } = useTranslation();
  const invite = useBattleStore((s) => s.classInvite);
  if (!invite) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/10 p-3 animate-glow-pulse">
      <Swords className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-medium">
          {invite.hostName ?? t(`${M}.aTeacher`)} — {t(`${M}.classInviteTitle`)}
        </p>
        <p className="text-xs text-muted-foreground">
          {invite.className ? `${invite.className} · ` : ""}
          {invite.actualWordCount} {t(`${M}.words`)} · {invite.difficulty}
        </p>
      </div>
      <Button size="sm" onClick={onAccept}>
        {t(`${M}.join`)}
      </Button>
    </div>
  );
}
