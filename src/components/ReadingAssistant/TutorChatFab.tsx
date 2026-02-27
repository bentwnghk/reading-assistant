"use client";
import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalStore } from "@/store/global";
import { useReadingStore } from "@/store/reading";
import dynamic from "next/dynamic";
import { cn } from "@/utils/style";

const ReadingTutorChat = dynamic(() => import("./ReadingTutorChat"), {
  ssr: false,
});

function TutorChatFab() {
  const { openTutorChat, setOpenTutorChat, tutorChatSelectedText, setTutorChatSelectedText } = useGlobalStore();
  const { extractedText } = useReadingStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    setOpenTutorChat(!openTutorChat);
    if (openTutorChat) {
      setTutorChatSelectedText("");
    }
  };

  const handleClose = () => {
    setOpenTutorChat(false);
    setTutorChatSelectedText("");
  };

  if (!mounted || !extractedText) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleToggle}
        className={cn(
          "fixed bottom-20 right-6 z-50 h-12 w-12 rounded-full shadow-lg print:hidden",
          "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          "transition-all duration-300",
          openTutorChat && "scale-0 opacity-0"
        )}
        size="icon"
        title="AI Tutor"
      >
        <MessageCircle className="w-5 h-5" />
      </Button>

      {openTutorChat && (
        <ReadingTutorChat
          initialSelectedText={tutorChatSelectedText}
          onClose={handleClose}
        />
      )}
    </>
  );
}

export default TutorChatFab;
