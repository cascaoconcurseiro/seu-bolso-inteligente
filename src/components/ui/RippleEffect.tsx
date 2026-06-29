import React from "react";
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
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 30, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`rounded-full w-24 h-24 ${
              status === "success" ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ 
              boxShadow: status === "success" ? "0 0 40px 20px rgba(34, 197, 94, 0.5)" : "0 0 40px 20px rgba(239, 68, 68, 0.5)"
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
