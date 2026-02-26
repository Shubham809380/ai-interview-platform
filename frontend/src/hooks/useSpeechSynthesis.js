import { useCallback, useEffect, useState } from "react";
function pickPreferredVoice(voices, language = "en-US") {
  if (!Array.isArray(voices) || !voices.length) {
    return null;
  }
  const preferredLanguage = String(language || "en-US").trim();
  const preferredPrefix = preferredLanguage.split("-")[0];
  return voices.find((voice) => String(voice.lang || "").toLowerCase() === preferredLanguage.toLowerCase()) || voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith(`${preferredPrefix.toLowerCase()}-`)) || voices.find((voice) => /^en(-|_)?US$/i.test(voice.lang || "")) || voices.find((voice) => /Google US English|Samantha/i.test(voice.name || "")) || voices.find((voice) => /^en/i.test(voice.lang || "")) || voices[0];
}
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(typeof window !== "undefined" && "speechSynthesis" in window);
  const [voices, setVoices] = useState([]);
  const [lastError, setLastError] = useState("");
  useEffect(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    setEnabled(supported);
    if (!supported) {
      return void 0;
    }
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(Array.isArray(availableVoices) ? availableVoices : []);
    };
    updateVoices();
    synth.addEventListener?.("voiceschanged", updateVoices);
    return () => {
      synth.removeEventListener?.("voiceschanged", updateVoices);
    };
  }, []);
  const cancel = useCallback(() => {
    if (!enabled) {
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume?.();
    setSpeaking(false);
  }, [enabled]);
  const speak = useCallback(
    ({ text, rate = 1, pitch = 1, lang = "en-US" }) => {
      const normalizedText = String(text || "").trim();
      if (!enabled || !normalizedText) {
        return false;
      }
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        synth.resume?.();
        const utterance = new SpeechSynthesisUtterance(normalizedText);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 1;
        utterance.lang = String(lang || "en-US");
        utterance.onstart = () => {
          setLastError("");
          setSpeaking(true);
        };
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = (event) => {
          setSpeaking(false);
          setLastError(event?.error ? `Voice playback failed (${event.error}).` : "Voice playback failed.");
        };
        const preferred = pickPreferredVoice(voices.length ? voices : synth.getVoices(), utterance.lang);
        if (preferred) {
          utterance.voice = preferred;
        }
        window.setTimeout(() => {
          synth.speak(utterance);
          synth.resume?.();
        }, 40);
        return true;
      } catch (error) {
        setSpeaking(false);
        setLastError(error?.message || "Speech synthesis is unavailable.");
        return false;
      }
    },
    [enabled, voices]
  );
  useEffect(
    () => () => {
      cancel();
    },
    [cancel]
  );
  return {
    enabled,
    speaking,
    lastError,
    speak,
    cancel
  };
}
