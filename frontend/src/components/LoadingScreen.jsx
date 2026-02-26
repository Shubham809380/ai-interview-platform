import { motion } from "framer-motion";

export function LoadingScreen({ label = "Loading dashboard..." }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          className="h-12 w-12 rounded-full border-4 border-brand-200 border-t-brand-600"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
      </motion.div>
    </div>
  );
}
