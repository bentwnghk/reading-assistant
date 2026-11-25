"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, HelpCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./OverviewTab";
import SessionsTab from "./SessionsTab";
import DashboardGuide from "./DashboardGuide";

interface DashboardProps {
  open: boolean;
  onClose: () => void;
}

export default function Dashboard({ open, onClose }: DashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showHelp, setShowHelp] = useState(false);
  // Whether a dialog is stacked on top of this one (help guide, or the
  // SessionsTab share / create-assignment / confirm-switch dialogs).
  const [childDialogOpen, setChildDialogOpen] = useState(false);

  function handleClose(dialogOpen: boolean) {
    if (!dialogOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-lg:max-w-screen-sm max-w-screen-xl gap-2 max-sm:p-3 overflow-hidden"
        onInteractOutside={(e) => {
          // Stacked child dialogs (help guide, share, create-assignment,
          // confirm-switch): outside interactions belong to the top layer,
          // not this one — and the tap that closed a child can arrive here
          // after the child's layer unmounted mid-event (touch close race).
          if (childDialogOpen || showHelp) {
            e.preventDefault();
            return;
          }
          const target = e.detail.originalEvent.target as Node | null;
          if (target && !target.isConnected) e.preventDefault();
        }}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("dashboard.title")}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowHelp(true)}
              title={t("dashboard.help.title")}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("dashboard.description")}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 w-full">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              {t("dashboard.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex-1">
              <Clock className="h-4 w-4 mr-1.5" />
              {t("dashboard.tabs.sessions")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="sessions" className="mt-4 min-w-0">
            <SessionsTab
              onClose={onClose}
              onChildDialogOpenChange={setChildDialogOpen}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <DashboardGuide open={showHelp} onOpenChange={setShowHelp} />
    </Dialog>
  );
}
