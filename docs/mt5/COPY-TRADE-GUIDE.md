# Social Forex Copy Trading

Auto-copy trades from signal providers to your MT5 account.

## How It Works

1. **Follow a trader** on Social Forex
2. **Click "Copy"** on their profile
3. **Configure** lot size or % of account (max 10%)
4. **Get a token** and paste it into the EA
5. **EA auto-copies** new signals to your MT5 account

## Setup Guide

### Step 1: Choose a Trader to Copy

1. Go to **Leaderboard** or browse **Signals**
2. Click on a trader's name to view their profile
3. Click the **"Copy"** button

### Step 2: Configure Copy Settings

Choose one of two modes:

#### Option A: Fixed Lot Size
- Enter a fixed lot size for every trade (e.g., 0.01, 0.1, 1.0)
- Best for: Consistent position sizing

#### Option B: % of Account (Recommended)
- Enter a risk percentage (0.1% to 10%)
- Lot size is calculated automatically based on your account balance and SL distance
- Best for: Risk-managed copying

### Step 3: Get Your Copy Token

After subscribing, you'll receive a **Copy Token** (looks like `ct_abc12345`).

**Save this token** — you'll need it for the EA.

### Step 4: Download the EA

Download `SocialForexCopyTrade.mq5` from the setup page.

### Step 5: Install in MT5

1. Open **MetaTrader 5**
2. Go to `File -> Open Data Folder`
3. Navigate to `MQL5/Experts/`
4. Copy `SocialForexCopyTrade.mq5` to this folder
5. Restart MT5 or right-click **Navigator** → **Refresh**

### Step 6: Configure MT5

1. Go to `Tools -> Options -> Expert Advisors`
2. ✅ Enable **Allow Algo Trading**
3. ✅ Enable **Allow WebRequest for listed URL**
4. Add: `https://www.toolforex.xyz`

> **Note — two separate switches:**
> - The checkbox in Options above is a *permanent* global setting.
> - The **Algo Trading toolbar button** (▶ green icon in the toolbar) is a *per-session* toggle that overrides everything. It must be **ON** (green) every time you open MT5.
> - If the Journal tab shows `Retcode=10027`, it means the toolbar button is OFF — click it to turn it green.

### Step 7: Attach the EA

1. Open **Navigator** panel (Ctrl+N)
2. Find `SocialForexCopyTrade` under **Expert Advisors**
3. Drag it onto any chart (e.g., XAUUSD, EURUSD)
4. In the settings dialog:
   - **ApiEndpoint**: `https://toolforex.xyz/api/copy-trade/signals`
   - **CopyToken**: Paste your token from Step 3
   - **PollSeconds**: `10` (default)
   - **AllowAutoTrade**: `true`
   - **MaxSlippage**: `30` (default)
   - **MagicNumber**: `20260621` (default)
5. Click **OK**

### Step 8: Verify

1. Check the **Experts** tab in MT5 for logs
2. You should see: `SocialForexCopyTrade initialized. Token=ct_...`
3. When the provider opens a new signal, the EA will auto-copy it

## EA Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `ApiEndpoint` | `https://toolforex.xyz/api/copy-trade/signals` | API endpoint to poll |
| `CopyToken` | (empty) | Your unique copy token |
| `PollSeconds` | `10` | How often to check for new signals |
| `AllowAutoTrade` | `true` | Enable/disable auto-trading |
| `MaxSlippage` | `30` | Max slippage in points |
| `MagicNumber` | `20260621` | Unique ID for copied orders |

## Safety Notes

⚠️ **Copy trading involves risk.** Only risk what you can afford to lose.

- The EA will open trades automatically
- You can stop copying anytime from the profile page
- The EA only copies NEW signals — it won't copy existing open positions
- Each trade is tracked in your journal automatically
- You can revoke the token anytime to stop all copying

## Troubleshooting

### EA not connecting
- Check that `Allow WebRequest` is enabled in MT5 Options
- Verify the URL `https://www.toolforex.xyz` is added to the allowed list
- Check the Experts tab for error messages

### Trades not opening / `Retcode=10027`

`Retcode=10027` means **"Autotrading disabled by client terminal"** — the Algo Trading button is OFF.

Fix:
1. Look at the MT5 toolbar — find the **▶ Algo Trading** button
2. Click it so it turns **green**
3. Also make sure `AllowAutoTrade = true` in the EA's input settings

Other causes:
- Symbol not available on your broker → check MT5 Market Watch
- Insufficient margin → reduce lot size or top up your account
- `MaxSlippage` too tight → increase to 50–100 points for volatile pairs

### How to stop copying
1. Go to the trader's profile on Social Forex
2. Click **"Manage Copy"**
3. The EA will stop receiving signals
4. You can also remove the EA from the chart in MT5

## Files

| File | Location | Description |
|------|----------|-------------|
| `SocialForexCopyTrade.mq5` | `docs/mt5/` | Copy Trading EA source |
| `SocialForexBridge.mq5` | `docs/mt5/` | Read-only bridge EA (separate) |
