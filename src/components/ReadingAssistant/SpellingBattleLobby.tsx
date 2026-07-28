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
import { toast } from "sonner";
import GuideDialog from "@/components/Internal/GuideDialog";

interface SpellingBattleLobbyProps {
  /** Current reading-session id (reading-page context); enables the "current glossary" source. */
  defaultGlossarySessionId?: string;
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

export function SpellingBattleLobby({ defaultGlossarySessionId, onExit }: SpellingBattleLobbyProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const battle = useSpellingBattle();

  const role = session?.user?.role;
  const canHostClassBattle = role === "teacher" || role === "admin" || role === "super-admin";

  // ── Create-form state ────────────────────────────────────────────────────
  const [sourceType, setSourceType] = useState<WordSourceType>(
    defaultGlossarySessionId ? "glossary" : "vocabulary",
  );
  const [vocabFilter, setVocabFilter] = useState<VocabularyFilter>("all");
  const [reviewListId, setReviewListId] = useState<string>("");
  const [gameMode, setGameMode] = useState<SpellingGameMode>("listen-type");
  const [difficulty, setDifficulty] = useState<SpellingDifficulty>("medium");
  const [wordCount, setWordCount] = useState(10);
  const [timed, setTimed] = useState(true);
  const [classBattle, setClassBattle] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>("");

  // ── Fetched data ─────────────────────────────────────────────────────────
  const [reviewLists, setReviewLists] = useState<{ id: string; name: string; wordCount: number }[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

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

  // Fetch classes (teachers/admins only — for class battles).
  useEffect(() => {
    if (!canHostClassBattle) return;
    fetch("/api/classes")
      .then((r) => (r.ok ? r.json() : []))
      .then((c: ClassInfo[]) => setClasses(c))
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
    }
  }, [sourceType, defaultGlossarySessionId, vocabFilter, reviewListId]);

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
    if (classBattle && !targetClassId) {
      toast.error(t(`${M}.errors.needClass`));
      return;
    }
    battle.clearError();
    battle.createRoom({
      config: { source, difficulty, gameMode, wordCount, timed, classBattle },
      targetClassId: classBattle ? targetClassId : undefined,
    });
  }, [buildSource, defaultGlossarySessionId, reviewListId, classBattle, targetClassId, difficulty, gameMode, wordCount, timed, battle, t]);

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
                  <SelectItem value="all">{t(`${M}.filterAll`)}</SelectItem>
                  <SelectItem value="due-for-review">{t(`${M}.filterDue`)}</SelectItem>
                  <SelectItem value="hard-words">{t(`${M}.filterHard`)}</SelectItem>
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
                  <Select value={targetClassId} onValueChange={setTargetClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t(`${M}.selectClass`)} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
    <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
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
