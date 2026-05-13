import React from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";

export const AuroraBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Stars 
          radius={60} 
          count={3000} 
          factor={4} 
          fade 
          speed={1.5} 
        />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent opacity-60" />
    </div>
  );
};
