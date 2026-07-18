/**
 * CLRTY Global Router — prefer CLRTY-1 native settlement first.
 * Cross-chain bridges are deferred; adapters report mock/live honestly.
 */

import {
  CLRTY1_CHAIN_ID,
  CLRTY1_DENOM,
  loadClrty1Config,
  probeClrty1,
} from "./clrty1.js";
import { quoteCcipTransfer, ccipConfigured } from "./adapters/ccip.js";
import { quoteOneInch, oneInchConfigured } from "./adapters/oneinch.js";
import { planCustodyHop, fireblocksConfigured } from "./adapters/fireblocks.js";
import { runPoolLoop, type PoolIntent } from "./liquidity/pool_loops.js";

export type RouteRequest = {
  from: string;
  to: string;
  amount: string;
  asset?: string;
  /** When true (or CLRTY_POOL_QUOTE=1), attach a mock CLRTY pool quote. */
  poolQuote?: boolean;
};

export type RouteHop = {
  kind: "clrty1_native" | "ccip_bridge" | "oneinch_agg" | "fireblocks_custody";
  mode: "native" | "mock" | "live";
  detail: Record<string, unknown>;
};

export type RoutePlan = {
  ok: boolean;
  preference: "clrty1_native_first";
  chainId: string;
  asset: string;
  amount: string;
  from: string;
  to: string;
  hops: RouteHop[];
  bridgesDeferred: boolean;
  adapterStatus: {
    ccip: "mock" | "live_capable";
    oneinch: "mock" | "live_capable";
    fireblocks: "mock" | "live_capable";
  };
  clrty1?: {
    ok: boolean;
    tipHeight?: number | string;
    rpcUrl: string;
  };
  poolQuote?: PoolIntent;
  notes: string[];
};

function sameClrty1Lane(from: string, to: string): boolean {
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  const aliases = new Set([
    "clrty-1",
    "clrty1",
    "1202",
    "native",
    "l1",
    "uclrty",
  ]);
  return aliases.has(a) && aliases.has(b);
}

function needsBridge(from: string, to: string): boolean {
  if (sameClrty1Lane(from, to)) return false;
  return from.toLowerCase() !== to.toLowerCase();
}

export async function planRoute(
  req: RouteRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<RoutePlan> {
  const asset = req.asset || CLRTY1_DENOM;
  const cfg = loadClrty1Config(env);
  const probe = await probeClrty1(cfg);
  const notes: string[] = [];
  const hops: RouteHop[] = [];

  // Always prefer CLRTY-1 native hop first.
  hops.push({
    kind: "clrty1_native",
    mode: "native",
    detail: {
      chainId: CLRTY1_CHAIN_ID,
      numericChainId: cfg.numericChainId,
      from: req.from,
      to: req.to,
      amount: req.amount,
      asset,
      settlement: "l1_native",
    },
  });
  notes.push("Preferred hop: CLRTY-1 native settlement (bridges deferred at launch)");

  const bridge = needsBridge(req.from, req.to);

  if (bridge) {
    notes.push(
      "Cross-chain path requested — CCIP / 1inch hops are deferred; modes marked honestly",
    );

    const ccip = await quoteCcipTransfer({
      sourceChain: req.from,
      destChain: req.to,
      amount: req.amount,
      asset,
      env,
    });
    hops.push({
      kind: "ccip_bridge",
      mode: ccip.mode,
      detail: { ...ccip },
    });

    const inch = await quoteOneInch({
      fromToken: asset,
      toToken: asset,
      amount: req.amount,
      env,
    });
    hops.push({
      kind: "oneinch_agg",
      mode: inch.mode,
      detail: { ...inch },
    });
  }

  const custody = await planCustodyHop({
    asset,
    amount: req.amount,
    env,
  });
  hops.push({
    kind: "fireblocks_custody",
    mode: custody.mode,
    detail: { ...custody },
  });

  let poolQuote: PoolIntent | undefined;
  const wantPool =
    req.poolQuote === true || env.CLRTY_POOL_QUOTE === "1";
  if (wantPool) {
    const poolAsset =
      asset.toUpperCase() === "USDT" ? "USDT" : "CLRTY";
    poolQuote = await runPoolLoop(
      "quotePool",
      { asset: poolAsset, amount: req.amount, dryRun: true },
      cfg,
    );
    notes.push("Optional CLRTY pool quote attached via runPoolLoop(quotePool)");
  }

  return {
    ok: true,
    preference: "clrty1_native_first",
    chainId: CLRTY1_CHAIN_ID,
    asset,
    amount: req.amount,
    from: req.from,
    to: req.to,
    hops,
    bridgesDeferred: true,
    adapterStatus: {
      ccip: ccipConfigured(env) ? "live_capable" : "mock",
      oneinch: oneInchConfigured(env) ? "live_capable" : "mock",
      fireblocks: fireblocksConfigured(env) ? "live_capable" : "mock",
    },
    clrty1: {
      ok: probe.ok,
      tipHeight: probe.tipHeight,
      rpcUrl: probe.rpcUrl,
    },
    poolQuote,
    notes,
  };
}
