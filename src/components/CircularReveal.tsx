'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageCircle, Brain, Shield } from 'lucide-react';

interface TextItem {
  text: string;
  icon: React.ElementType;
}

interface CircularRevealHeadingProps {
  items: TextItem[];
  centerText: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    container: 'h-[280px] w-[280px]',
    fontSize: 'text-sm',
    tracking: 'tracking-[0.15em]',
    radius: 120,
    gap: 40,
    textStyle: 'font-mono font-medium'
  },
  md: {
    container: 'h-[350px] w-[350px]',
    fontSize: 'text-base',
    tracking: 'tracking-[0.25em]',
    radius: 140,
    gap: 30,
    textStyle: 'font-mono font-medium',
  },
  lg: {
    container: 'h-[400px] w-[400px]',
    fontSize: 'text-lg',
    tracking: 'tracking-[0.3em]',
    radius: 150,
    gap: 20,
    textStyle: 'font-mono font-medium'
  }
};

const IconOverlay = ({ Icon, size = 'md' }: { Icon: React.ElementType, size?: 'sm' | 'md' | 'lg' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
  >
    <Icon className={`text-cyan-400 ${
      size === 'sm' ? 'w-16 h-16' : 
      size === 'md' ? 'w-20 h-20' : 
      'w-24 h-24'
    }`} />
  </motion.div>
);

export const CircularRevealHeading = ({
  items,
  centerText,
  className,
  size = 'md'
}: CircularRevealHeadingProps) => {
  const [activeIcon, setActiveIcon] = useState<React.ElementType | null>(null);
  const config = sizeConfig[size];

  const createTextSegments = () => {
    const totalItems = items.length;
    const totalGapDegrees = config.gap * totalItems;
    const availableDegrees = 360 - totalGapDegrees;
    const segmentDegrees = availableDegrees / totalItems;
    return items.map((item, index) => {
      const startPosition = index * (segmentDegrees + config.gap);
      const startOffset = `${(startPosition / 360) * 100}%`;
      return (
        <g key={index}>
          <text
            className={`${config.fontSize} ${config.tracking} ${config.textStyle} uppercase cursor-pointer transition-all duration-300`}
            onMouseEnter={() => setActiveIcon(item.icon)}
            onMouseLeave={() => setActiveIcon(null)}
            style={{
              filter: 'url(#textShadow)',
              transition: 'all 0.3s ease',
              fontFamily: "'JetBrains Mono', monospace"
            }}
          >
            <textPath
              href="#curve"
              className="fill-[url(#neonGradient)] hover:fill-cyan-300"
              startOffset={startOffset}
              textLength={`${segmentDegrees * 1.8}`}
              lengthAdjust="spacingAndGlyphs"
              style={{
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              {item.text}
            </textPath>
          </text>
        </g>
      );
    });
  };

  return (
    <>
      <motion.div
        whileHover={{
          boxShadow: "0 0 30px rgba(34,211,238,0.3)"
        }}
        whileTap={{ scale: 0.98 }}
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`relative overflow-hidden ${config.container} rounded-full bg-dark-800/50 backdrop-blur-sm border border-dark-700/30 shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all duration-500 ease-out ${className}`}
      >
        <AnimatePresence>
          {activeIcon && (
            <IconOverlay Icon={activeIcon} size={size} />
          )}
        </AnimatePresence>

        <motion.div
          className="absolute inset-[2px] rounded-full bg-dark-800/50"
          style={{
            boxShadow: "inset 0 0 15px rgba(34,211,238,0.1)"
          }}
        />

        <motion.div
          className="absolute inset-[12px] rounded-full bg-dark-800/50"
          style={{
            boxShadow: "inset 0 0 10px rgba(34,211,238,0.1)"
          }}
        />

        <motion.div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence>
            {!activeIcon && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 p-2.5 rounded-2xl bg-dark-800/50 backdrop-blur-sm border border-dark-700/30 font-mono max-w-[120px] sm:max-w-[160px]"
                whileHover={{
                  boxShadow: "0 0 20px rgba(34,211,238,0.2)"
                }}
              >
                {centerText}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="absolute inset-0"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="50%" stopColor="#a5f3fc" />
                <stop offset="100%" stopColor="#67e8f9" />
              </linearGradient>
              <filter id="textShadow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
                <feOffset dx="0" dy="0" result="offsetBlur" />
                <feFlood floodColor="#67e8f9" floodOpacity="0.5" />
                <feComposite in2="offsetBlur" operator="in" />
                <feMerge>
                  <feMergeNode in="offsetBlur" />
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              id="curve"
              fill="none"
              d={`M 200,200 m -${config.radius},0 a ${config.radius},${config.radius} 0 1,1 ${config.radius * 2},0 a ${config.radius},${config.radius} 0 1,1 -${config.radius * 2},0`}
            />
            {createTextSegments()}
          </svg>
        </motion.div>
      </motion.div>
    </>
  );
};