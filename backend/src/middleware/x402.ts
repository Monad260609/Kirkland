import { createThirdwebClient } from "thirdweb";
import { facilitator } from "thirdweb/x402";
import { paymentMiddleware } from "x402-hono";

// Thirdweb client (backend → uses secretKey)
const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

// Facilitator — handles verification and on-chain settlement
const twFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.SERVER_WALLET!,
});

// The middleware requires an x402 payment before accessing /api/* routes
// Price = $0.01 for a cache miss (first to fetch)
// Cache hits bypass this middleware (handled in index.ts)
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
