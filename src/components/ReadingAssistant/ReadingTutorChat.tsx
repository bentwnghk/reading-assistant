"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { X, Send, Loader2, Trash2, Maximize2, Minimize2, MessageCircle, ImagePlus, X as XIcon, Languages, TextSelect, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import GuideDialog from "@/components/Internal/GuideDialog";
import { Switch } from "@/components/ui/switch";
import { useReadingStore } from "@/store/reading";
import { useGlobalStore } from "@/store/global";
import { useSettingStore } from "@/store/setting";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import ChatMessageBubble from "./ChatMessageBubble";
import QuickQuestions from "./QuickQuestions";
import { cn } from "@/utils/style";
import { logChatQuestion } from "@/utils/chatQuestionLogger";
import { logActivity } from "@/utils/activityLogger";

interface ReadingTutorChatProps {
  onClose?: () => void;
}

function readImageFiles(files: File[]): Promise<string[]> {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  return Promise.all(
    imageFiles.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        })
    )
  ).then((results) => results.filter(Boolean));
}

function ReadingTutorChat({ onClose }: ReadingTutorChatProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { chatHistory, addChatMessage, removeChatMessage, clearChatHistory, extractedText, id: sessionId, docTitle, activeGenerations } = useReadingStore();
  const { tutorChatSelectedText, setTutorChatSelectedText } = useGlobalStore();
  const { tutorLanguage, update } = useSettingStore();
  const { askTutor } = useReadingAssistant();
  
  const useChinese = tutorLanguage === "zh";
  
  const [input, setInput] = useState("");
  const isLoading = !!activeGenerations["tutor"];
  const [streamingContent, setStreamingContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingQuestionForImage, setPendingQuestionForImage] = useState<{ question: string; displayLabel?: string } | null>(null);
  
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, streamingContent, scrollToBottom]);

  // Auto-focus the input when the dialog first opens with pre-selected text.
  // We capture the initial value in a ref so this runs only on mount.
  // Running focus() on every tutorChatSelectedText change would call
  // inputRef.current.focus() while the user is mid-drag on desktop, which
  // steals browser focus and cancels the ongoing mouse selection.
  const initialSelectedTextRef = useRef(tutorChatSelectedText);
  useEffect(() => {
    if (initialSelectedTextRef.current && inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const questionForImage = pendingQuestionForImage;
    if (questionForImage) {
      setPendingQuestionForImage(null);
    }

    const newImages = await readImageFiles(Array.from(files));
    e.target.value = "";

    if (newImages.length === 0) return;

    if (questionForImage && !isLoading) {
      handleSendWithImages(questionForImage.question, newImages, questionForImage.displayLabel);
    } else {
      setPendingImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleSendWithImages = async (question: string, images: string[], displayLabel?: string) => {
    const contextText = tutorChatSelectedText;

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: displayLabel || question,
      promptContent: displayLabel ? question : undefined,
      timestamp: Date.now(),
      selectedText: contextText,
      images: images.length > 0 ? images : undefined,
    };

    addChatMessage(userMessage);
    setStreamingContent("");
    setTutorChatSelectedText("");

    const response = await askTutor(
      question,
      chatHistory,
      contextText,
      images.length > 0 ? images : undefined,
      (chunk) => setStreamingContent(chunk),
      useChinese
    );

    if (response) {
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
      addChatMessage(assistantMessage);
      
      if (session?.user?.id && question.trim()) {
        logChatQuestion({
          questionText: question,
          responseText: response,
          sessionId: sessionId || undefined,
          docTitle: docTitle || undefined,
        });
        logActivity("ai_tutor_question", { sessionId: sessionId || undefined });
      }
    } else {
      removeChatMessage(userMessage.id);
    }

    setStreamingContent("");
  };

  // Keep a ref to the latest handleSendWithImages so the paste listener below
  // does not need its (per-render) identity in its dependency array.
  const sendWithImagesRef = useRef(handleSendWithImages);
  useEffect(() => {
    sendWithImagesRef.current = handleSendWithImages;
  });

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (question?: string, selectedText?: string, images?: string[], displayLabel?: string) => {
    const messageText = question || input.trim();
    const imagesToUse = images || pendingImages;
    if ((!messageText && imagesToUse.length === 0) || isLoading) return;

    const contextText = selectedText || tutorChatSelectedText;

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: displayLabel || messageText || t("reading.tutor.imageOnly"),
      promptContent: displayLabel && messageText ? messageText : undefined,
      timestamp: Date.now(),
      selectedText: contextText,
      images: imagesToUse.length > 0 ? imagesToUse : undefined,
    };

    addChatMessage(userMessage);
    setInput("");
    const imagesToSend = [...imagesToUse];
    if (!images) {
      setPendingImages([]);
    }
    setStreamingContent("");
    setTutorChatSelectedText("");

    const response = await askTutor(
      messageText || "What is in this image?",
      chatHistory,
      contextText,
      imagesToSend.length > 0 ? imagesToSend : undefined,
      (chunk) => setStreamingContent(chunk),
      useChinese
    );

    if (response) {
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
      addChatMessage(assistantMessage);
      
      if (session?.user?.id && messageText?.trim()) {
        logChatQuestion({
          questionText: messageText,
          responseText: response,
          sessionId: sessionId || undefined,
          docTitle: docTitle || undefined,
        });
        logActivity("ai_tutor_question", { sessionId: sessionId || undefined });
      }
    } else {
      removeChatMessage(userMessage.id);
    }

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
    setPendingImages([]);
  };

  // Answer Help buttons never open the file picker themselves. If an image is
  // already waiting (added via the "Add image" button or pasted), the request
  // is sent to the LLM immediately. Otherwise the question is armed and sends
  // automatically as soon as an image is added or pasted (see handleImageUpload
  // and the paste listener).
  const handleQuickQuestionSelect = (question: string, action?: "text" | "upload-image", displayLabel?: string) => {
    if (action === "upload-image") {
      if (pendingImages.length > 0) {
        const images = pendingImages;
        setPendingImages([]);
        handleSendWithImages(question, images, displayLabel);
      } else {
        setPendingQuestionForImage({ question, displayLabel });
      }
    } else {
      handleSend(question, undefined, undefined, displayLabel);
    }
  };

  // Accept pasted images (screenshots, browser-copied images) while the tutor
  // chat is open. If one of the Answer Help buttons armed a pending question,
  // the pasted image is sent with that question (mirroring handleImageUpload);
  // otherwise it joins the pending image strip above the input. Text pastes
  // keep their default behavior.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isLoading || e.defaultPrevented) return;
      // Pastes inside an open dialog (e.g. Upload Text to Repository) belong
      // to that dialog's own paste handler.
      if (e.target instanceof Element && e.target.closest("[role=dialog]")) return;
      const imageFiles = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (imageFiles.length === 0) return;
      e.preventDefault();
      readImageFiles(imageFiles).then((newImages) => {
        if (newImages.length === 0) return;
        const questionForImage = pendingQuestionForImage;
        if (questionForImage) {
          setPendingQuestionForImage(null);
          sendWithImagesRef.current(questionForImage.question, newImages, questionForImage.displayLabel);
        } else {
          setPendingImages((prev) => [...prev, ...newImages]);
        }
      });
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isLoading, pendingQuestionForImage]);

  if (!extractedText) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl transition-all duration-300 print:hidden",
        isExpanded
          ? "inset-4 md:inset-8 max-w-none"
          : "w-[95vw] max-w-md h-[70vh] max-h-[600px] tablet:h-[80vh] tablet:max-h-[900px] supports-[height:100dvh]:h-[70dvh] supports-[height:100dvh]:tablet:h-[80dvh]"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {t("reading.tutor.title")}
            <GuideDialog
              titleKey="reading.tutor.help.title"
              introKey="reading.tutor.help.intro"
              itemsBaseKey="reading.tutor.help.items"
              items={[
                { key: "context", icon: MessageCircle, bgClass: "bg-primary/10", iconClass: "text-primary" },
                { key: "selection", icon: TextSelect, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
                { key: "image", icon: ImagePlus, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
                { key: "quick", icon: Lightbulb, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
              ]}
              stepsTitleKey="reading.tutor.help.stepsTitle"
              stepsKeys={[
                "reading.tutor.help.steps.s1",
                "reading.tutor.help.steps.s2",
                "reading.tutor.help.steps.s3",
                "reading.tutor.help.steps.s4",
              ]}
              tipTitleKey="reading.tutor.help.tipTitle"
              tipContentKey="reading.tutor.help.tipContent"
            />
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="flex items-center gap-1.5 mr-1 px-2 h-7 rounded-md border border-border bg-muted/40"
          >
            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={cn(
              "text-xs font-medium transition-colors",
              !useChinese ? "text-foreground" : "text-muted-foreground"
            )}>
              {t("reading.tutor.languageEnglish")}
            </span>
            <Switch
              checked={useChinese}
              onCheckedChange={(checked) => update({ tutorLanguage: checked ? "zh" : "en" })}
              disabled={isLoading}
              className="h-4 w-7 data-[state=checked]:bg-primary"
            />
            <span className={cn(
              "text-xs font-medium transition-colors",
              useChinese ? "text-foreground" : "text-muted-foreground"
            )}>
              {t("reading.tutor.languageChinese")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            onTouchEnd={(e) => { e.preventDefault(); setIsExpanded((v) => !v); }}
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
              onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
              className="h-7 w-7"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div 
        ref={scrollViewportRef}
        className="flex-1 overflow-y-auto"
      >
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
      </div>

      <QuickQuestions
        onSelectQuestion={handleQuickQuestionSelect}
        disabled={isLoading}
      />

      <div className="p-3 border-t border-border">
        {tutorChatSelectedText && (
          <div className="mb-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded px-2 py-1.5 font-medium flex items-center gap-1">
            <span className="truncate">{t("reading.tutor.aboutSelection")}: &ldquo;{tutorChatSelectedText}&rdquo;</span>
            <button
              type="button"
              onClick={() => setTutorChatSelectedText("")}
              onTouchEnd={(e) => { e.preventDefault(); setTutorChatSelectedText(""); }}
              className="flex-shrink-0 hover:bg-primary/20 rounded p-0.5 transition-colors"
              title={t("reading.tutor.removeSelection")}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        )}
        {pendingQuestionForImage && (
          <div className="mb-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1.5 font-medium flex items-center gap-1">
            <span className="truncate">
              {t("reading.tutor.imageQuestionArmed", {
                label: pendingQuestionForImage.displayLabel || pendingQuestionForImage.question,
              })}
            </span>
            <button
              type="button"
              onClick={() => setPendingQuestionForImage(null)}
              onTouchEnd={(e) => { e.preventDefault(); setPendingQuestionForImage(null); }}
              className="flex-shrink-0 hover:bg-orange-500/20 rounded p-0.5 transition-colors"
              title={t("reading.tutor.cancelImageQuestion")}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        )}
        {pendingImages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingImages.map((img, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Pending ${index + 1}`}
                  className="h-16 w-16 object-cover rounded border border-border"
                />
                <button
                  type="button"
                  onClick={() => removePendingImage(index)}
                  onTouchEnd={(e) => { e.preventDefault(); removePendingImage(index); }}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            onTouchEnd={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
            disabled={isLoading}
            className="h-10 w-10 flex-shrink-0"
            title={t("reading.tutor.addImage")}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
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
              onTouchEnd={(e) => { e.preventDefault(); handleSend(); }}
              disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
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
                onTouchEnd={(e) => { e.preventDefault(); handleClearHistory(); }}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title={t("reading.tutor.clearHistory")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReadingTutorChat;
