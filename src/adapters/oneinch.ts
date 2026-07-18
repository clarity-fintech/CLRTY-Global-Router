/** 1inch aggregation adapter — mock unless ONEINCH_API_KEY is set. */

export type OneInchMode = "mock" | "live";

export type OneInchQuote = {
  mode: OneInchMode;
  provider: "1inch";
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedOut: string;
  note: string;
};

export function oneInchConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.ONEINCH_API_KEY);
}

export async function quoteOneInch(input: {
  fromToken: string;
  toToken: string;
  amount: string;
  chainId?: number;
  env?: NodeJS.ProcessEnv;
}): Promise<OneInchQuote> {
  const env = input.env ?? process.env;
  if (!oneInchConfigured(env)) {
    return {
      mode: "mock",
      provider: "1inch",
      fromToken: input.fromToken,
      toToken: input.toToken,
      amount: input.amount,
      estimatedOut: input.amount,
      note: "1inch adapter mocked — set ONEINCH_API_KEY for live HTTP",
    };
  }

  const base = (env.ONEINCH_API_URL || "https://api.1inch.dev").replace(/\/$/, "");
  const chainId = input.chainId ?? 1;
  const url = new URL(`${base}/swap/v6.0/${chainId}/quote`);
  url.searchParams.set("src", input.fromToken);
  url.searchParams.set("dst", input.toToken);
  url.searchParams.set("amount", input.amount);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.ONEINCH_API_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return {
        mode: "mock",
        provider: "1inch",
        fromToken: input.fromToken,
        toToken: input.toToken,
        amount: input.amount,
        estimatedOut: input.amount,
        note: `1inch live call failed http_${res.status}; falling back to mock`,
      };
    }
    const body = (await res.json()) as { dstAmount?: string; toAmount?: string };
    return {
      mode: "live",
      provider: "1inch",
      fromToken: input.fromToken,
      toToken: input.toToken,
      amount: input.amount,
      estimatedOut: body.dstAmount || body.toAmount || input.amount,
      note: "1inch live quote",
    };
  } catch (e) {
    return {
      mode: "mock",
      provider: "1inch",
      fromToken: input.fromToken,
      toToken: input.toToken,
      amount: input.amount,
      estimatedOut: input.amount,
      note: `1inch error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
