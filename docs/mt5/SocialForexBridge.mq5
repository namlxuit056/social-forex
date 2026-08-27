//+------------------------------------------------------------------+
//| SocialForexBridge.mq5                                            |
//| MT5 bridge for Social Forex.                                      |
//| Sends account info + open positions/orders, and executes          |
//| close/modify/close-all commands queued from the web dashboard.    |
//| It never opens new positions on its own.                          |
//+------------------------------------------------------------------+
#property copyright "Social Forex"
#property version   "1.34"
#property strict

input string BridgeEndpoint   = "https://www.toolforex.xyz/api/mt5/bridge";
input string CommandsEndpoint = "https://www.toolforex.xyz/api/mt5/commands";
input string BridgeToken      = "";
input int    HeartbeatSeconds = 5;     // fallback snapshot push when no ticks arrive
input int    MinSnapshotIntervalMs = 3000; // fastest we'll re-push account/positions even on rapid ticks
input int    CommandPollSeconds = 1;   // fallback poll when no ticks arrive (weekends, quiet symbol)
input int    MinCommandCheckIntervalMs = 500; // fastest we'll re-check commands even on rapid ticks
input int    SlippagePoints   = 30;
input int    MagicNumber      = 990001;
input int    RetryAttempts    = 3;    // attempts per command before giving up
input int    RetryDelayMs     = 300;  // delay between attempts, price/state is re-read each retry

ulong last_command_check_ms = 0;
ulong last_snapshot_check_ms = 0;

// Lets both OnTick and the OnTimer fallback share one debounce so a price tick
// (the moments latency matters most) can trigger a check well before the
// CommandPollSeconds fallback would otherwise fire.
bool ShouldCheckCommands()
{
   ulong now = GetTickCount64();
   if(now - last_command_check_ms < (ulong)MathMax(0, MinCommandCheckIntervalMs))
      return false;
   last_command_check_ms = now;
   return true;
}

// Same idea for the account/positions push: the server only does the heavy
// signal/journal sync when trades actually changed (see tradeHash in
// src/app/api/mt5/bridge/route.ts), so pushing more often than the fixed
// HeartbeatSeconds costs little and lets the dashboard reflect price/profit
// moves without waiting up to 30s.
bool ShouldPushSnapshot()
{
   ulong now = GetTickCount64();
   if(now - last_snapshot_check_ms < (ulong)MathMax(0, MinSnapshotIntervalMs))
      return false;
   last_snapshot_check_ms = now;
   return true;
}

bool IsRetryableRetcode(uint rc)
{
   return rc == TRADE_RETCODE_REQUOTE
       || rc == TRADE_RETCODE_PRICE_CHANGED
       || rc == TRADE_RETCODE_PRICE_OFF
       || rc == TRADE_RETCODE_TIMEOUT
       || rc == TRADE_RETCODE_CONNECTION
       || rc == TRADE_RETCODE_TOO_MANY_REQUESTS;
}

// Mirrors src/lib/mt5/pip-size.ts so trail distances match what the dashboard shows.
double GetPipSize(string symbol)
{
   string s = symbol;
   StringToUpper(s);
   if(StringFind(s, "JPY") >= 0)
      return 0.01;
   if(StringFind(s, "XAU") == 0)
      return 0.1;
   if(StringFind(s, "XAG") == 0)
      return 0.01;
   if(StringFind(s, "US30") == 0 || StringFind(s, "NAS100") == 0 || StringFind(s, "SPX500") == 0 ||
      StringFind(s, "GER40") == 0 || StringFind(s, "UK100") == 0 || StringFind(s, "JP225") == 0 ||
      StringFind(s, "US500") == 0 || StringFind(s, "GER30") == 0 || StringFind(s, "AUS200") == 0 ||
      StringFind(s, "FRA40") == 0)
      return 1.0;
   if(StringFind(s, "BTC") >= 0 || StringFind(s, "ETH") >= 0 || StringFind(s, "XRP") >= 0 || StringFind(s, "LTC") >= 0)
      return 1.0;
   return 0.0001;
}

datetime last_send_at = 0;
datetime last_poll_at = 0;

//+------------------------------------------------------------------+
//| Broker symbol resolution                                          |
//| The dashboard queues orders with the bare instrument name          |
//| ("XAUUSD"). Standard/cent accounts append a suffix to every symbol |
//| (XAUUSDm, EURUSD.r, GBPUSDc), so map the requested name onto       |
//| whatever this terminal actually calls it before trading.           |
//+------------------------------------------------------------------+
string g_broker_suffix = "\x01"; // "\x01" = not detected yet

bool AffixLooksLikeSuffix(string s)
{
   int n = StringLen(s);
   if(n == 0) return true;
   if(n > 5)  return false;
   for(int i = 0; i < n; i++)
   {
      ushort c = StringGetCharacter(s, i);
      bool ok = c == '.' || c == '-' || c == '_' || c == '+' || c == '#' ||
                (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                (c >= '0' && c <= '9');
      if(!ok) return false;
   }
   return true;
}

string DetectBrokerSuffix()
{
   if(g_broker_suffix != "\x01") return g_broker_suffix;
   g_broker_suffix = "";

   string bases[] = {"EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD",
                     "NZDUSD","EURJPY","GBPJPY","XAUUSD","XAGUSD","BTCUSD"};

   string chart = _Symbol;
   StringToUpper(chart);
   for(int b = 0; b < ArraySize(bases); b++)
      if(StringFind(chart, bases[b]) == 0)
      {
         g_broker_suffix = StringSubstr(_Symbol, StringLen(bases[b]));
         return g_broker_suffix;
      }

   int total = SymbolsTotal(false);
   for(int i = 0; i < total; i++)
   {
      string name  = SymbolName(i, false);
      string nameU = name;
      StringToUpper(nameU);
      for(int b = 0; b < ArraySize(bases); b++)
         if(StringFind(nameU, bases[b]) == 0)
         {
            string rest = StringSubstr(name, StringLen(bases[b]));
            if(AffixLooksLikeSuffix(rest)) { g_broker_suffix = rest; return g_broker_suffix; }
         }
   }
   return g_broker_suffix;
}

// Tradable local name for a requested symbol, or "" if this broker has no match.
string ResolveBrokerSymbol(string want)
{
   if(want == "") return "";

   if(SymbolSelect(want, true)) return want;

   string suf = DetectBrokerSuffix();
   if(suf != "" && SymbolSelect(want + suf, true)) return want + suf;

   string wantU = want;
   StringToUpper(wantU);
   string best = "";
   int total = SymbolsTotal(false);
   for(int i = 0; i < total; i++)
   {
      string name  = SymbolName(i, false);
      string nameU = name;
      StringToUpper(nameU);
      if(StringFind(nameU, wantU) != 0) continue;
      string suffix = StringSubstr(name, StringLen(want));
      if(!AffixLooksLikeSuffix(suffix)) continue;
      if(!SymbolSelect(name, true)) continue;
      if(best == "" || StringLen(name) < StringLen(best)) best = name;
   }
   return best;
}

string JsonEscape(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\n", "\\n");
   return value;
}

string JsonString(string value)
{
   return "\"" + JsonEscape(value) + "\"";
}

string PositionTypeName(long type)
{
   if(type == POSITION_TYPE_BUY)
      return "BUY";
   if(type == POSITION_TYPE_SELL)
      return "SELL";
   return "UNKNOWN";
}

string OrderTypeName(long type)
{
   if(type == ORDER_TYPE_BUY_LIMIT)
      return "BUY_LIMIT";
   if(type == ORDER_TYPE_SELL_LIMIT)
      return "SELL_LIMIT";
   if(type == ORDER_TYPE_BUY_STOP)
      return "BUY_STOP";
   if(type == ORDER_TYPE_SELL_STOP)
      return "SELL_STOP";
   if(type == ORDER_TYPE_BUY_STOP_LIMIT)
      return "BUY_STOP_LIMIT";
   if(type == ORDER_TYPE_SELL_STOP_LIMIT)
      return "SELL_STOP_LIMIT";
   if(type == ORDER_TYPE_BUY)
      return "BUY";
   if(type == ORDER_TYPE_SELL)
      return "SELL";
   return "UNKNOWN";
}

string AccountJson()
{
   string json = "{";
   json += "\"login\":" + JsonString(IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN))) + ",";
   json += "\"server\":" + JsonString(AccountInfoString(ACCOUNT_SERVER)) + ",";
   json += "\"name\":" + JsonString(AccountInfoString(ACCOUNT_NAME)) + ",";
   json += "\"company\":" + JsonString(AccountInfoString(ACCOUNT_COMPANY)) + ",";
   json += "\"currency\":" + JsonString(AccountInfoString(ACCOUNT_CURRENCY)) + ",";
   json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
   json += "\"margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ",";
   json += "\"freeMargin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + ",";
   json += "\"leverage\":" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LEVERAGE));
   json += "}";
   return json;
}

string PositionsJson()
{
   string json = "[";
   int total = PositionsTotal();
   bool first = true;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!PositionSelectByTicket(ticket))
         continue;

      if(!first)
         json += ",";
      first = false;

      datetime opened_at = (datetime)PositionGetInteger(POSITION_TIME);

      json += "{";
      json += "\"ticket\":" + JsonString(IntegerToString((long)ticket)) + ",";
      json += "\"identifier\":" + JsonString(IntegerToString((long)PositionGetInteger(POSITION_IDENTIFIER))) + ",";
      json += "\"symbol\":" + JsonString(PositionGetString(POSITION_SYMBOL)) + ",";
      json += "\"type\":" + JsonString(PositionTypeName(PositionGetInteger(POSITION_TYPE))) + ",";
      json += "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
      json += "\"priceOpen\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5) + ",";
      json += "\"priceCurrent\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_CURRENT), 5) + ",";
      json += "\"stopLoss\":" + DoubleToString(PositionGetDouble(POSITION_SL), 5) + ",";
      json += "\"takeProfit\":" + DoubleToString(PositionGetDouble(POSITION_TP), 5) + ",";
      json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ",";
      json += "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 2) + ",";
      json += "\"openedAt\":" + JsonString(TimeToString(opened_at, TIME_DATE | TIME_SECONDS));
      json += "}";
   }

   json += "]";
   return json;
}

string OrdersJson()
{
   string json = "[";
   int total = OrdersTotal();
   bool first = true;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0)
         continue;
      if(!OrderSelect(ticket))
         continue;

      long type = OrderGetInteger(ORDER_TYPE);
      if(type == ORDER_TYPE_BUY || type == ORDER_TYPE_SELL)
         continue;

      if(!first)
         json += ",";
      first = false;

      datetime opened_at = (datetime)OrderGetInteger(ORDER_TIME_SETUP);

      json += "{";
      json += "\"ticket\":" + JsonString(IntegerToString((long)ticket)) + ",";
      json += "\"symbol\":" + JsonString(OrderGetString(ORDER_SYMBOL)) + ",";
      json += "\"type\":" + JsonString(OrderTypeName(type)) + ",";
      json += "\"volume\":" + DoubleToString(OrderGetDouble(ORDER_VOLUME_CURRENT), 2) + ",";
      json += "\"priceOpen\":" + DoubleToString(OrderGetDouble(ORDER_PRICE_OPEN), 5) + ",";
      json += "\"stopLoss\":" + DoubleToString(OrderGetDouble(ORDER_SL), 5) + ",";
      json += "\"takeProfit\":" + DoubleToString(OrderGetDouble(ORDER_TP), 5) + ",";
      json += "\"openedAt\":" + JsonString(TimeToString(opened_at, TIME_DATE | TIME_SECONDS));
      json += "}";
   }

   json += "]";
   return json;
}

// Reports realized exit deals from trade history so the server can record a closed
// position's real close price/profit instead of reconstructing it from the last-seen
// floating profit, which can be a few seconds (and a few pips) stale by the time the
// EA notices the position is no longer in PositionsJson(). Looks back a few days so a
// dashboard that was briefly unreachable still gets the real numbers on the next sync.
string ClosedDealsJson()
{
   string json = "[";
   bool first = true;
   datetime from = TimeCurrent() - 3 * 24 * 60 * 60;

   if(!HistorySelect(from, TimeCurrent()))
      return "[]";

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0)
         continue;

      long entry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY)
         continue; // only closing legs, not the opening deal

      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         continue; // skip balance/credit/correction entries

      long positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      if(positionId == 0)
         continue;

      if(!first)
         json += ",";
      first = false;

      datetime closed_at = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      json += "{";
      json += "\"positionId\":" + JsonString(IntegerToString(positionId)) + ",";
      json += "\"price\":" + DoubleToString(HistoryDealGetDouble(dealTicket, DEAL_PRICE), 5) + ",";
      json += "\"profit\":" + DoubleToString(HistoryDealGetDouble(dealTicket, DEAL_PROFIT), 2) + ",";
      json += "\"swap\":" + DoubleToString(HistoryDealGetDouble(dealTicket, DEAL_SWAP), 2) + ",";
      json += "\"commission\":" + DoubleToString(HistoryDealGetDouble(dealTicket, DEAL_COMMISSION), 2) + ",";
      json += "\"closedAt\":" + JsonString(TimeToString(closed_at, TIME_DATE | TIME_SECONDS));
      json += "}";
   }

   json += "]";
   return json;
}

string BuildPayload()
{
   string json = "{";
   json += "\"token\":" + JsonString(BridgeToken) + ",";
   json += "\"account\":" + AccountJson() + ",";
   json += "\"positions\":" + PositionsJson() + ",";
   json += "\"orders\":" + OrdersJson() + ",";
   json += "\"closedDeals\":" + ClosedDealsJson() + ",";
   json += "\"terminal\":{";
   json += "\"name\":" + JsonString(TerminalInfoString(TERMINAL_NAME)) + ",";
   json += "\"build\":" + IntegerToString((int)TerminalInfoInteger(TERMINAL_BUILD));
   json += "}";
   json += "}";
   return json;
}

bool SendSnapshot()
{
   if(BridgeToken == "")
   {
      Print("SocialForexBridge: BridgeToken is empty.");
      return false;
   }

   string body = BuildPayload();
   uchar data[];
   uchar result[];
   string result_headers;
   string headers = "Content-Type: application/json\r\n";

   StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);
   ResetLastError();

   int status = WebRequest(
      "POST",
      BridgeEndpoint,
      headers,
      10000,
      data,
      result,
      result_headers
   );

   if(status == -1)
   {
      Print("SocialForexBridge: WebRequest failed. Error=", GetLastError(),
            ". Add the Social Forex URL in MT5 Options > Expert Advisors.");
      return false;
   }

   string response = CharArrayToString(result, 0, -1, CP_UTF8);
   Print("SocialForexBridge: status=", status, " response=", response);
   return status >= 200 && status < 300;
}

//+------------------------------------------------------------------+
//| Minimal JSON helpers (server payloads are flat, no nesting)       |
//+------------------------------------------------------------------+
string JsonExtractString(string json, string key, bool &isNull)
{
   isNull = false;
   string pattern = "\"" + key + "\":";
   int pos = StringFind(json, pattern);
   if(pos < 0)
   {
      isNull = true;
      return "";
   }
   int valueStart = pos + StringLen(pattern);
   if(StringSubstr(json, valueStart, 4) == "null")
   {
      isNull = true;
      return "";
   }
   if(StringGetCharacter(json, valueStart) != '"')
   {
      isNull = true;
      return "";
   }
   valueStart++;
   int i = valueStart;
   int len = StringLen(json);
   while(i < len)
   {
      ushort c = StringGetCharacter(json, i);
      if(c == '\\')
      {
         i += 2;
         continue;
      }
      if(c == '"')
         break;
      i++;
   }
   return StringSubstr(json, valueStart, i - valueStart);
}

double JsonExtractNumber(string json, string key, bool &isNull)
{
   isNull = false;
   string pattern = "\"" + key + "\":";
   int pos = StringFind(json, pattern);
   if(pos < 0)
   {
      isNull = true;
      return 0.0;
   }
   int valueStart = pos + StringLen(pattern);
   if(StringSubstr(json, valueStart, 4) == "null")
   {
      isNull = true;
      return 0.0;
   }
   int i = valueStart;
   int len = StringLen(json);
   while(i < len)
   {
      ushort c = StringGetCharacter(json, i);
      if(c == ',' || c == '}' || c == ']')
         break;
      i++;
   }
   return StringToDouble(StringSubstr(json, valueStart, i - valueStart));
}

// Splits the content of a top-level JSON array of objects into individual "{...}" strings.
int SplitJsonObjects(string arrayContent, string &objects[])
{
   int depth = 0;
   int start = -1;
   int count = 0;
   ArrayResize(objects, 0);
   int len = StringLen(arrayContent);
   for(int i = 0; i < len; i++)
   {
      ushort c = StringGetCharacter(arrayContent, i);
      if(c == '{')
      {
         if(depth == 0)
            start = i;
         depth++;
      }
      else if(c == '}')
      {
         depth--;
         if(depth == 0 && start >= 0)
         {
            count++;
            ArrayResize(objects, count);
            objects[count - 1] = StringSubstr(arrayContent, start, i - start + 1);
            start = -1;
         }
      }
   }
   return count;
}

// Returns the raw content between the brackets of "commands":[ ... ] in the response body.
string ExtractCommandsArray(string body)
{
   string key = "\"commands\":[";
   int pos = StringFind(body, key);
   if(pos < 0)
      return "";
   int arrStart = pos + StringLen(key) - 1; // index of '['
   int contentStart = arrStart + 1;
   int depth = 0;
   int len = StringLen(body);
   int i = arrStart;
   for(; i < len; i++)
   {
      ushort c = StringGetCharacter(body, i);
      if(c == '[')
         depth++;
      else if(c == ']')
      {
         depth--;
         if(depth == 0)
            break;
      }
   }
   if(i >= len)
      return "";
   return StringSubstr(body, contentStart, i - contentStart);
}

//+------------------------------------------------------------------+
//| Command execution                                                 |
//+------------------------------------------------------------------+
bool ClosePositionByTicket(ulong ticket, string &errMsg, double closeVolume = 0)
{
   for(int attempt = 1; attempt <= RetryAttempts; attempt++)
   {
      if(!PositionSelectByTicket(ticket))
      {
         errMsg = "position not found";
         return false;
      }
      string symbol    = PositionGetString(POSITION_SYMBOL);
      double volume    = PositionGetDouble(POSITION_VOLUME);
      double reqVolume = (closeVolume > 0 && closeVolume < volume) ? closeVolume : volume;
      long   posType   = PositionGetInteger(POSITION_TYPE);
      bool   isBuy     = (posType == POSITION_TYPE_BUY);
      double price     = isBuy ? SymbolInfoDouble(symbol, SYMBOL_BID) : SymbolInfoDouble(symbol, SYMBOL_ASK);

      MqlTradeRequest req = {};
      MqlTradeResult  res = {};
      req.action    = TRADE_ACTION_DEAL;
      req.position  = ticket;
      req.symbol    = symbol;
      req.volume    = reqVolume;
      req.type      = isBuy ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
      req.price     = price;
      req.deviation = SlippagePoints;
      req.magic     = MagicNumber;
      req.comment   = reqVolume < volume ? "SF:CmdPartialClose" : "SF:CmdClose";

      if(OrderSend(req, res) && (res.retcode == TRADE_RETCODE_DONE || res.retcode == TRADE_RETCODE_DONE_PARTIAL))
      {
         Print("SocialForexBridge: Closed ticket=", ticket, " volume=", reqVolume, " attempt=", attempt);
         return true;
      }

      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: ClosePosition failed ticket=", ticket, " ", errMsg, " attempt=", attempt);

      if(attempt < RetryAttempts && IsRetryableRetcode(res.retcode))
         Sleep(RetryDelayMs);
      else
         return false;
   }
   return false;
}

bool ModifyPositionByTicket(ulong ticket, double sl, double tp, string &errMsg)
{
   for(int attempt = 1; attempt <= RetryAttempts; attempt++)
   {
      if(!PositionSelectByTicket(ticket))
      {
         errMsg = "position not found";
         return false;
      }
      string symbol = PositionGetString(POSITION_SYMBOL);
      int digits    = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      double safeSL = sl > 0 ? NormalizeDouble(sl, digits) : 0;
      double safeTP = tp > 0 ? NormalizeDouble(tp, digits) : 0;

      MqlTradeRequest req = {};
      MqlTradeResult  res = {};
      req.action   = TRADE_ACTION_SLTP;
      req.position = ticket;
      req.symbol   = symbol;
      req.sl       = safeSL;
      req.tp       = safeTP;

      if(OrderSend(req, res) && (res.retcode == TRADE_RETCODE_DONE || res.retcode == TRADE_RETCODE_DONE_PARTIAL))
      {
         Print("SocialForexBridge: Modified ticket=", ticket, " SL=", safeSL, " TP=", safeTP, " attempt=", attempt);
         return true;
      }

      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: ModifyPosition failed ticket=", ticket, " ", errMsg, " attempt=", attempt);

      if(attempt < RetryAttempts && IsRetryableRetcode(res.retcode))
         Sleep(RetryDelayMs);
      else
         return false;
   }
   return false;
}

bool ModifyTrailingStopByTicket(ulong ticket, double distancePips, string &errMsg)
{
   if(!PositionSelectByTicket(ticket))
   {
      errMsg = "position not found";
      return false;
   }
   string symbol       = PositionGetString(POSITION_SYMBOL);
   long   posType      = PositionGetInteger(POSITION_TYPE);
   bool   isBuy        = (posType == POSITION_TYPE_BUY);
   double currentSL     = PositionGetDouble(POSITION_SL);
   double currentTP     = PositionGetDouble(POSITION_TP);
   double pipSize       = GetPipSize(symbol);
   double distance      = distancePips * pipSize;
   double price         = isBuy ? SymbolInfoDouble(symbol, SYMBOL_BID) : SymbolInfoDouble(symbol, SYMBOL_ASK);
   double candidateSL    = isBuy ? price - distance : price + distance;

   bool shouldUpdate = isBuy
      ? (currentSL <= 0 || candidateSL > currentSL + pipSize * 0.5)
      : (currentSL <= 0 || candidateSL < currentSL - pipSize * 0.5);

   if(!shouldUpdate)
   {
      // Price has already retraced since the trail was queued; leaving the SL
      // untouched is safer than applying a stale/worse value.
      return true;
   }

   return ModifyPositionByTicket(ticket, candidateSL, currentTP, errMsg);
}

bool ModifyOrderByTicket(ulong ticket, double sl, double tp, string &errMsg)
{
   for(int attempt = 1; attempt <= RetryAttempts; attempt++)
   {
      if(!OrderSelect(ticket))
      {
         errMsg = "order not found";
         return false;
      }
      string symbol       = OrderGetString(ORDER_SYMBOL);
      double price        = OrderGetDouble(ORDER_PRICE_OPEN);
      long   typeTime      = OrderGetInteger(ORDER_TYPE_TIME);
      datetime expiration = (datetime)OrderGetInteger(ORDER_TIME_EXPIRATION);
      int digits          = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      double safeSL       = sl > 0 ? NormalizeDouble(sl, digits) : 0;
      double safeTP       = tp > 0 ? NormalizeDouble(tp, digits) : 0;

      MqlTradeRequest req = {};
      MqlTradeResult  res = {};
      req.action     = TRADE_ACTION_MODIFY;
      req.order      = ticket;
      req.symbol     = symbol;
      req.price      = price;
      req.sl         = safeSL;
      req.tp         = safeTP;
      req.type_time  = (ENUM_ORDER_TYPE_TIME)typeTime;
      req.expiration = expiration;

      if(OrderSend(req, res) && res.retcode == TRADE_RETCODE_DONE)
      {
         Print("SocialForexBridge: Modified order ticket=", ticket, " SL=", safeSL, " TP=", safeTP, " attempt=", attempt);
         return true;
      }

      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: ModifyOrder failed ticket=", ticket, " ", errMsg, " attempt=", attempt);

      if(attempt < RetryAttempts && IsRetryableRetcode(res.retcode))
         Sleep(RetryDelayMs);
      else
         return false;
   }
   return false;
}

bool CancelOrderByTicket(ulong ticket, string &errMsg)
{
   for(int attempt = 1; attempt <= RetryAttempts; attempt++)
   {
      MqlTradeRequest req = {};
      MqlTradeResult  res = {};
      req.action = TRADE_ACTION_REMOVE;
      req.order  = ticket;

      if(OrderSend(req, res) && res.retcode == TRADE_RETCODE_DONE)
      {
         Print("SocialForexBridge: Cancelled order ticket=", ticket, " attempt=", attempt);
         return true;
      }

      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: CancelOrder failed ticket=", ticket, " ", errMsg, " attempt=", attempt);

      if(attempt < RetryAttempts && IsRetryableRetcode(res.retcode))
         Sleep(RetryDelayMs);
      else
         return false;
   }
   return false;
}

bool PlaceOrderCmd(string symbol, string orderTypeStr, double volume, double price, double sl, double tp, string &errMsg)
{
   if(symbol == "" || volume <= 0)
   {
      errMsg = "invalid symbol/volume";
      return false;
   }
   string resolved = ResolveBrokerSymbol(symbol);
   if(resolved == "")
   {
      errMsg = "symbol not found: " + symbol;
      return false;
   }
   symbol = resolved; // e.g. "XAUUSD" -> "XAUUSDm" on Standard/cent accounts

   int digits    = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double safeSL = sl > 0 ? NormalizeDouble(sl, digits) : 0;
   double safeTP = tp > 0 ? NormalizeDouble(tp, digits) : 0;
   bool isMarket = (orderTypeStr == "BUY" || orderTypeStr == "SELL");

   if(!isMarket && orderTypeStr != "BUY_LIMIT" && orderTypeStr != "SELL_LIMIT" &&
      orderTypeStr != "BUY_STOP" && orderTypeStr != "SELL_STOP")
   {
      errMsg = "unknown order type: " + orderTypeStr;
      return false;
   }
   if(!isMarket && price <= 0)
   {
      errMsg = "price required";
      return false;
   }

   for(int attempt = 1; attempt <= RetryAttempts; attempt++)
   {
      MqlTradeRequest req = {};
      MqlTradeResult  res = {};
      req.symbol    = symbol;
      req.volume    = volume;
      req.sl        = safeSL;
      req.tp        = safeTP;
      req.deviation = SlippagePoints;
      req.magic     = MagicNumber;
      req.comment   = "SF:CmdOpen";

      if(orderTypeStr == "BUY")
      {
         req.action = TRADE_ACTION_DEAL;
         req.type   = ORDER_TYPE_BUY;
         req.price  = SymbolInfoDouble(symbol, SYMBOL_ASK);
      }
      else if(orderTypeStr == "SELL")
      {
         req.action = TRADE_ACTION_DEAL;
         req.type   = ORDER_TYPE_SELL;
         req.price  = SymbolInfoDouble(symbol, SYMBOL_BID);
      }
      else
      {
         req.action    = TRADE_ACTION_PENDING;
         req.price     = NormalizeDouble(price, digits);
         req.type_time = ORDER_TIME_GTC;
         if(orderTypeStr == "BUY_LIMIT")
            req.type = ORDER_TYPE_BUY_LIMIT;
         else if(orderTypeStr == "SELL_LIMIT")
            req.type = ORDER_TYPE_SELL_LIMIT;
         else if(orderTypeStr == "BUY_STOP")
            req.type = ORDER_TYPE_BUY_STOP;
         else
            req.type = ORDER_TYPE_SELL_STOP;
      }

      if(OrderSend(req, res) && (res.retcode == TRADE_RETCODE_DONE || res.retcode == TRADE_RETCODE_PLACED || res.retcode == TRADE_RETCODE_DONE_PARTIAL))
      {
         Print("SocialForexBridge: Placed ", orderTypeStr, " ", symbol, " vol=", volume, " ticket=", res.order, " attempt=", attempt);
         return true;
      }

      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: PlaceOrder failed symbol=", symbol, " type=", orderTypeStr, " ", errMsg, " attempt=", attempt);

      if(attempt < RetryAttempts && IsRetryableRetcode(res.retcode))
         Sleep(RetryDelayMs);
      else
         return false;
   }
   return false;
}

bool CloseAllPositionsAndOrders(string &errMsg)
{
   bool allOk = true;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      string partErr = "";
      if(!ClosePositionByTicket(ticket, partErr))
      {
         allOk = false;
         errMsg += partErr + "; ";
      }
   }
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0)
         continue;
      if(!OrderSelect(ticket))
         continue;
      long type = OrderGetInteger(ORDER_TYPE);
      if(type == ORDER_TYPE_BUY || type == ORDER_TYPE_SELL)
         continue;
      string partErr = "";
      if(!CancelOrderByTicket(ticket, partErr))
      {
         allOk = false;
         errMsg += partErr + "; ";
      }
   }
   return allOk;
}

void AckCommand(string id, bool success, string errorMsg)
{
   if(BridgeToken == "" || id == "")
      return;

   string url = CommandsEndpoint + "/" + id + "/ack";
   string body = "{\"success\":" + (success ? "true" : "false");
   if(!success && errorMsg != "")
      body += ",\"errorMsg\":" + JsonString(errorMsg);
   body += "}";

   uchar data[];
   uchar result[];
   string result_headers;
   string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + BridgeToken + "\r\n";

   StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);
   ResetLastError();
   int status = WebRequest("POST", url, headers, 10000, data, result, result_headers);
   if(status == -1)
      Print("SocialForexBridge: ack WebRequest failed. Error=", GetLastError());
}

void FetchAndExecuteCommands()
{
   if(BridgeToken == "")
      return;

   uchar data[];
   uchar result[];
   string result_headers;
   string headers = "Authorization: Bearer " + BridgeToken + "\r\n";

   ResetLastError();
   int status = WebRequest("GET", CommandsEndpoint, headers, 10000, data, result, result_headers);
   if(status == -1)
   {
      Print("SocialForexBridge: commands WebRequest failed. Error=", GetLastError());
      return;
   }
   if(status < 200 || status >= 300)
      return;

   string body = CharArrayToString(result, 0, -1, CP_UTF8);
   string arrayContent = ExtractCommandsArray(body);
   if(arrayContent == "")
      return;

   string objects[];
   int count = SplitJsonObjects(arrayContent, objects);

   for(int i = 0; i < count; i++)
   {
      string obj = objects[i];
      bool tmpNull;
      string id = JsonExtractString(obj, "id", tmpNull);
      if(id == "")
         continue;
      string type = JsonExtractString(obj, "type", tmpNull);
      string ticketStr = JsonExtractString(obj, "ticket", tmpNull);
      bool slNull, tpNull, volNull, priceNull, trailNull;
      double sl = JsonExtractNumber(obj, "stopLoss", slNull);
      double tp = JsonExtractNumber(obj, "takeProfit", tpNull);
      string orderSymbol = JsonExtractString(obj, "symbol", tmpNull);
      double orderVolume = JsonExtractNumber(obj, "volume", volNull);
      double orderPrice = JsonExtractNumber(obj, "price", priceNull);
      double trailDistancePips = JsonExtractNumber(obj, "trailDistancePips", trailNull);
      if(slNull) sl = 0.0;
      if(tpNull) tp = 0.0;
      if(volNull) orderVolume = 0.0;
      if(priceNull) orderPrice = 0.0;
      if(trailNull) trailDistancePips = 0.0;

      bool success = false;
      string errorMsg = "";
      ulong ticket = (ulong)StringToInteger(ticketStr);

      if(type == "CLOSE_POSITION")
      {
         if(ticket == 0)
            errorMsg = "invalid ticket";
         else
            success = ClosePositionByTicket(ticket, errorMsg);
      }
      else if(type == "PARTIAL_CLOSE")
      {
         if(ticket == 0)
            errorMsg = "invalid ticket";
         else if(orderVolume <= 0)
            errorMsg = "invalid volume";
         else
            success = ClosePositionByTicket(ticket, errorMsg, orderVolume);
      }
      else if(type == "MODIFY_POSITION")
      {
         if(ticket == 0)
            errorMsg = "invalid ticket";
         else
            success = ModifyPositionByTicket(ticket, sl, tp, errorMsg);
      }
      else if(type == "TRAIL_UPDATE")
      {
         if(ticket == 0)
            errorMsg = "invalid ticket";
         else if(trailDistancePips <= 0)
            errorMsg = "invalid trail distance";
         else
            success = ModifyTrailingStopByTicket(ticket, trailDistancePips, errorMsg);
      }
      else if(type == "CANCEL_ORDER")
      {
         if(ticket == 0)
            errorMsg = "invalid ticket";
         else
            success = CancelOrderByTicket(ticket, errorMsg);
      }
      else if(type == "MODIFY_ORDER")
      {
         if(ticket == 0)
            errorMsg = "invalid ticket";
         else
            success = ModifyOrderByTicket(ticket, sl, tp, errorMsg);
      }
      else if(type == "CLOSE_ALL")
      {
         success = CloseAllPositionsAndOrders(errorMsg);
      }
      else if(StringFind(type, "PLACE_") == 0)
      {
         string orderTypeStr = StringSubstr(type, StringLen("PLACE_"));
         success = PlaceOrderCmd(orderSymbol, orderTypeStr, orderVolume, orderPrice, sl, tp, errorMsg);
      }
      else
      {
         errorMsg = "unknown command type: " + type;
      }

      AckCommand(id, success, errorMsg);
   }
}

int OnInit()
{
   EventSetTimer(1);
   Print("SocialForexBridge initialized. Syncing account data and executing dashboard commands.");
   SendSnapshot();
   FetchAndExecuteCommands();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   datetime now = TimeCurrent();
   if(now - last_send_at >= MathMax(1, HeartbeatSeconds))
   {
      last_send_at = now;
      if(ShouldPushSnapshot())
         SendSnapshot();
   }
   if(now - last_poll_at >= MathMax(1, CommandPollSeconds))
   {
      last_poll_at = now;
      if(ShouldCheckCommands())
         FetchAndExecuteCommands();
   }
}

void OnTick()
{
   // Reacts to price movement on the chart's own symbol immediately instead of
   // waiting for the next timer tick - this is exactly when a queued close/modify
   // is most at risk of executing against a stale price, and when the dashboard's
   // displayed price/profit is most likely to be visibly out of date.
   if(ShouldCheckCommands())
      FetchAndExecuteCommands();
   if(ShouldPushSnapshot())
      SendSnapshot();
}
