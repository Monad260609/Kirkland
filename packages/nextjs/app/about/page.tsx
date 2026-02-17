"use client";

import Image from "next/image";
import Link from "next/link";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconArrowLeft, IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react";
import { motion } from "framer-motion";

const team = [
  {
    name: "Sofiane BEN TALEB",
    photo: "/team/sofiane.jpg",
    github: "https://github.com/gamween",
    linkedin: "https://www.linkedin.com/in/sofiane-ben-taleb/",
  },
  {
    name: "Armand SECHON",
    photo: "/team/armand.jpg",
    github: "https://github.com/STOOOKEEE",
    linkedin: "https://www.linkedin.com/in/armand-sechon/",
  },
  {
    name: "Noé WALES",
    photo: "/team/noe.jpg",
    github: "https://github.com/CHAAIISE",
    linkedin: "https://www.linkedin.com/in/no%C3%A9-w/",
  },
];

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

      <div className="relative z-10 flex flex-col items-center min-h-screen px-6 py-12">
        {/* Back button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <IconArrowLeft size={20} />
          <span className="text-xl">Back</span>
        </Link>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-7xl text-white tracking-wider mb-16 select-none"
        >
          About Us
        </motion.h1>

        {/* Team members */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16 mb-16">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/20 shadow-lg shadow-purple-500/10">
                <Image
                  src={member.photo}
                  alt={member.name}
                  width={176}
                  height={176}
                  className="object-cover w-full h-full"
                />
              </div>
              <p className="text-2xl md:text-3xl text-white tracking-wide text-center">{member.name}</p>
              <div className="flex gap-3">
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <IconBrandGithub size={22} />
                </a>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <IconBrandLinkedin size={22} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Association description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-2xl text-center"
        >
          <p className="text-white/60 text-lg md:text-xl leading-relaxed">
            We are three students from the <span className="text-white font-semibold">DeVinci Blockchain</span>{" "}
            association, based in Paris, France. Our association explores the frontiers of blockchain technology through
            hackathons, research, and hands-on building. Cachemarket is our entry for the Monad Blitz Denver hackathon —
            a data freshness marketplace powered by the x402 payment protocol, built on Monad Testnet.
          </p>
        </motion.div>
      </div>
    </>
  );
}
