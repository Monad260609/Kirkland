#!/usr/bin/env tsx
import "dotenv/config";
import { Command } from "commander";
import { queryCommand, statsCommand } from "./commands.js";

const program = new Command();

program
  .name("cachemarket")
  .description("CLI for the Cachemarket on-chain data protocol (Monad Testnet)")
  .version("0.1.0");

program
  .command("query <q>")
  .description('Query the on-chain cache (e.g. "price of ETH", "weather in Denver")')
  .action(async (q: string) => {
    await queryCommand(q);
  });

program
  .command("stats")
  .description("Read on-chain cache statistics directly from the contract")
  .action(async () => {
    await statsCommand();
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`\n  Error: ${err.message}\n`);
  process.exit(1);
});
