"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { Button } from "@/components/ui/button";

function ImageViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const index = parseInt(searchParams.get("index") || "0", 10);
  const originalImages = useReadingStore((s) => s.originalImages);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      router.replace(`/image-viewer?index=${index - 1}`);
    }
  }, [index, router]);

  const goNext = useCallback(() => {
    if (index < originalImages.length - 1) {
      router.replace(`/image-viewer?index=${index + 1}`);
    }
  }, [index, originalImages.length, router]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (Math.abs(dx) < 50) return;
    if (dx > 0) {
      goPrev();
    } else {
      goNext();
    }
  }, [goPrev, goNext]);

  useEffect(() => {
    if (index < 0 || index >= originalImages.length) {
      goBack();
    }
  }, [index, originalImages.length, goBack]);

  if (index < 0 || index >= originalImages.length) {
    return null;
  }

  const src = originalImages[index];
  const total = originalImages.length;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-9 w-9"
          onClick={goBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-white text-sm font-medium tabular-nums">
          {index + 1} / {total}
        </span>
        <div className="w-9" />
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={index}
          src={src}
          alt={`Image ${index + 1}`}
          className="w-full h-full object-contain"
          onLoad={() => setLoaded(true)}
        />
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-3 px-3 py-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            disabled={index <= 0}
            onClick={goPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            disabled={index >= total - 1}
            onClick={goNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ImageViewer() {
  return (
    <Suspense>
      <ImageViewerContent />
    </Suspense>
  );
}
