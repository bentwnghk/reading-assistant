"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Sword, Copy, X, Users, ArrowRight } from "lucide-react";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useBattleStore } from "@/store/battle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const M = "reading.glossary.spelling.multiplayer";

export function ClassBattleInviteDialog() {
  const { t } = useTranslation();
  const router = useRouter();
  const show = useBattleStore((s) => s.showClassBattleInviteDialog);
  const invites = useBattleStore((s) => s.pendingClassBattleInvites);
  const setShow = useBattleStore((s) => s.setShowClassBattleInviteDialog);
  const setShouldOpenBattle = useBattleStore((s) => s.setShouldOpenBattle);
  const setClassInvite = useBattleStore((s) => s.setClassInvite);
  const dismiss = useBattleStore((s) => s.dismissClassBattleInvite);

  const handleCopy = useCallback((code: string) => {
    copy(code);
    toast.success(t(`${M}.codeCopied`));
  }, [t]);

  const handleDismiss = useCallback((code: string) => {
    dismiss(code);
    const remaining = useBattleStore.getState().pendingClassBattleInvites.filter((i) => i.roomCode !== code);
    if (remaining.length === 0) setShow(false);
  }, [dismiss, setShow]);

  const handleJoinBattle = useCallback((code: string) => {
    // Carry the chosen invite into the lobby so the ClassInviteBanner renders
    // a one-click "Join" (→ joinRoom(code)). Without this the user lands in the
    // lobby with the code they already saw but no way to use it short of
    // retyping it — and a session-less user has no glossary to fall back on.
    const invite = invites.find((i) => i.roomCode === code);
    if (invite) setClassInvite(invite);
    setShouldOpenBattle(true);
    dismiss(code);
    setShow(false);
    router.push("/");
  }, [invites, setClassInvite, setShouldOpenBattle, dismiss, setShow, router]);

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5 text-primary" />
            {t(`${M}.classBattleInvites`)}
          </DialogTitle>
          <DialogDescription>{t(`${M}.classBattleInvitesDesc`)}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-3 pr-1">
            {invites.map((invite) => (
              <div key={invite.roomCode} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {invite.hostName ?? t(`${M}.aTeacher`)}
                    </p>
                    {invite.className && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {invite.className}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary">{invite.actualWordCount} {t(`${M}.words`)}</Badge>
                      <Badge variant="outline">{t(`reading.glossary.spelling.difficulty.${invite.difficulty}`)}</Badge>
                      <Badge variant="outline">{t(`reading.glossary.spelling.modes.${invite.gameMode ?? "listen-type"}`)}</Badge>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleDismiss(invite.roomCode)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {/* Room code + copy */}
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                  <span className="font-mono text-lg font-bold tracking-[0.3em]">{invite.roomCode}</span>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(invite.roomCode)}>
                    <Copy className="h-3 w-3 mr-1" />
                    {t(`${M}.copyCode`)}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t(`${M}.howToJoin`)}</p>
                <Button
                  onClick={() => handleJoinBattle(invite.roomCode)}
                  className="w-full"
                  size="sm"
                >
                  {t(`${M}.joinBattle`)}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
            {invites.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t(`${M}.noInvites`)}</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
