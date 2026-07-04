import { motion, AnimatePresence } from "framer-motion";

interface RippleEffectProps {
  status: "success" | "error" | null;
}

export function RippleEffect({ status }: RippleEffectProps) {
  return (
    <AnimatePresence>
      {status && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 20, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className={`w-20 h-20 rounded-full ${
              status === "success" ? "bg-positive" : "bg-negative"
            }`}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
