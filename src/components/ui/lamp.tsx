import React from "react";
import { motion } from "framer-motion";

export function LampContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-dark-900 w-full z-0 ${className}`}>
      {/* Horizontal Light Source */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-white shadow-[0_0_15px_5px_rgba(255,255,255,0.5)] z-50" />

      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
        <motion.div
          initial={{ opacity: 0.5, width: "8rem" }}
          whileInView={{ opacity: 1, width: "16rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-[500px] bg-white/20 blur-[100px] rounded-full"
        />

        {/* Main Light Beam */}
        <div className="absolute top-0 z-40 h-[400px] w-full bg-gradient-to-b from-white via-white/50 to-transparent opacity-10" />
        
        {/* Subtle Ambient Light */}
        <div className="absolute top-0 z-30 w-full h-[500px] bg-gradient-to-b from-white/10 to-transparent" />
      </div>

      <div className="relative z-50 flex flex-col items-start px-5 w-full max-w-7xl mx-auto pt-24">
        {children}
      </div>
    </div>
  );
}