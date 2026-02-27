"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { X, Send, Loader2, Trash2, Maximize2, Minimize2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import ChatMessageBubble from "./ChatMessageBubble";
import QuickQuestions from "./QuickQuestions";
import { cn } from "@/utils/style";

interface ReadingTutorChatProps {
  initialSelectedText?: string;
  onClose?: () => void;
}

function ReadingTutorChat({ initialSelectedText, onClose }: ReadingTutorChatProps) {
  const { t } = useTranslation();
  const { chatHistory, addChatMessage, clearChatHistory, extractedText } = useReadingStore();
  const { askTutor } = useReadingAssistant();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (initialSelectedText && inputRef.current) {
      inputRef.current.focus();
    }
  }, [initialSelectedText]);

  const handleSend = async (question?: string, selectedText?: string) => {
    const messageText = question || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: messageText,
      timestamp: Date.now(),
      selectedText: selectedText || initialSelectedText,
    };

    addChatMessage(userMessage);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    const response = await askTutor(
      messageText,
      selectedText || initialSelectedText,
      (chunk) => setStreamingContent(chunk)
    );

    if (response) {
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
      addChatMessage(assistantMessage);
    }

    setIsLoading(false);
    setStreamingContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    clearChatHistory();
  };

  if (!extractedText) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl transition-all duration-300 print:hidden",
        isExpanded
          ? "inset-4 md:inset-8 max-w-none"
          : "w-[95vw] max-w-md h-[70vh] max-h-[600px]"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">{t("reading.tutor.title")}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        {chatHistory.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("reading.tutor.welcome")}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {t("reading.tutor.welcomeHint")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {chatHistory.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isLoading && streamingContent && (
              <ChatMessageBubble
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  timestamp: Date.now(),
                }}
                isStreaming
              />
            )}
            {isLoading && !streamingContent && (
              <div className="flex items-center gap-2 p-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("reading.tutor.thinking")}</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <QuickQuestions
        onSelectQuestion={(q) => handleSend(q)}
        disabled={isLoading}
      />

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("reading.tutor.inputPlaceholder")}
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            disabled={isLoading}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="h-10 w-10"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            {chatHistory.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearHistory}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title={t("reading.tutor.clearHistory")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        {initialSelectedText && (
          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 truncate">
            {t("reading.tutor.aboutSelection")}: &ldquo;{initialSelectedText}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

export default ReadingTutorChat;
