import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RippleEffectProps {
  status: "success" | "error" | null;
}

export function RippleEffect({ status }: RippleEffectProps) {
  return (
    <AnimatePresence>
      {status && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 0.8 }}
            animate={{ clipPath: "circle(150% at 50% 50%)", opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute inset-0 w-full h-full ${
              status === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
