"use client";
import { useTranslation } from "react-i18next";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Check,
  ClipboardCheck,
  FileText,
  ImageIcon,
  Layers,
  Sparkles,
  Upload,
  User,
  Waypoints,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReadingStore } from "@/store/reading";
import { cn } from "@/utils/style";

interface SectionNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReadingStoreState = ReturnType<typeof useReadingStore.getState>;

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
    checkCompleted: (store: ReadingStoreState) => !!store.extractedText,
    isAccessible: () => true,
  },
  {
    id: "section-pre-reading",
    icon: Sparkles,
    labelKey: "toc.preReading",
    checkCompleted: (store: ReadingStoreState) => !!store.preReading,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-summary",
    icon: FileText,
    labelKey: "toc.summary",
    checkCompleted: (store: ReadingStoreState) => !!store.summary,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-mindmap",
    icon: Waypoints,
    labelKey: "toc.mindmap",
    checkCompleted: (store: ReadingStoreState) => !!store.mindMap,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-visualization",
    icon: ImageIcon,
    labelKey: "toc.visualization",
    checkCompleted: (store: ReadingStoreState) => !!store.visualizationImage,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-adapted",
    icon: BookOpen,
    labelKey: "toc.adapted",
    checkCompleted: (store: ReadingStoreState) => !!store.adaptedText,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-glossary",
    icon: BookMarked,
    labelKey: "toc.glossary",
    checkCompleted: (store: ReadingStoreState) => store.glossary.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-collocations",
    icon: Layers,
    labelKey: "toc.collocations",
    checkCompleted: (store: ReadingStoreState) => store.collocations.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-test",
    icon: ClipboardCheck,
    labelKey: "toc.test",
    checkCompleted: (store: ReadingStoreState) => store.testCompleted,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
  {
    id: "section-grammar",
    icon: BookOpenCheck,
    labelKey: "toc.grammar",
    checkCompleted: (store: ReadingStoreState) => store.grammarTopics.length > 0,
    isAccessible: (store: ReadingStoreState) => !!store.extractedText,
  },
];

function SectionNavSheet({ open, onOpenChange }: SectionNavSheetProps) {
  const { t } = useTranslation();
  const store = useReadingStore();

  function handleSectionClick(id: string, accessible: boolean) {
    if (!accessible) return;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onOpenChange(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r bg-background shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left"
          )}
        >
          <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
            <div>
              <DialogPrimitive.Title className="text-left text-xl font-semibold flex items-center gap-1.5">
                <span className="text-blue-600 dark:text-blue-400">Mr.</span>
                <span className="text-2xl leading-none">🆖</span>
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold relative overflow-hidden">
                  ProReader
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer" />
                </span>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1.5">
                {t("toc.description")}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <ScrollArea className="flex-1 min-h-0 border-t">
            <nav className="space-y-1 p-2">
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default SectionNavSheet;
