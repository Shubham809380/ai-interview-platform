import { useCallback, useEffect, useMemo, useRef, useState } from "react";
const FILLER_PATTERN = /\b(um+|uh+|like|actually|basically|you know)\b/gi;
const LONG_PAUSE_MS = 1600;
function getSpeechRecognitionClass() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}
function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}
function countFillers(text) {
  return (String(text || "").match(FILLER_PATTERN) || []).length;
}
export function useLiveTranscription() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [pauseCount, setPauseCount] = useState(0);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [clockTick, setClockTick] = useState(0);
  const recognitionRef = useRef(null);
  const lastResultAtRef = useRef(0);
  const restartRequestedRef = useRef(false);
  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionClass()));
  }, []);
  const stop = useCallback(() => {
    restartRequestedRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);
  const start = useCallback((options = {}) => {
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      setError("Live speech-to-text is not supported in this browser.");
      return false;
    }
    if (listening) {
      return true;
    }
    try {
      const requestedLang = String(options?.lang || language || "en-US").trim() || "en-US";
      const recognition = new SpeechRecognitionClass();
      recognition.lang = requestedLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      restartRequestedRef.current = true;
      setListening(true);
      setLanguage(requestedLang);
      setError("");
      if (!startedAt) {
        setStartedAt(Date.now());
      }
      recognition.onresult = (event) => {
        let interim = "";
        const finals = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = String(result[0]?.transcript || "").trim();
          if (!text) {
            continue;
          }
          if (result.isFinal) {
            finals.push(text);
          } else {
            interim += `${text} `;
          }
        }
        const now = Date.now();
        if (lastResultAtRef.current && now - lastResultAtRef.current >= LONG_PAUSE_MS) {
          setPauseCount((previous) => previous + 1);
        }
        lastResultAtRef.current = now;
        setInterimTranscript(interim.trim());
        if (finals.length) {
          setTranscript((previous) => `${previous} ${finals.join(" ")}`.trim());
        }
      };
      recognition.onerror = (event) => {
        const next = String(event?.error || "").toLowerCase();
        if (next === "not-allowed" || next === "service-not-allowed") {
          setError("Microphone permission denied for live speech-to-text.");
          restartRequestedRef.current = false;
        } else if (next && next !== "no-speech") {
          setError(`Speech recognition error: ${next}`);
        }
      };
      recognition.onend = () => {
        if (!restartRequestedRef.current) {
          setListening(false);
          recognitionRef.current = null;
          return;
        }
        try {
          recognition.start();
        } catch {
          setListening(false);
          recognitionRef.current = null;
        }
      };
      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch (startError) {
      setListening(false);
      setError(startError?.message || "Unable to start speech recognition.");
      return false;
    }
  }, [language, listening, startedAt]);
  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setInterimTranscript("");
    setPauseCount(0);
    setError("");
    setStartedAt(0);
    lastResultAtRef.current = 0;
  }, [stop]);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    if (!listening || !startedAt) {
      return void 0;
    }
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 500);
    return () => window.clearInterval(timer);
  }, [listening, startedAt]);
  const fullTranscript = useMemo(() => `${transcript} ${interimTranscript}`.trim(), [transcript, interimTranscript]);
  const fillerCount = useMemo(() => countFillers(fullTranscript), [fullTranscript]);
  const durationSec = useMemo(
    () => startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1e3)) : 0,
    [startedAt, clockTick]
  );
  const wordsPerMinute = useMemo(() => {
    if (!durationSec) {
      return 0;
    }
    return Math.round(countWords(fullTranscript) / durationSec * 60);
  }, [durationSec, fullTranscript]);
  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    fullTranscript,
    fillerCount,
    pauseCount,
    wordsPerMinute,
    durationSec,
    language,
    error,
    start,
    stop,
    reset
  };
}
