"use client";

import { useEffect, useRef } from "react";

const LERP_FACTOR = 0.1;
const MAX_DIST = 15;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const EYES = [
  { cx: 100, cy: 130, id: "left" },
  { cx: 160, cy: 130, id: "right" },
];

const MonadMascot = ({ className }: { className?: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pupilRefs = useRef<(SVGCircleElement | null)[]>([null, null]);
  const targetRef = useRef([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const currentRef = useRef([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      EYES.forEach((eye, i) => {
        const svg = svgRef.current!;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
        const dx = svgPt.x - eye.cx;
        const dy = svgPt.y - eye.cy;
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(Math.hypot(dx, dy) * 0.15, MAX_DIST);
        targetRef.current[i] = {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        };
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const animate = () => {
      EYES.forEach((_, i) => {
        const c = currentRef.current[i];
        const t = targetRef.current[i];
        c.x = lerp(c.x, t.x, LERP_FACTOR);
        c.y = lerp(c.y, t.y, LERP_FACTOR);
        const pupil = pupilRefs.current[i];
        if (pupil) {
          pupil.setAttribute("transform", `translate(${c.x}, ${c.y})`);
        }
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className={className}>
      <svg ref={svgRef} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Tail */}
        <path
          d="M320 120 C350 100 370 100 380 130 C390 160 360 180 340 170"
          fill="#9B59B6"
          stroke="black"
          strokeWidth="3"
        />
        <path d="M350 130 C370 130 380 150 370 160" fill="#FF99CC" stroke="black" strokeWidth="3" />

        {/* Body */}
        <path
          d="M50 150 C50 100 120 80 200 80 C300 80 340 120 340 180 C340 230 250 240 150 230 C80 220 50 200 50 150 Z"
          fill="#8E44AD"
          stroke="black"
          strokeWidth="3"
        />

        {/* Stripes */}
        <path
          d="M240 100 Q230 150 240 230 M270 110 Q260 160 270 220 M300 120 Q290 170 300 200"
          stroke="#AF7AC5"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Ears */}
        <path d="M100 90 L110 50 L140 85" fill="#8E44AD" stroke="black" strokeWidth="3" />
        <path d="M180 85 L210 50 L220 90" fill="#8E44AD" stroke="black" strokeWidth="3" />
        <path d="M115 65 L130 80 L110 85 Z" fill="#FF99CC" />

        {/* Legs */}
        <path d="M130 230 L130 260 L150 260 L150 230" fill="#8E44AD" stroke="black" strokeWidth="3" />
        <path d="M200 230 L200 250 L220 250 L220 230" fill="#8E44AD" stroke="black" strokeWidth="3" />
        <path d="M280 210 L280 240 L300 240 L290 210" fill="#8E44AD" stroke="black" strokeWidth="3" />

        {/* Beak */}
        <path
          d="M45 160 Q100 155 150 160 Q155 180 150 190 Q100 185 50 180 Q40 170 45 160 Z"
          fill="#D35400"
          stroke="black"
          strokeWidth="3"
        />
        <path d="M45 160 Q100 155 150 160" fill="none" stroke="black" strokeWidth="3" />

        {/* Eyes */}
        {EYES.map((eye, i) => (
          <g key={eye.id}>
            <circle cx={eye.cx} cy={eye.cy} r="25" fill="white" stroke="black" strokeWidth="3" />
            <circle
              ref={el => {
                pupilRefs.current[i] = el;
              }}
              cx={eye.cx}
              cy={eye.cy}
              r="6"
              fill="black"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default MonadMascot;
