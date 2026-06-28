"use client";
import { useState, useEffect } from "react";
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
import { useGlobalStore } from "@/store/global";
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
  const dashboardInitialTab = useGlobalStore((s) => s.dashboardInitialTab);
  const setDashboardInitialTab = useGlobalStore((s) => s.setDashboardInitialTab);

  // When the dialog opens, honor any caller-requested initial tab (e.g. "sessions"
  // from the Assignments page's "Create assignment" button) and then clear the
  // intent so the next open returns to the default.
  useEffect(() => {
    if (open && dashboardInitialTab) {
      setActiveTab(dashboardInitialTab);
      setDashboardInitialTab("");
    }
  }, [open, dashboardInitialTab, setDashboardInitialTab]);

  function handleClose(dialogOpen: boolean) {
    if (!dialogOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-lg:max-w-screen-sm max-w-screen-xl gap-2 max-sm:p-3 overflow-hidden">
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
            <SessionsTab onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <DashboardGuide open={showHelp} onOpenChange={setShowHelp} />
    </Dialog>
  );
}
