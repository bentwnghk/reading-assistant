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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./OverviewTab";
import SessionsTab from "./SessionsTab";

interface DashboardProps {
  open: boolean;
  onClose: () => void;
}

export default function Dashboard({ open, onClose }: DashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

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
            <Popover>
              <PopoverTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors ml-auto" />
              </PopoverTrigger>
              <PopoverContent className="w-[300px] max-w-[calc(100vw-3rem)]" align="start">
                <div className="space-y-3 text-sm">
                  <h4 className="font-semibold text-base">{t("dashboard.help.title")}</h4>
                  <div className="space-y-2">
                    <p className="text-muted-foreground">{t("dashboard.help.purpose")}</p>
                    <p className="text-muted-foreground">{t("dashboard.help.features")}</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("dashboard.description")}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
          <TabsContent value="sessions" className="mt-4">
            <SessionsTab onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
