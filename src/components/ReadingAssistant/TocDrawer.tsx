"use client";
import { useTranslation } from "react-i18next";
import {
  User,
  Upload,
  FileText,
  Brain,
  PenTool,
  Target,
  BookOpen,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReadingStore } from "@/store/reading";
import { cn } from "@/utils/style";

interface TocDrawerProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    id: "section-student-info",
    icon: User,
    labelKey: "toc.studentInfo",
    checkCompleted: () => true,
    isAccessible: () => true,
  },
  {
    id: "section-upload",
    icon: Upload,
    labelKey: "toc.upload",
    checkCompleted: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.extractedText,
    isAccessible: () => true,
  },
  {
    id: "section-summary",
    icon: FileText,
    labelKey: "toc.summary",
    checkCompleted: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.summary,
    isAccessible: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.extractedText,
  },
  {
    id: "section-mindmap",
    icon: Brain,
    labelKey: "toc.mindmap",
    checkCompleted: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.mindMap,
    isAccessible: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.extractedText,
  },
  {
    id: "section-adapted",
    icon: PenTool,
    labelKey: "toc.adapted",
    checkCompleted: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.adaptedText,
    isAccessible: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.extractedText,
  },
  {
    id: "section-test",
    icon: Target,
    labelKey: "toc.test",
    checkCompleted: (store: ReturnType<typeof useReadingStore.getState>) =>
      store.testCompleted,
    isAccessible: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.extractedText,
  },
  {
    id: "section-glossary",
    icon: BookOpen,
    labelKey: "toc.glossary",
    checkCompleted: (store: ReturnType<typeof useReadingStore.getState>) =>
      store.glossary.length > 0,
    isAccessible: (store: ReturnType<typeof useReadingStore.getState>) =>
      !!store.extractedText,
  },
];

function TocDrawer({ open, onClose }: TocDrawerProps) {
  const { t } = useTranslation();
  const store = useReadingStore();

  function handleSectionClick(id: string, accessible: boolean) {
    if (!accessible) return;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onClose();
  }

  function handleClose(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{t("toc.title")}</DialogTitle>
          <DialogDescription>{t("toc.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <nav className="space-y-1 py-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isCompleted = section.checkCompleted(store);
              const isAccessible = section.isAccessible(store);
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id, isAccessible)}
                  disabled={!isAccessible}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !isAccessible && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{t(section.labelKey)}</span>
                  {isCompleted && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default TocDrawer;
