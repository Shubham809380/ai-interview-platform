import { useCallback, useEffect, useRef, useState } from "react";
const DEFAULT_MIN_SIGNAL = 0.03;
const DEFAULT_SILENCE_MS = 650;
function getAudioContextClass() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.AudioContext || window.webkitAudioContext || null;
}
function computeSignalLevel(byteSamples) {
  if (!byteSamples?.length) {
    return 0;
  }
  let sumSquares = 0;
  for (let index = 0; index < byteSamples.length; index += 1) {
    const centeredSample = (byteSamples[index] - 128) / 128;
    sumSquares += centeredSample * centeredSample;
  }
  return Math.sqrt(sumSquares / byteSamples.length);
}
export function useVoiceActivity(active, options = {}) {
  const minSignal = Number(options.minSignal) > 0 ? Number(options.minSignal) : DEFAULT_MIN_SIGNAL;
  const silenceMs = Number(options.silenceMs) > 0 ? Number(options.silenceMs) : DEFAULT_SILENCE_MS;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const samplesRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastSignalAtRef = useRef(0);
  const speakingRef = useRef(false);
  const setSpeakingState = useCallback((nextValue) => {
    speakingRef.current = nextValue;
    setIsSpeaking(nextValue);
  }, []);
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
      });
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    samplesRef.current = null;
    lastSignalAtRef.current = 0;
    setSpeakingState(false);
  }, [setSpeakingState]);
  useEffect(() => {
    const AudioContextClass = getAudioContextClass();
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia && AudioContextClass));
  }, []);
  useEffect(() => {
    if (!active) {
      stop();
      setError("");
      return void 0;
    }
    const AudioContextClass = getAudioContextClass();
    if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
      setError("Microphone-based speaking detection is not supported in this browser.");
      return void 0;
    }
    let canceled = false;
    const begin = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        if (canceled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const context = new AudioContextClass();
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.18;
        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        streamRef.current = stream;
        audioContextRef.current = context;
        analyserRef.current = analyser;
        sourceRef.current = source;
        samplesRef.current = samples;
        lastSignalAtRef.current = Date.now();
        setError("");
        const tick = () => {
          if (canceled || !analyserRef.current || !samplesRef.current) {
            return;
          }
          analyserRef.current.getByteTimeDomainData(samplesRef.current);
          const signalLevel = computeSignalLevel(samplesRef.current);
          const now = Date.now();
          if (signalLevel >= minSignal) {
            lastSignalAtRef.current = now;
            if (!speakingRef.current) {
              setSpeakingState(true);
            }
          } else if (speakingRef.current && now - lastSignalAtRef.current > silenceMs) {
            setSpeakingState(false);
          }
          animationFrameRef.current = window.requestAnimationFrame(tick);
        };
        animationFrameRef.current = window.requestAnimationFrame(tick);
      } catch (startError) {
        setSpeakingState(false);
        setError("Microphone access is blocked. Allow mic access to auto-start and auto-stop the speaking visual.");
      }
    };
    begin();
    return () => {
      canceled = true;
      stop();
    };
  }, [active, minSignal, silenceMs, stop, setSpeakingState]);
  return {
    isSpeaking,
    error,
    supported
  };
}
