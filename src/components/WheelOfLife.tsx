import React from 'react';
import { motion } from 'motion/react';

export function WheelOfLifeVisualization() {
  return (
    <motion.svg
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
      width="500" height="500" viewBox="0 0 340 340"
      className="pointer-events-none"
    >
      <polygon
        points="170,30 290,105 290,235 170,310 50,235 50,105"
        fill="rgba(46,107,158,0.08)"
        stroke="#C8651B"
        strokeWidth="0.5"
        strokeOpacity="0.4"
      />
      <polygon
        points="170,70 255,122 255,218 170,270 85,218 85,122"
        fill="none"
        stroke="#2E6B9E"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      <polygon
        points="170,100 230,138 230,202 170,240 110,202 110,138"
        fill="none"
        stroke="#C9A84C"
        strokeWidth="0.5"
        strokeOpacity="0.2"
      />
      <circle cx="170" cy="170" r="4" fill="#C8651B" opacity="0.8" />
    </motion.svg>
  );
}
