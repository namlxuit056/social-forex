# Social Forex MT5 Bridge

This is a read-only MetaTrader 5 Expert Advisor bridge. It sends account info
and open positions to Social Forex through `/api/mt5/bridge`.

It does not place trades and does not need your MT5 password.

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
   - `BridgeToken` to the token from `/mt5`
   - `HeartbeatSeconds` to `30` or higher
10. Enable Algo Trading.

The `/mt5` page should show `Connected` after the first successful heartbeat.

## Payload

The EA sends:

- account login, server, name, company, currency
- balance, equity, margin, free margin, leverage
- open positions with ticket, symbol, type, volume, entry, current price, SL, TP, profit, swap, opened time
- pending orders with ticket, symbol, order type, volume, entry, SL, TP, setup time

Social Forex creates/updates a FREE signal for each MT5 pending order or open
position. Pending orders use `PENDING`; open positions use `ACTIVE`.

## Safety

- Never paste your MT5 password into Social Forex.
- Keep the bridge token private.
- Revoke a token from `/mt5` if it is exposed.
- This MVP is read-only. Do not add automated trading until legal, risk, and user-consent flows are ready.
