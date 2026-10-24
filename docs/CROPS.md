# CROPS review

Novafolio is a read-only portfolio viewer. It does not deploy contracts, hold
keys, or send transactions. Balances, Aave v3, Compound v3, and liquid staking
positions are read from public chains. This note records the chosen default and
the places a host, a dependency, or a missing license can still get in the way.

## Chosen default

Ship a hosted Next.js app that reads public chain data for an address the user
connects or pastes. Guest state stays in `localStorage`. Optional Sign-In With
Ethereum sync exists only when `DATABASE_URL` and `SESSION_SECRET` are set.
Paid checkout stays off unless Stripe is configured later. The user can close
the tab and their funds are unchanged, because the funds were never here.

## Censorship resistance

- **Risk.** One host can take the website offline or block a region. An RPC
  provider can refuse to answer a read for an address.
- **Mitigation.** There is no admin key and no upgradeable contract controlled
  by this app, because this app deploys none. Positions stay on Ethereum, Base,
  Arbitrum, Optimism, Polygon, BNB Chain, and Avalanche.
- **User escape.** Self-host the public repository against a public or private
  RPC. The same balances are visible in a block explorer and in the protocol
  apps. The host cannot freeze assets it does not custody.

## Open

- **Risk.** This repository has no `LICENSE` file. Visitors cannot assume they
  may copy or fork it.
- **Mitigation.** None in code. Choosing an OSI license is an owner action.
  This review does not add one.
- **User escape.** Until a license is published, do not treat the source as
  reusable. Leaving the product does not require the source: the positions are
  onchain and can be managed in Aave, Compound, and the user's wallet.

## Free (no lock-in)

- **Risk.** Optional Postgres sync and a future Stripe plan create a hosted
  account. The UI does not let a user pick their own RPC, so reads go through
  Alchemy when `ALCHEMY_API_KEY` is set and through public RPCs otherwise.
- **Mitigation.** Guest mode works with no account. Sign-in is refused when
  there is nowhere durable to store it. Stripe is unused unless keys are set.
  Pro is labeled coming soon.
- **User escape.** Stay signed out and clear site data. Revoke allowances and
  move positions in the protocol interfaces or via revoke.cash. Nothing in
  Novafolio has to be withdrawn, because nothing was deposited.

## Privacy

- **Risk.** A balance or allowance read sends the wallet address to Alchemy or
  to the public RPC. Those operators can see the query. Optional sign-in stores
  that address as the account id, with snapshots, manual positions, and
  preferences. Approval links open revoke.cash with the address in the URL.
  Plausible, if `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set, loads a cookie-less page
  counter.
- **Mitigation.** Coinbase wallet-connect telemetry is off
  (`OnchainKitProvider` `analytics: false`). CoinGecko and DeFiLlama receive
  market queries, not the user's address. There is no advertising and no
  required email. The session cookie is http-only. The app never asks for a
  transaction signature. Transfers and the gas report are skipped when Alchemy
  is unset.
- **User escape.** Watch an address you are willing to show an RPC. Do not sign
  in. Leave Plausible unset. Self-host and choose the RPC. Clearing browser
  storage removes guest data. Server-side deletion is a signed request on the
  support page.

## Security

- **Risk.** A compromised host could swap the frontend and phish a signature
  even though this app is read-only. Approval history on public RPCs cannot be
  scanned back to genesis; a wide `eth_getLogs` is rejected, so an older
  unknown spender can be missed if the recent window fails.
- **Mitigation.** Current allowances to known spenders (Aave pools, Compound
  comets, Permit2, Uniswap routers, 1inch) are read with Multicall
  `allowance()`, not by trusting a log scan. A recent, token-filtered log
  window only adds extra spenders, and those are confirmed with `allowance()`
  before they are shown. Known-protocol allowances still appear when that
  window fails, and the card says the history was partial. Each open allowance
  is labeled: no spending limit, a spender with no contract code, a spender
  that is not in Novafolio's known-contract list, or a spender on Revoke.cash's
  MIT-licensed approval exploit list (copied 24 Oct 2026, notice in
  `src/lib/exploits/REVOKE-CASH-MIT.txt`). The label does not read contract
  source, so it cannot say who can upgrade the spender or whether a timelock
  or multisig guards that upgrade. Novafolio does not send a revoke. MetaMask
  analytics in the connector is off.
- **User escape.** Do not sign a message you did not expect. Review and change
  the allowance on revoke.cash, or in the token contract, including if this
  site disappears. Funds stay in the wallet either way. An unlimited allowance
  to a known contract can still be used by that contract until the user changes
  it there.

## Accepted compromises

- The website is one operator. The frontend is not pinned to IPFS.
- Users cannot set a custom RPC in the UI. Alchemy or the public endpoint sees
  the address. That leak is documented on the privacy page.
- Approval discovery beyond the recent tip (~8,000 blocks) is not guaranteed on
  public RPCs. Unknown older spenders may be absent. Known spenders are not.
- No license is shipped. The owner still has to choose one.
- Sequencer censorship on L2s is out of scope: this app does not submit
  transactions.
- Polygon bridged USDC (`0x2791…4174`) reports symbol `USDC` onchain. The
  catalog keeps `USDC` so it matches `symbol()`. Native Polygon USDC is a
  separate reserve.
- Arbitrum Compound and Aave list `USD₮0`. Polygon Aave lists `USDT0`. Those
  match `symbol()` and stay in the stable-price sets.
- Dashboard polling stays on a several-minute cache so a free Alchemy plan is
  not burned by a few-second refresh.
