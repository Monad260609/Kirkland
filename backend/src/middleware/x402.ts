import { createThirdwebClient } from "thirdweb";
import { facilitator } from "thirdweb/x402";
import { paymentMiddleware } from "x402-hono";

// Client thirdweb (backend → utilise secretKey)
const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

// Facilitator — gere la verification et le settlement on-chain
const twFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.SERVER_WALLET!,
});

// Le middleware exige un paiement x402 avant d'acceder aux routes /api/*
// Prix = $0.01 pour un cache miss (premier a fetcher)
// Les cache hits bypass ce middleware (gere dans index.ts)
export const x402Middleware = paymentMiddleware(
  process.env.SERVER_WALLET!,
  {
    "POST /api/query": {
      price: "$0.01",
      network: "eip155:10143", // Monad testnet
      config: { description: "Query the x402 Gateway — Cache Miss (fresh data)" },
    },
  },
  twFacilitator,
);
