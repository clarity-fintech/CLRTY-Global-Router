/** Chainlink CCIP adapter — mock unless CCIP_* env keys are set. */

export type CcipMode = "mock" | "live";

export type CcipQuote = {
  mode: CcipMode;
  provider: "chainlink_ccip";
  sourceChain: string;
  destChain: string;
  estimatedFee: string;
  messageId?: string;
  note: string;
};

export function ccipConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CCIP_ROUTER_URL && env.CCIP_API_KEY);
}

export async function quoteCcipTransfer(input: {
  sourceChain: string;
  destChain: string;
  amount: string;
  asset: string;
  env?: NodeJS.ProcessEnv;
}): Promise<CcipQuote> {
  const env = input.env ?? process.env;
  if (!ccipConfigured(env)) {
    return {
      mode: "mock",
      provider: "chainlink_ccip",
      sourceChain: input.sourceChain,
      destChain: input.destChain,
      estimatedFee: "0",
      note: "CCIP adapter mocked — set CCIP_ROUTER_URL and CCIP_API_KEY for live HTTP",
    };
  }

  const url = `${env.CCIP_ROUTER_URL!.replace(/\/$/, "")}/quote`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CCIP_API_KEY}`,
      },
      body: JSON.stringify({
        sourceChain: input.sourceChain,
        destChain: input.destChain,
        amount: input.amount,
        asset: input.asset,
      }),
    });
    if (!res.ok) {
      return {
        mode: "mock",
        provider: "chainlink_ccip",
        sourceChain: input.sourceChain,
        destChain: input.destChain,
        estimatedFee: "0",
        note: `CCIP live call failed http_${res.status}; falling back to mock`,
      };
    }
    const body = (await res.json()) as { fee?: string; messageId?: string };
    return {
      mode: "live",
      provider: "chainlink_ccip",
      sourceChain: input.sourceChain,
      destChain: input.destChain,
      estimatedFee: body.fee ?? "0",
      messageId: body.messageId,
      note: "CCIP live quote",
    };
  } catch (e) {
    return {
      mode: "mock",
      provider: "chainlink_ccip",
      sourceChain: input.sourceChain,
      destChain: input.destChain,
      estimatedFee: "0",
      note: `CCIP error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
