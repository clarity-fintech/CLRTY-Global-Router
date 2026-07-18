# CLRTY-Global-Router

L1-first route planner for **CLRTY-1** (`clrty-1` / `1202` / `uclrty`).

Cross-chain bridges (Chainlink CCIP, 1inch aggregation) are **deferred** at launch. This service always plans a CLRTY-1 native settlement hop first, then optionally attaches custody / bridge hops. Adapter modes are marked `mock` or `live` honestly — never claim a live bridge when keys are unset.

## Endpoints

| Method | Path | Body |
|--------|------|------|
| `GET` | `/health` | — |
| `POST` | `/v1/route` | `{ from, to, amount, asset? }` |

## Adapters

| Adapter | Env to go live | Default |
|---------|----------------|---------|
| Chainlink CCIP | `CCIP_ROUTER_URL`, `CCIP_API_KEY` | mock |
| 1inch | `ONEINCH_API_KEY` | mock |
| Fireblocks | `FIREBLOCKS_API_KEY`, `FIREBLOCKS_API_SECRET` | mock |

## CLRTY-1 env

| Variable | Default |
|----------|---------|
| `CLRTY_L1_RPC` | `https://rpc.clarity-fintech.com` |
| `CLRTY_API_BASE` | `https://api.clarity-fintech.com` |
| `CLRTY_L1_CHAIN_ID` | `clrty-1` |
| `CLRTY_L1_NUMERIC_CHAIN_ID` | `1202` |
| `CLRTY_RPC_SMOKE` | `1` (set `0` for offline CI) |
| `PORT` | `8090` |

## Run

```bash
cp .env.example .env
npm install
npm test
npm run build
npm start
```

```bash
curl -s http://127.0.0.1:8090/health
curl -s -X POST http://127.0.0.1:8090/v1/route \
  -H 'content-type: application/json' \
  -d '{"from":"clrty-1","to":"clrty-1","amount":"1000000","asset":"uclrty"}'
```

## License

Apache-2.0 © Clarity Fintech
