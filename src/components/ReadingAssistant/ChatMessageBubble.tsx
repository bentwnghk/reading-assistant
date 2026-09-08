"use client";
import { User, Bot, Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/style";
import { openImageInNewTab } from "@/utils/file";
import { Button } from "@/components/ui/button";
import View from "@/components/MagicDown/View";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

function ChatMessageBubble({ message, isStreaming }: ChatMessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-blue-500 text-white dark:bg-blue-600"
            : "bg-muted border border-border"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      <div
        className={cn(
          "flex-1 max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-blue-500 text-white rounded-tr-sm dark:bg-blue-600"
            : "bg-muted border border-border rounded-tl-sm"
        )}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.images.map((img, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Uploaded ${index + 1}`}
                  className="max-w-[120px] max-h-[120px] object-cover rounded border border-white/20"
                />
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 bg-green-100 dark:bg-secondary hover:bg-green-200 dark:hover:bg-secondary/80 text-green-800 dark:text-green-200"
                    title={t("reading.imageUpload.openInNewTab")}
                    onClick={() => openImageInNewTab(img)}
                    onTouchEnd={(e) => { e.preventDefault(); openImageInNewTab(img); }}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {message.selectedText && (
          <div
            className={cn(
              "text-xs mb-2 pb-2 border-b",
              isUser
                ? "border-white/20 text-white/70"
                : "border-border text-muted-foreground"
            )}
          >
            &ldquo;{message.selectedText}&rdquo;
          </div>
        )}
        <div
          className={cn(
            "text-sm prose prose-sm max-w-none",
            isUser
              ? "prose-invert [&_*]:text-white"
              : "dark:prose-invert"
          )}
        >
          <View>{message.content}</View>
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessageBubble;
