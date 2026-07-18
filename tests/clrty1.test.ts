import { describe, expect, it } from "vitest";
import {
  CLRTY1_CHAIN_ID,
  CLRTY1_NUMERIC_CHAIN_ID,
  loadClrty1Config,
  rpcSmokeEnabled,
} from "../src/clrty1.js";

describe("clrty1 config", () => {
  it("defaults to clrty-1 / 1202", () => {
    const cfg = loadClrty1Config({});
    expect(cfg.chainId).toBe(CLRTY1_CHAIN_ID);
    expect(cfg.numericChainId).toBe(CLRTY1_NUMERIC_CHAIN_ID);
    expect(cfg.rpcUrl).toContain("clarity-fintech.com");
  });

  it("respects CLRTY_RPC_SMOKE=0", () => {
    expect(rpcSmokeEnabled({ CLRTY_RPC_SMOKE: "0" })).toBe(false);
    expect(rpcSmokeEnabled({ CLRTY_RPC_SMOKE: "1" })).toBe(true);
  });
});
