"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Play, Square, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AVAILABLE_MODELS } from "@/store/setting";
import type { BackfillEvent } from "@/lib/backfill-titles";

interface LogEntry {
  kind: "change" | "error";
  id?: string;
  from?: string;
  to?: string;
  message?: string;
}

const PROVIDERS = [
  { value: "google", label: "Google (Gemini)" },
  { value: "openai", label: "OpenAI" },
  { value: "openaicompatible", label: "OpenAI Compatible" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "anthropic", label: "Anthropic" },
  { value: "xai", label: "xAI" },
  { value: "mistral", label: "Mistral" },
];

function suggestProvider(model: string): string | null {
  const m = model.toLowerCase();
  if (m.startsWith("gemini")) return "google";
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.startsWith("chatgpt"))
    return "openai";
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("deepseek")) return "deepseek";
  if (m.startsWith("grok")) return "xai";
  if (m.includes("mistral") || m.includes("magistral") || m.startsWith("codestral")) return "mistral";
  return null;
}

export default function BackfillTitlesTab() {
  const { t } = useTranslation();

  const [provider, setProvider] = useState("google");
  const [model, setModel] = useState("gemini-3-flash-preview");
  const [dryRun, setDryRun] = useState(true);
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [includeRepository, setIncludeRepository] = useState(false);
  const [concurrency, setConcurrency] = useState(3);
  const [maxChars, setMaxChars] = useState(2000);
  const [limit, setLimit] = useState(0);

  const [stats, setStats] = useState<{ total: number; readingSessions: number; textRepository: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, changed: 0, skipped: 0, failed: 0, table: "" });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ changed: number; skipped: number; failed: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [propagating, setPropagating] = useState(false);
  const [propagateResult, setPropagateResult] = useState<{ sharedSessions: number; assignments: number; chatQuestions: number } | null>(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({
        onlyEmpty: String(onlyEmpty),
        includeRepository: String(includeRepository),
      });
      const res = await fetch(`/api/admin/backfill-titles?${params}`);
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      toast.error(t("userManagement.backfill.statsError"));
    } finally {
      setLoadingStats(false);
    }
  }, [onlyEmpty, includeRepository, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleModelChange = (value: string) => {
    setModel(value);
    const suggested = suggestProvider(value);
    if (suggested) setProvider(suggested);
  };

  const startBackfill = async () => {
    setRunning(true);
    setFatal(null);
    setFinished(null);
    setLog([]);
    setProgress({ done: 0, total: 0, changed: 0, skipped: 0, failed: 0, table: "" });

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/admin/backfill-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, dryRun, onlyEmpty, includeRepository, concurrency, maxChars, limit }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setFatal(err.error || `HTTP ${res.status}`);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: BackfillEvent;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          handleEvent(event);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setFatal(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      fetchStats();
    }
  };

  const handleEvent = (event: BackfillEvent) => {
    switch (event.type) {
      case "table":
        setProgress((p) => ({ ...p, table: event.table, done: 0, total: event.count }));
        break;
      case "progress":
        setProgress({
          done: event.done,
          total: event.total,
          changed: event.changed,
          skipped: event.skipped,
          failed: event.failed,
          table: event.table,
        });
        if (event.change) {
          setLog((l) => [...l.slice(-199), { kind: "change", ...event.change }]);
        }
        if (event.error) {
          setLog((l) => [...l.slice(-199), { kind: "error", id: event.change?.id, message: event.error }]);
        }
        break;
      case "table-done":
        break;
      case "fatal":
        setFatal(event.message);
        break;
      case "done":
        setFinished({ changed: event.changed, skipped: event.skipped, failed: event.failed });
        break;
    }
  };

  const stopBackfill = () => {
    abortRef.current?.abort();
  };

  const propagate = async () => {
    setPropagating(true);
    setPropagateResult(null);
    try {
      const res = await fetch("/api/admin/backfill-titles/propagate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPropagateResult(data);
      toast.success(t("userManagement.backfill.propagateDone"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("userManagement.backfill.propagateError"));
    } finally {
      setPropagating(false);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const totalRows = stats?.total ?? 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("userManagement.backfill.description")}
      </div>

      {/* Configuration */}
      <div className="rounded-md border p-4 space-y-4">
        <h3 className="font-medium text-sm flex items-center gap-2">{t("userManagement.backfill.configTitle")}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("userManagement.backfill.provider")}</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("userManagement.backfill.model")}</Label>
            <Input value={model} onChange={(e) => handleModelChange(e.target.value)} list="backfill-models" />
            <datalist id="backfill-models">
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("userManagement.backfill.concurrency")}</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={concurrency}
              onChange={(e) => setConcurrency(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("userManagement.backfill.maxChars")}</Label>
            <Input
              type="number"
              min={100}
              max={8000}
              step={500}
              value={maxChars}
              onChange={(e) => setMaxChars(Math.max(100, Number(e.target.value) || 2000))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("userManagement.backfill.limit")}</Label>
            <Input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => setLimit(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-1.5 flex items-end">
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loadingStats || running} className="w-full">
              {loadingStats ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {t("userManagement.backfill.refreshCount")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          <div className="flex items-center gap-2">
            <Checkbox id="bf-dry" checked={dryRun} onCheckedChange={(v) => setDryRun(v === true)} />
            <Label htmlFor="bf-dry" className="text-xs cursor-pointer">
              {t("userManagement.backfill.dryRun")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="bf-empty" checked={onlyEmpty} onCheckedChange={(v) => setOnlyEmpty(v === true)} />
            <Label htmlFor="bf-empty" className="text-xs cursor-pointer">
              {t("userManagement.backfill.onlyEmpty")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="bf-repo" checked={includeRepository} onCheckedChange={(v) => setIncludeRepository(v === true)} />
            <Label htmlFor="bf-repo" className="text-xs cursor-pointer">
              {t("userManagement.backfill.includeRepository")}
            </Label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            {stats ? (
              <>
                {t("userManagement.backfill.rowsToProcess", { count: totalRows })}
                {includeRepository && (
                  <span className="text-xs ml-2">
                    ({stats.readingSessions} sessions / {stats.textRepository} repository)
                  </span>
                )}
              </>
            ) : (
              t("userManagement.backfill.counting")
            )}
          </p>
          {totalRows === 0 && stats && (
            <span className="text-xs text-muted-foreground">{t("userManagement.backfill.nothingToDo")}</span>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          {!running ? (
            <Button onClick={startBackfill} disabled={totalRows === 0 || !model.trim()}>
              <Play className="h-4 w-4 mr-1" />
              {dryRun ? t("userManagement.backfill.preview") : t("userManagement.backfill.start")}
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopBackfill}>
              <Square className="h-4 w-4 mr-1" />
              {t("userManagement.backfill.stop")}
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {(running || progress.done > 0 || fatal || finished) && (
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">
              {running ? t("userManagement.backfill.running") : finished ? t("userManagement.backfill.complete") : ""}
              {progress.table && <span className="text-xs text-muted-foreground ml-2">[{progress.table}]</span>}
              {dryRun && progress.done > 0 && (
                <span className="text-xs text-amber-600 ml-2">{t("userManagement.backfill.dryRunBadge")}</span>
              )}
            </h3>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-600 font-medium">{t("userManagement.backfill.changed")}: {progress.changed}</span>
              <span className="text-muted-foreground">{t("userManagement.backfill.skipped")}: {progress.skipped}</span>
              <span className="text-red-600 font-medium">{t("userManagement.backfill.failed")}: {progress.failed}</span>
            </div>
          </div>

          {progress.total > 0 && (
            <div className="space-y-1">
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground text-right">
                {progress.done} / {progress.total} ({pct}%)
              </p>
            </div>
          )}

          {fatal && (
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{fatal}</span>
            </div>
          )}

          {finished && !fatal && (
            <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {t("userManagement.backfill.summary", {
                  changed: finished.changed,
                  skipped: finished.skipped,
                  failed: finished.failed,
                })}
              </span>
            </div>
          )}

          {log.length > 0 && (
            <ScrollArea className="h-40 w-full rounded-md border bg-background">
              <div className="p-2 space-y-0.5 font-mono text-xs">
                {log.map((entry, i) =>
                  entry.kind === "change" ? (
                    <div key={i} className="text-muted-foreground">
                      <span className="text-muted-foreground/60">{entry.id}</span>{" "}
                      <span className="line-through">{entry.from || "(empty)"}</span>{" "}
                      <ArrowRight className="inline h-3 w-3" />{" "}
                      <span className="text-foreground font-medium">{entry.to}</span>
                    </div>
                  ) : (
                    <div key={i} className="text-red-600 dark:text-red-400">
                      <span className="text-muted-foreground/60">{entry.id ?? "—"}</span> {entry.message}
                    </div>
                  ),
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Propagate */}
      <div className="rounded-md border p-4 space-y-3">
        <div>
          <h3 className="font-medium text-sm">{t("userManagement.backfill.propagateTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("userManagement.backfill.propagateDesc")}</p>
        </div>
        <Button variant="outline" onClick={propagate} disabled={propagating || running}>
          {propagating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          {t("userManagement.backfill.propagate")}
        </Button>
        {propagateResult && (
          <p className="text-sm text-muted-foreground">
            {t("userManagement.backfill.propagateResult", {
              sharedSessions: propagateResult.sharedSessions,
              assignments: propagateResult.assignments,
              chatQuestions: propagateResult.chatQuestions,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
