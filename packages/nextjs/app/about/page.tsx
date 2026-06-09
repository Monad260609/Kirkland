"use client";

import Image from "next/image";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react";
import { motion } from "framer-motion";

const team: {
  name: string;
  role: string;
  photo: string;
  github: string;
  linkedin?: string;
}[] = [
  {
    name: "Sofiane BEN TALEB",
    role: "Builder",
    photo: "/team/sofiane.jpg",
    github: "https://github.com/gamween",
    linkedin: "https://www.linkedin.com/in/sofiane-ben-taleb/",
  },
  {
    name: "Johann CALI",
    role: "Builder",
    photo: "/team/johann.jpg",
    github: "https://github.com/JohannCFi",
  },
  {
    name: "Jean",
    role: "Builder",
    photo: "/team/jean.jpg",
    github: "https://github.com/vassCaR",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 * i, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function AboutPage() {
  return (
    <>
      <ShaderGradientCanvas style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <ShaderGradient
          type="plane"
          animate="on"
          uSpeed={0.3}
          uStrength={1.5}
          uDensity={1.5}
          uFrequency={0}
          uAmplitude={0}
          color1="#606080"
          color2="#8d7dca"
          color3="#212121"
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={50}
          rotationY={0}
          rotationZ={-60}
          cDistance={2.8}
          cPolarAngle={80}
          cAzimuthAngle={180}
          cameraZoom={9.1}
          brightness={1}
          envPreset="city"
          grain="on"
          grainBlending={0}
          lightType="3d"
          reflection={0.1}
        />
      </ShaderGradientCanvas>

      <div className="relative z-10 flex flex-col items-center min-h-screen px-6 pt-20 pb-12 overflow-y-auto scrollbar-hide">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-6xl md:text-7xl text-white tracking-wider mb-4 select-none"
        >
          About Us
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg mb-14 tracking-wide"
        >
          The team behind Cachemarket
        </motion.p>

        {/* Team cards */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16 mb-16">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-col items-center gap-4 group"
            >
              <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/20 shadow-lg shadow-purple-500/10 group-hover:border-white/40 transition-colors duration-300">
                <Image
                  src={member.photo}
                  alt={member.name}
                  width={176}
                  height={176}
                  className="object-cover w-full h-full"
                />
              </div>

              <p className="text-2xl md:text-3xl text-white tracking-wide text-center">{member.name}</p>
              <p className="text-white/40 text-base tracking-wide -mt-2">{member.role}</p>

              <div className="flex gap-3">
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                  aria-label={`${member.name} GitHub`}
                >
                  <IconBrandGithub size={22} />
                </a>
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors"
                    aria-label={`${member.name} LinkedIn`}
                  >
                    <IconBrandLinkedin size={22} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        {/* Event */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="max-w-2xl text-center"
        >
          <h2 className="text-3xl text-white tracking-wide mb-6">Monad Blitz NYC</h2>
          <p className="text-white/60 text-lg md:text-xl leading-relaxed">
            Built in one day at <span className="text-white font-semibold">Monad Blitz NYC</span> (June 9, 2026) — the
            one-day hackathon where builders ship fast on Monad&apos;s high-performance EVM.
          </p>
        </motion.div>
      </div>
    </>
  );
}
