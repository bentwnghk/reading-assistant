import { useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSettingStore } from "@/store/setting";
import { useReadingStore } from "@/store/reading";
import { compareText, type PronunciationResult, type VerboseTranscriptionResponse } from "@/utils/pronunciationScore";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { logActivity } from "@/utils/activityLogger";

interface UseReadingAloudReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  result: PronunciationResult | null;
  error: string | null;
  startRecording: (paragraphIndex: number) => Promise<void>;
  stopRecording: () => void;
  clearResult: () => void;
  bestScores: Record<number, number>;
}

export function useReadingAloud(): UseReadingAloudReturn {
  const { mode, openaicompatibleApiProxy, openaicompatibleApiKey, accessPassword } =
    useSettingStore();
  const { id: sessionId, extractedText, addPronunciationAttempt } =
    useReadingStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bestScores, setBestScores] = useState<Record<number, number>>({});

  const { t } = useTranslation();

  const paragraphs = useMemo(() => {
    if (!extractedText) return [];
    return extractedText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [extractedText]);

  const transcribeAudio = useCallback(
    async (audioBlob: Blob): Promise<VerboseTranscriptionResponse> => {
      setIsTranscribing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("model", "whisper");
        formData.append("language", "en");
        formData.append("response_format", "verbose_json");
        formData.append("timestamp_granularities[]", "word");

        const headers: HeadersInit = {};
        let url: string;

        if (mode === "local") {
          url = `${completePath(openaicompatibleApiProxy, "/v1")}/audio/transcriptions`;
          if (openaicompatibleApiKey) {
            headers["Authorization"] = `Bearer ${openaicompatibleApiKey}`;
          }
        } else {
          url = "/api/ai/openaicompatible/v1/audio/transcriptions";
          if (accessPassword) {
            headers["Authorization"] = `Bearer ${generateSignature(accessPassword, Date.now())}`;
          }
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`STT failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data as VerboseTranscriptionResponse;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(msg);
      } finally {
        setIsTranscribing(false);
      }
    },
    [mode, openaicompatibleApiProxy, openaicompatibleApiKey, accessPassword]
  );

  const startRecording = useCallback(
    async (paragraphIndex: number) => {
      if (isRecording) return;
      setError(null);
      setResult(null);

      const original = paragraphs[paragraphIndex];
      if (!original) return;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setError(t("reading.readingAloud.permissionDenied"));
        } else {
          setError(t("reading.readingAloud.noMicrophone"));
        }
        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }

      const recorderOptions: MediaRecorderOptions = mimeType
        ? { mimeType }
        : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);

        const blobType = mimeType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: blobType });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        try {
          const sttResponse = await transcribeAudio(audioBlob);
          const transcript = sttResponse.text || "";
          if (!transcript.trim()) {
            setError(t("reading.readingAloud.emptyTranscript"));
            return;
          }

          const pronunciationResult = compareText(original, transcript, paragraphIndex, sttResponse);
          setResult(pronunciationResult);
          addPronunciationAttempt(pronunciationResult);

          setBestScores((prev) => {
            const existing = prev[paragraphIndex] ?? 0;
            if (pronunciationResult.accuracy > existing) {
              return { ...prev, [paragraphIndex]: pronunciationResult.accuracy };
            }
            return prev;
          });

          logActivity("reading_aloud", {
            sessionId: sessionId || undefined,
            score: pronunciationResult.accuracy,
            details: { wordCount: pronunciationResult.totalWords },
          });
        } catch (err) {
          console.error("Reading aloud error:", err);
          setError(t("reading.readingAloud.processingFailed"));
        }
      };

      mediaRecorder.onerror = () => {
        setIsRecording(false);
        setError(t("reading.readingAloud.recordingFailed"));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, 60000);
    },
    [
      isRecording,
      paragraphs,
      t,
      transcribeAudio,
      sessionId,
      addPronunciationAttempt,
    ]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isRecording,
    isTranscribing,
    recordingDuration,
    result,
    error,
    startRecording,
    stopRecording,
    clearResult,
    bestScores,
  };
}
