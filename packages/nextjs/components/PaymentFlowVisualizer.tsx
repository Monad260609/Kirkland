"use client";

import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { motion } from "framer-motion";

interface FlowStep {
  label: string;
  value: string;
  status: "pending" | "active" | "complete";
  link?: string;
}

interface PaymentFlowVisualizerProps {
  steps: FlowStep[];
}

function StepIcon({ status }: { status: FlowStep["status"] }) {
  if (status === "complete") {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-6 h-6 rounded-full bg-green-500/20 border border-green-400/40 flex items-center justify-center"
      >
        <IconCheck className="w-3.5 h-3.5 text-green-400" />
      </motion.div>
    );
  }
  if (status === "active") {
    return (
      <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
        <IconLoader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
      </div>
    );
  }
  return <div className="w-6 h-6 rounded-full bg-white/5 border border-white/15" />;
}

export function PaymentFlowVisualizer({ steps }: PaymentFlowVisualizerProps) {
  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
      <h3 className="text-white font-bold text-sm mb-4 tracking-wide uppercase">Payment Flow</h3>
      <div className="flex flex-col gap-0">
        {steps.map((step, idx) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.15, duration: 0.3 }}
            className="flex items-start gap-3"
          >
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {idx < steps.length - 1 && (
                <div className={`w-px h-8 ${step.status === "complete" ? "bg-green-400/30" : "bg-white/10"}`} />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 min-w-0">
              <p
                className={`text-xs font-medium tracking-wide ${
                  step.status === "complete"
                    ? "text-green-300"
                    : step.status === "active"
                      ? "text-purple-300"
                      : "text-white/40"
                }`}
              >
                {step.label}
              </p>
              {step.link ? (
                <a
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 hover:text-white transition-colors break-all"
                >
                  {step.value}
                </a>
              ) : (
                <p className="text-sm text-white/70 break-all">{step.value}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Build flow steps from a gateway result.
 */
export function buildFlowSteps(opts: {
  agentId?: string;
  agentVerified?: boolean;
  paymentTxHash?: string;
  paymentAmount?: string;
  cached?: boolean;
  txHash?: string;
  explorerUrl?: string;
  data?: Record<string, unknown>;
  isPending?: boolean;
  currentStep?: "identity" | "payment" | "cache" | "confirmation" | "result";
}): FlowStep[] {
  const {
    agentId,
    agentVerified,
    paymentTxHash,
    paymentAmount,
    cached,
    txHash,
    explorerUrl,
    data,
    isPending,
    currentStep,
  } = opts;

  // Mirrors the real sequence in useGatewayQuery — identity is signed first,
  // the payment is confirmed before the gateway resolves the cache. Keeping
  // this array in sync with the visual order prevents back-and-forth jumps.
  const getStatus = (step: string): FlowStep["status"] => {
    if (!currentStep) return "pending";
    const order = ["identity", "payment", "confirmation", "cache", "result"];
    const currentIdx = order.indexOf(currentStep);
    const stepIdx = order.indexOf(step);
    if (stepIdx < currentIdx) return "complete";
    if (stepIdx === currentIdx) return isPending ? "active" : "complete";
    return "pending";
  };

  return [
    {
      label: "Agent Identity",
      value:
        agentId && agentVerified
          ? `Verified: ${agentId.slice(0, 6)}...${agentId.slice(-4)}`
          : "Anonymous (no agent signature)",
      status: getStatus("identity"),
    },
    {
      label: "Payment Sent",
      value: paymentTxHash
        ? `${paymentAmount || "..."} — ${paymentTxHash.slice(0, 10)}...${paymentTxHash.slice(-6)}`
        : "Awaiting payment...",
      status: getStatus("payment"),
      link: paymentTxHash ? `https://testnet.monadexplorer.com/tx/${paymentTxHash}` : undefined,
    },
    {
      label: "Payment Confirmed",
      value: getStatus("confirmation") === "complete" ? "Confirmed on Monad" : "Waiting for on-chain confirmation...",
      status: getStatus("confirmation"),
      link: paymentTxHash ? `https://testnet.monadexplorer.com/tx/${paymentTxHash}` : undefined,
    },
    {
      label: "Cache Status",
      value:
        cached === undefined
          ? "Checking..."
          : cached
            ? "HIT — reading from on-chain cache"
            : "MISS — seeding fresh data on-chain",
      status: getStatus("cache"),
    },
    {
      label: "Data Returned",
      value: data
        ? `${Object.keys(data).length} fields received${txHash ? ` — stored at ${txHash.slice(0, 10)}…` : ""}`
        : "Waiting for data...",
      status: getStatus("result"),
      link: explorerUrl,
    },
  ];
}
