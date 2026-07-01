# Social Forex MT5 Bridge

This is a MetaTrader 5 Expert Advisor bridge. It sends account info and open
positions to Social Forex through `/api/mt5/bridge`, and polls
`/api/mt5/commands` to execute Close / Modify / Cancel / Close All / New
Order actions that you queue from the `/positions` dashboard.

It never opens new positions or trades on its own initiative — every trade
action, including new Buy/Sell/Buy Limit/Sell Limit/Buy Stop/Sell Stop
orders, only happens because you explicitly triggered it from the
dashboard. It does not need your MT5 password.

## Setup

1. Sign in to Social Forex and open `/mt5`.
2. Create a bridge token. Copy it immediately; it is shown only once.
3. Copy `SocialForexBridge.mq5` into your MT5 `MQL5/Experts` folder.
4. Restart MT5 or refresh Navigator.
5. Open `Tools -> Options -> Expert Advisors`.
6. Enable `Allow WebRequest for listed URL`.
7. Add your Social Forex origin, for example:
   - `https://toolforex.xyz`
   - or your production domain
8. Attach `SocialForexBridge` to any chart.
9. Set:
   - `BridgeEndpoint` to `https://your-domain.com/api/mt5/bridge`
   - `CommandsEndpoint` to `https://your-domain.com/api/mt5/commands`
   - `BridgeToken` to the token from `/mt5`
   - `HeartbeatSeconds` to `30` or higher (account/position snapshot cadence)
   - `CommandPollSeconds` to `3`-`5` (how often it checks for queued Close/Modify/Close All commands)
10. Enable Algo Trading (required for the EA to execute Close/Modify/Close All commands, not just for the heartbeat).

The `/mt5` page should show `Connected` after the first successful heartbeat.

## Payload

The EA sends:

- account login, server, name, company, currency
- balance, equity, margin, free margin, leverage
- open positions with ticket, symbol, type, volume, entry, current price, SL, TP, profit, swap, opened time
- pending orders with ticket, symbol, order type, volume, entry, SL, TP, setup time

Social Forex creates/updates a FREE signal for each MT5 pending order or open
position. Pending orders use `PENDING`; open positions use `ACTIVE`.

## Commands

The EA also polls `CommandsEndpoint` every `CommandPollSeconds` and executes
whatever you queue from the `/positions` dashboard:

- `CLOSE_POSITION` — closes a single open position by ticket
- `MODIFY_POSITION` — updates SL/TP on a single open position by ticket
- `CANCEL_ORDER` — cancels a single pending order by ticket
- `MODIFY_ORDER` — updates SL/TP on a single pending order by ticket (entry price unchanged)
- `CLOSE_ALL` — closes every open position and cancels every pending order
- `PLACE_BUY` / `PLACE_SELL` — opens a market order on the given symbol/volume
- `PLACE_BUY_LIMIT` / `PLACE_SELL_LIMIT` / `PLACE_BUY_STOP` / `PLACE_SELL_STOP` — places a pending order at the given price

Each command is acknowledged back to `/api/mt5/commands/{id}/ack` with
success/failure so the dashboard reflects the real outcome.

## Safety

- Never paste your MT5 password into Social Forex.
- Keep the bridge token private.
- Revoke a token from `/mt5` if it is exposed.
- The EA only ever acts on commands you explicitly queue from the dashboard (Close / Modify / Cancel / Close All / New Order). It never opens new positions or trades autonomously.
