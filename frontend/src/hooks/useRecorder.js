import { useEffect, useRef, useState } from "react";
function createMediaRef(type) {
  return `local://${type}/${Date.now()}/${Math.random().toString(36).slice(2, 8)}`;
}
function pickSupportedMimeType(candidates = []) {
  if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  for (const candidate of candidates) {
    if (candidate && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "";
}
function buildAudioOnlyStream(stream) {
  const audioTracks = stream.getAudioTracks();
  return new MediaStream(audioTracks);
}
export function useRecorder(mode = "video") {
  const recorderRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const videoChunksRef = useRef([]);
  const audioChunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const stopStateRef = useRef({ videoDone: false, audioDone: false, audioEnabled: false });
  const pendingVideoBlobRef = useRef(null);
  const pendingAudioBlobRef = useRef(null);
  const pendingVideoMimeRef = useRef("");
  const pendingAudioMimeRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaReference, setMediaReference] = useState("");
  const [videoBlob, setVideoBlob] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [videoMimeType, setVideoMimeType] = useState("");
  const [audioMimeType, setAudioMimeType] = useState("");
  const [captureId, setCaptureId] = useState(0);
  const [error, setError] = useState("");
  function finalizeCapture() {
    const state = stopStateRef.current;
    if (!state.videoDone) {
      return;
    }
    if (state.audioEnabled && !state.audioDone) {
      return;
    }
    const nextVideoBlob = pendingVideoBlobRef.current;
    const nextAudioBlob = pendingAudioBlobRef.current || pendingVideoBlobRef.current;
    const nextVideoMimeType = pendingVideoMimeRef.current || "";
    const nextAudioMimeType = pendingAudioMimeRef.current || nextVideoMimeType;
    const nextPreviewUrl = nextVideoBlob ? URL.createObjectURL(nextVideoBlob) : "";
    setVideoBlob(nextVideoBlob);
    setAudioBlob(nextAudioBlob);
    setVideoMimeType(nextVideoMimeType);
    setAudioMimeType(nextAudioMimeType);
    setPreviewUrl(nextPreviewUrl);
    setMediaReference(createMediaRef(mode));
    setCaptureId((value) => value + 1);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    audioRecorderRef.current = null;
  }
  useEffect(() => {
    if (!recording) {
      return void 0;
    }
    const timer = window.setInterval(() => {
      setDurationSec(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1e3)));
    }, 300);
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  async function start() {
    setError("");
    if (recording) {
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Recording is not supported in this browser.");
      return false;
    }
    try {
      const wantsVideo = mode === "video";
      const constraints = wantsVideo ? { audio: true, video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoChunksRef.current = [];
      audioChunksRef.current = [];
      pendingVideoBlobRef.current = null;
      pendingAudioBlobRef.current = null;
      pendingVideoMimeRef.current = "";
      pendingAudioMimeRef.current = "";
      stopStateRef.current = { videoDone: false, audioDone: false, audioEnabled: wantsVideo };
      const videoMime = pickSupportedMimeType([
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4"]
      ) || "";
      const recorder = new MediaRecorder(stream, videoMime ? { mimeType: videoMime } : void 0);
      recorderRef.current = recorder;
      if (wantsVideo && stream.getAudioTracks().length) {
        const audioStream = buildAudioOnlyStream(stream);
        const audioMime = pickSupportedMimeType(["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"]) || "";
        const audioRecorder = new MediaRecorder(audioStream, audioMime ? { mimeType: audioMime } : void 0);
        audioRecorderRef.current = audioRecorder;
        audioRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        audioRecorder.onstop = () => {
          pendingAudioMimeRef.current = audioRecorder.mimeType || audioMime || "audio/webm";
          pendingAudioBlobRef.current = new Blob(audioChunksRef.current, {
            type: pendingAudioMimeRef.current
          });
          stopStateRef.current.audioDone = true;
          finalizeCapture();
        };
      } else {
        stopStateRef.current.audioEnabled = false;
      }
      startedAtRef.current = Date.now();
      setDurationSec(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const fallbackType = mode === "video" ? "video/webm" : "audio/webm";
        pendingVideoMimeRef.current = recorder.mimeType || videoMime || fallbackType;
        pendingVideoBlobRef.current = new Blob(videoChunksRef.current, {
          type: pendingVideoMimeRef.current
        });
        stopStateRef.current.videoDone = true;
        finalizeCapture();
      };
      recorder.start();
      if (audioRecorderRef.current) {
        audioRecorderRef.current.start();
      }
      setRecording(true);
      return true;
    } catch (mediaError) {
      setError("Unable to access microphone/camera permissions.");
      return false;
    }
  }
  function stop() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state === "recording") {
      audioRecorderRef.current.stop();
    }
    setRecording(false);
    setDurationSec(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1e3)));
  }
  function reset({ revokePreviewUrl = true } = {}) {
    if (revokePreviewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setDurationSec(0);
    setMediaReference("");
    setVideoBlob(null);
    setAudioBlob(null);
    setVideoMimeType("");
    setAudioMimeType("");
    setError("");
  }
  return {
    recording,
    durationSec,
    previewUrl,
    mediaReference,
    videoBlob,
    audioBlob,
    videoMimeType,
    audioMimeType,
    captureId,
    error,
    start,
    stop,
    reset
  };
}