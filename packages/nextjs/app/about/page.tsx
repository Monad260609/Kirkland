"use client";

import Image from "next/image";
import Link from "next/link";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import {
  IconArrowLeft,
  IconBolt,
  IconBrandGithub,
  IconBrandLinkedin,
  IconCode,
  IconCoin,
  IconDatabase,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const team = [
  {
    name: "Sofiane BEN TALEB",
    role: "Full-Stack & Smart Contracts",
    photo: "/team/sofiane.jpg",
    github: "https://github.com/gamween",
    linkedin: "https://www.linkedin.com/in/sofiane-ben-taleb/",
  },
  {
    name: "Armand SECHON",
    role: "Backend & Infrastructure",
    photo: "/team/armand.jpg",
    github: "https://github.com/STOOOKEEE",
    linkedin: "https://www.linkedin.com/in/armand-sechon/",
  },
  {
    name: "Noé WALES",
    role: "Frontend & Design",
    photo: "/team/noe.jpg",
    github: "https://github.com/CHAAIISE",
    linkedin: "https://www.linkedin.com/in/no%C3%A9-w/",
  },
];

const techStack = [
  { icon: IconBolt, label: "Monad Testnet" },
  { icon: IconCoin, label: "x402 Protocol" },
  { icon: IconCode, label: "Next.js & Solidity" },
  { icon: IconDatabase, label: "On-chain Data Cache" },
];

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 * i, duration: 0.5, ease: "easeOut" as const },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  return (
    <>
      {/* ---- Animated gradient background ---- */}
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

      {/* ---- Content ---- */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-6 py-12 overflow-y-auto scrollbar-hide">
        {/* Back button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <IconArrowLeft size={20} />
          <span className="text-xl">Back</span>
        </Link>

        {/* ---- Title ---- */}
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

        {/* ---- Team cards ---- */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16 mb-20">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-col items-center gap-4 group"
            >
              {/* Avatar */}
              <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/20 shadow-lg shadow-purple-500/10 group-hover:border-white/40 transition-colors duration-300">
                <Image
                  src={member.photo}
                  alt={member.name}
                  width={176}
                  height={176}
                  className="object-cover w-full h-full"
                />
              </div>

              {/* Name & role */}
              <p className="text-2xl md:text-3xl text-white tracking-wide text-center">{member.name}</p>
              <p className="text-white/40 text-base tracking-wide -mt-2">{member.role}</p>

              {/* Social links */}
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
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                  aria-label={`${member.name} LinkedIn`}
                >
                  <IconBrandLinkedin size={22} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ---- Tech stack badges ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex flex-wrap justify-center gap-3 mb-16"
        >
          {techStack.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm tracking-wide backdrop-blur-sm"
            >
              <Icon size={16} />
              {label}
            </span>
          ))}
        </motion.div>

        {/* ---- Association & project description ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="max-w-2xl text-center mb-16"
        >
          <h2 className="text-3xl text-white tracking-wide mb-6">DeVinci Blockchain</h2>
          <p className="text-white/60 text-lg md:text-xl leading-relaxed mb-6">
            We are three students from the <span className="text-white font-semibold">DeVinci Blockchain</span>{" "}
            association, based in Paris, France. Our association explores the frontiers of blockchain technology through
            hackathons, research, and hands-on building.
          </p>
          <p className="text-white/60 text-lg md:text-xl leading-relaxed">
            <span className="text-white font-semibold">Cachemarket</span> is our entry for the{" "}
            <span className="text-white font-semibold">Monad Blitz Denver</span> hackathon — a data freshness
            marketplace powered by the x402 payment protocol, built on Monad Testnet. It enables users to buy and sell
            cached on-chain data with micro-payments, leveraging Monad&apos;s high throughput for near-instant
            settlement.
          </p>
        </motion.div>

        {/* ---- How it works summary ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-2xl w-full mb-20"
        >
          <h2 className="text-3xl text-white tracking-wide mb-6 text-center">How Cachemarket Works</h2>
          <div className="grid gap-4">
            {[
              {
                step: "1",
                title: "Cache Data On-Chain",
                desc: "Providers store fresh data on the Monad blockchain via the DataCache smart contract.",
              },
              {
                step: "2",
                title: "Pay with x402",
                desc: "Consumers pay micro-fees through the x402 payment protocol to access cached data.",
              },
              {
                step: "3",
                title: "Instant Settlement",
                desc: "Monad's high-performance EVM settles transactions in near real-time, ensuring data freshness.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex items-start gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/80 text-sm font-bold">
                  {step}
                </span>
                <div>
                  <p className="text-white text-lg tracking-wide">{title}</p>
                  <p className="text-white/50 text-base leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ---- Footer links ---- */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-full bg-[#f5f0e8] text-[#1a1a2e] text-lg font-bold tracking-wide hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Open App
          </Link>
          <a
            href="https://github.com/gamween/monad-blitz-denver"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-white/70 text-lg tracking-wide hover:bg-white/15 hover:text-white transition-all"
          >
            <IconBrandGithub size={20} />
            GitHub
          </a>
        </motion.div>
      </div>
    </>
  );
}
