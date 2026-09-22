"use client";

import { useMemo } from "react";

const PETAL_SRC = "/Assets/Componentes/petalo.png";

interface Petal {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  sway: number;
  rot: number;
  opacity: number;
  spin: number;
}

function buildPetals(count: number): Petal[] {
  return Array.from({ length: count }, (_, i) => {
    const duration = 11 + Math.random() * 9; // 11–20s: caída lenta y suave
    const dir = Math.random() < 0.5 ? -1 : 1;
    return {
      id: i,
      left: Math.random() * 100,
      size: 14 + Math.random() * 14, // 14–28px, pétalos pequeños
      duration,
      delay: -Math.random() * duration, // arrancan ya "en vuelo", no todas juntas arriba
      sway: dir * (30 + Math.random() * 50),
      rot: dir * (200 + Math.random() * 200),
      opacity: 0.5 + Math.random() * 0.35,
      spin: 3 + Math.random() * 4,
    };
  });
}

/** Pétalos de rosa blanca cayendo suavemente sobre toda la invitación. Puramente decorativo: no capta clicks. */
export default function PetalsFall({ count = 9 }: { count?: number }) {
  const petals = useMemo(() => buildPetals(count), [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[500] overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes petal-fall {
          0% { transform: translate3d(0, -12vh, 0) rotate(0deg); }
          50% { transform: translate3d(var(--petal-sway), 55vh, 0) rotate(calc(var(--petal-rot) * 0.5)); }
          100% { transform: translate3d(0, 112vh, 0) rotate(var(--petal-rot)); }
        }
        @keyframes petal-spin {
          0%, 100% { transform: rotateY(0deg) scaleX(1); }
          50% { transform: rotateY(180deg) scaleX(0.35); }
        }
        .petal-fall-outer { position: absolute; top: 0; will-change: transform; }
        .petal-fall-inner { will-change: transform; transform-style: preserve-3d; }
        .petal-fall-img { display: block; width: 100%; height: auto; }
      `}</style>
      {petals.map((p) => (
        <div
          key={p.id}
          className="petal-fall-outer"
          style={{
            left: `${p.left}%`,
            width: p.size,
            opacity: p.opacity,
            animation: `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
            ["--petal-sway" as string]: `${p.sway}px`,
            ["--petal-rot" as string]: `${p.rot}deg`,
          }}
        >
          <div
            className="petal-fall-inner"
            style={{ animation: `petal-spin ${p.spin}s ease-in-out ${p.delay}s infinite` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PETAL_SRC} alt="" className="petal-fall-img" />
          </div>
        </div>
      ))}
    </div>
  );
}
