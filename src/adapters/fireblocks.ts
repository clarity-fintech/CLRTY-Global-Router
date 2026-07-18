/** Fireblocks custody adapter — mock unless FIREBLOCKS_* env keys are set. */

export type FireblocksMode = "mock" | "live";

export type FireblocksHop = {
  mode: FireblocksMode;
  provider: "fireblocks";
  vaultId: string;
  asset: string;
  amount: string;
  status: "planned" | "submitted" | "mock";
  note: string;
};

export function fireblocksConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.FIREBLOCKS_API_KEY && env.FIREBLOCKS_API_SECRET);
}

export async function planCustodyHop(input: {
  asset: string;
  amount: string;
  vaultId?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<FireblocksHop> {
  const env = input.env ?? process.env;
  const vaultId = input.vaultId || env.FIREBLOCKS_VAULT_ID || "default";

  if (!fireblocksConfigured(env)) {
    return {
      mode: "mock",
      provider: "fireblocks",
      vaultId,
      asset: input.asset,
      amount: input.amount,
      status: "mock",
      note: "Fireblocks adapter mocked — set FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET for live HTTP",
    };
  }

  const base = (env.FIREBLOCKS_BASE_URL || "https://api.fireblocks.io").replace(
    /\/$/,
    "",
  );
  try {
    const res = await fetch(`${base}/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.FIREBLOCKS_API_KEY!,
        // Secret used for JWT in production; MVP posts with header for reachability probe.
        "X-API-Secret": env.FIREBLOCKS_API_SECRET!,
      },
      body: JSON.stringify({
        assetId: input.asset,
        amount: input.amount,
        source: { type: "VAULT_ACCOUNT", id: vaultId },
        operation: "TRANSFER",
        dryRun: true,
      }),
    });
    if (!res.ok) {
      return {
        mode: "mock",
        provider: "fireblocks",
        vaultId,
        asset: input.asset,
        amount: input.amount,
        status: "mock",
        note: `Fireblocks live call failed http_${res.status}; falling back to mock`,
      };
    }
    return {
      mode: "live",
      provider: "fireblocks",
      vaultId,
      asset: input.asset,
      amount: input.amount,
      status: "planned",
      note: "Fireblocks live custody plan",
    };
  } catch (e) {
    return {
      mode: "mock",
      provider: "fireblocks",
      vaultId,
      asset: input.asset,
      amount: input.amount,
      status: "mock",
      note: `Fireblocks error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
