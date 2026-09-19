import React from 'react';

export const SystemCalibrating = ({ message = 'SYSTEM CALIBRATING...' }: { message?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] w-full">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-cyan/20 border-t-cyan rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/10 border-t-white/30 rounded-full animate-spin-reverse"></div>
        </div>
      </div>
      <p className="mt-8 font-mono text-[10px] text-cyan uppercase tracking-[0.2em] animate-pulse">
        {message}
      </p>
    </div>
  );
};
