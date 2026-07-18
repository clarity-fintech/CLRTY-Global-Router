import { describe, expect, it } from "vitest";
import { planRoute } from "../src/router.js";
import { ccipConfigured } from "../src/adapters/ccip.js";
import { oneInchConfigured } from "../src/adapters/oneinch.js";
import { fireblocksConfigured } from "../src/adapters/fireblocks.js";

describe("planRoute", () => {
  it("prefers CLRTY-1 native hop first for same-lane transfer", async () => {
    const plan = await planRoute(
      { from: "clrty-1", to: "clrty-1", amount: "1000000", asset: "uclrty" },
      { CLRTY_RPC_SMOKE: "0", CLRTY_L1_RPC: "http://127.0.0.1:9" },
    );
    expect(plan.ok).toBe(true);
    expect(plan.preference).toBe("clrty1_native_first");
    expect(plan.bridgesDeferred).toBe(true);
    expect(plan.hops[0]?.kind).toBe("clrty1_native");
    expect(plan.hops[0]?.mode).toBe("native");
    expect(plan.hops.some((h) => h.kind === "ccip_bridge")).toBe(false);
    expect(plan.hops.some((h) => h.kind === "fireblocks_custody")).toBe(true);
  });

  it("marks bridge hops as mock when vendor keys unset", async () => {
    const env = {
      CLRTY_RPC_SMOKE: "0",
      CLRTY_L1_RPC: "http://127.0.0.1:9",
    };
    expect(ccipConfigured(env)).toBe(false);
    expect(oneInchConfigured(env)).toBe(false);
    expect(fireblocksConfigured(env)).toBe(false);

    const plan = await planRoute(
      { from: "clrty-1", to: "ethereum", amount: "5000", asset: "uclrty" },
      env,
    );
    expect(plan.adapterStatus.ccip).toBe("mock");
    expect(plan.adapterStatus.oneinch).toBe("mock");
    expect(plan.adapterStatus.fireblocks).toBe("mock");

    const ccip = plan.hops.find((h) => h.kind === "ccip_bridge");
    const inch = plan.hops.find((h) => h.kind === "oneinch_agg");
    const fb = plan.hops.find((h) => h.kind === "fireblocks_custody");
    expect(ccip?.mode).toBe("mock");
    expect(inch?.mode).toBe("mock");
    expect(fb?.mode).toBe("mock");
  });
});
