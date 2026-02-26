import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
function AvatarModel({ speaking = false }) {
  const groupRef = useRef(null);
  const mouthRef = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.45) * 0.18;
    }
    if (mouthRef.current) {
      const open = speaking ? 0.12 + Math.abs(Math.sin(t * 10)) * 0.16 : 0.06;
      mouthRef.current.scale.y = open;
    }
  });
  return <group ref={groupRef}><mesh position={[0, 0.2, 0]}><sphereGeometry args={[1, 48, 48]} /><meshStandardMaterial color="#f5cba7" metalness={0.1} roughness={0.5} /></mesh><mesh position={[0, -1.2, 0]}><cylinderGeometry args={[1.1, 1.2, 1.6, 30]} /><meshStandardMaterial color="#2f58ff" metalness={0.2} roughness={0.45} /></mesh><mesh position={[-0.28, 0.3, 0.87]}><sphereGeometry args={[0.09, 18, 18]} /><meshStandardMaterial color="#102a43" /></mesh><mesh position={[0.28, 0.3, 0.87]}><sphereGeometry args={[0.09, 18, 18]} /><meshStandardMaterial color="#102a43" /></mesh><mesh ref={mouthRef} position={[0, -0.15, 0.92]} scale={[1, 0.06, 1]}><boxGeometry args={[0.4, 0.2, 0.08]} /><meshStandardMaterial color="#9a3412" /></mesh></group>;
}
function isVideoSource(source) {
  return /\.(mp4|webm|ogg)$/i.test(source || "");
}
export function AvatarInterviewer({ speaking, speakingVisualSrc = "" }) {
  const showSpeakingVisual = Boolean(speakingVisualSrc);
  const speakingVisualIsVideo = isVideoSource(speakingVisualSrc);
  const waveformBars = [0, 1, 2, 3, 4, 5, 6];
  const videoRef = useRef(null);
  const previousSpeakingRef = useRef(false);
  const [mediaError, setMediaError] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  useEffect(() => {
    setMediaError(false);
    setMediaReady(false);
  }, [speakingVisualSrc]);
  useEffect(() => {
    if (!speakingVisualIsVideo || !videoRef.current || mediaError) {
      return;
    }
    const playPromise = videoRef.current.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
      });
    }
  }, [speakingVisualIsVideo, mediaError, speakingVisualSrc]);
  useEffect(() => {
    if (!speakingVisualIsVideo || !videoRef.current || mediaError) {
      return;
    }
    const video = videoRef.current;
    const wasSpeaking = previousSpeakingRef.current;
    if (speaking && !wasSpeaking) {
      try {
        video.currentTime = 0;
      } catch {
      }
      const playPromise = video.play?.();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
        });
      }
    }
    if (!speaking && wasSpeaking) {
      video.pause?.();
    }
    previousSpeakingRef.current = speaking;
  }, [speaking, speakingVisualIsVideo, mediaError]);
  return <div className="relative h-[220px] w-full overflow-hidden rounded-[30px] border border-white/40 bg-gradient-to-br from-slate-50 via-white/80 to-blue-100/75 shadow-glass sm:h-[300px] dark:border-white/15 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/70"><div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-300/45 blur-3xl dark:bg-brand-500/20" /><div className="pointer-events-none absolute -left-16 -bottom-24 h-56 w-56 rounded-full bg-cyan-200/60 blur-3xl dark:bg-cyan-500/10" /><div className="relative z-20 flex h-full flex-col p-3"><div className="mb-3 flex items-center justify-between rounded-2xl border border-white/40 bg-white/55 px-3 py-2 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Virtual Interviewer
            </p><p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">AI Coach</p></div><div
    className={[
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
      speaking ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-slate-200/70 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200"
    ].join(" ")}
  >{speaking ? <Volume2 size={13} /> : <VolumeX size={13} />}{speaking ? "Speaking" : "Idle"}</div></div><div className="relative flex-1 overflow-hidden rounded-2xl border border-white/35 bg-slate-900/10 dark:border-white/10 dark:bg-slate-900/50"><AnimatePresence mode="wait">{showSpeakingVisual ? <motion.div
    key="speaking-visual"
    initial={{ opacity: 0, scale: 1.03 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.01 }}
    transition={{ duration: 0.35 }}
    className="absolute inset-0"
  >{speakingVisualIsVideo && !mediaError ? <video
    ref={videoRef}
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    src={speakingVisualSrc}
    poster="/ai-speaking-fallback.svg"
    onLoadedMetadata={() => {
      setMediaReady(true);
      if (!speaking) {
        videoRef.current?.pause?.();
      }
    }}
    onCanPlay={() => setMediaReady(true)}
    onError={() => setMediaError(true)}
    className="h-full w-full object-contain bg-slate-950"
  /> : !speakingVisualIsVideo && !mediaError ? <img
    src={speakingVisualSrc}
    alt="AI interviewer speaking"
    onLoad={() => setMediaReady(true)}
    onError={() => setMediaError(true)}
    className="h-full w-full object-contain bg-slate-950"
  /> : <img
    src="/ai-speaking-fallback.svg"
    alt="AI interviewer visual"
    className="h-full w-full object-contain bg-slate-950"
  />}{!mediaReady && !mediaError ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-900/30"><span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700">
                      Loading interviewer visual...
                    </span></div> : null}{mediaReady && !speaking ? <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"><span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white">
                      AI ready
                    </span></div> : null}<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/25 via-slate-900/5 to-transparent" /></motion.div> : <motion.div
    key="idle-3d"
    initial={{ opacity: 0, scale: 1.02 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.99 }}
    transition={{ duration: 0.35 }}
    className="absolute inset-0"
  ><Canvas camera={{ position: [0, 0, 4.2], fov: 45 }}><ambientLight intensity={0.9} /><directionalLight position={[3, 5, 2]} intensity={1.6} /><Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}><AvatarModel speaking={speaking} /></Float><OrbitControls enablePan={false} enableZoom={false} minPolarAngle={1.2} maxPolarAngle={1.9} /></Canvas></motion.div>}</AnimatePresence></div><div className="mt-3 flex items-center justify-between rounded-2xl border border-white/35 bg-white/55 px-3 py-2 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40"><div><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{speaking ? "Delivering your next interview question" : "Waiting for your response"}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real-time voice mode with visual speaking state
            </p></div><div className="flex h-8 items-end gap-1">{waveformBars.map((index) => <span
    key={index}
    style={{ animationDelay: `${index * 0.12}s` }}
    className={[
      "w-1 rounded-full transition-all duration-200",
      speaking ? "h-6 animate-pulse bg-brand-500 dark:bg-brand-300" : "h-2 bg-slate-400/70 dark:bg-slate-500/70"
    ].join(" ")}
  />)}</div></div></div></div>;
}
