//+------------------------------------------------------------------+
//| SocialForexAiTrader.mq5                                          |
//| Push chart data for AI analysis and execute AI-confirmed signals |
//| v2: TradingView mode — server fetches TV data, uses DeepSeek-R1  |
//+------------------------------------------------------------------+
#property copyright "Social Forex"
#property version   "2.01"
#property strict

input string          ApiBase          = "https://www.toolforex.xyz";
input string          BridgeToken      = "";           // MT5 bridge connection token
input string          AnalyzeSymbol1   = "XAUUSD";    // symbols to analyze (leave blank to skip)
input string          AnalyzeSymbol2   = "";
input string          AnalyzeSymbol3   = "";
input bool            UseTvMode        = true;         // true=TV+DeepSeek-R1 (recommended), false=MT5 OHLCV push
input ENUM_TIMEFRAMES Timeframe        = PERIOD_H1;    // only used when UseTvMode=false
input int             AnalysisBars     = 20;           // only used when UseTvMode=false
input int             PushIntervalSec  = 300;          // push/request analysis every 5 min
input int             PollIntervalSec  = 30;           // poll confirmed signals every 30s
input bool            AutoExecute      = false;        // place orders automatically
input int             MagicNumber      = 20260622;
input int             MaxSlippage      = 30;

datetime last_push_at  = 0;
datetime last_poll_at  = 0;
string   executed_ids  = "";  // comma-separated proposalIds already executed this session

//+------------------------------------------------------------------+
//| Broker symbol resolution                                          |
//| The server sends the bare instrument name ("XAUUSD"). Standard/    |
//| cent accounts append a suffix to every symbol (XAUUSDm, EURUSD.r,  |
//| GBPUSDc), so map it onto whatever this terminal actually calls it. |
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

//+------------------------------------------------------------------+
//| JSON helpers                                                     |
//+------------------------------------------------------------------+
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

string FindJsonValue(string json, string key)
{
   string search = "\"" + key + "\":";
   int pos = StringFind(json, search);
   if(pos == -1) return "";
   pos += StringLen(search);

   while(pos < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, pos);
      if(ch != ' ' && ch != '\t')
         break;
      pos++;
   }

   ushort first = StringGetCharacter(json, pos);

   if(first == '"')
   {
      pos++;
      int start = pos;
      while(pos < StringLen(json))
      {
         ushort ch = StringGetCharacter(json, pos);
         if(ch == '"') break;
         if(ch == '\\') pos++;
         pos++;
      }
      return StringSubstr(json, start, pos - start);
   }

   // Handle arrays [...] and objects {...} by counting brackets
   if(first == '[' || first == '{')
   {
      ushort open  = first;
      ushort close = (open == '[') ? ']' : '}';
      int depth = 0;
      int start = pos;
      bool inStr = false;
      while(pos < StringLen(json))
      {
         ushort ch = StringGetCharacter(json, pos);
         if(inStr)
         {
            if(ch == '\\') { pos++; }
            else if(ch == '"') inStr = false;
         }
         else
         {
            if(ch == '"') inStr = true;
            else if(ch == open)  depth++;
            else if(ch == close)
            {
               depth--;
               if(depth == 0)
                  return StringSubstr(json, start, pos - start + 1);
            }
         }
         pos++;
      }
      return "";
   }

   // Scalar value (number, bool, null)
   int start = pos;
   while(pos < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, pos);
      if(ch == ',' || ch == '}' || ch == ']')
         break;
      pos++;
   }
   return StringSubstr(json, start, pos - start);
}

//+------------------------------------------------------------------+
//| Convert ENUM_TIMEFRAMES to API string                            |
//+------------------------------------------------------------------+
string TimeframeToString(ENUM_TIMEFRAMES tf)
{
   switch(tf)
   {
      case PERIOD_M1:  return "M1";
      case PERIOD_M5:  return "M5";
      case PERIOD_M15: return "M15";
      case PERIOD_M30: return "M30";
      case PERIOD_H1:  return "H1";
      case PERIOD_H4:  return "H4";
      case PERIOD_D1:  return "D1";
      case PERIOD_W1:  return "W1";
      case PERIOD_MN1: return "MN1";
      default:         return "H1";
   }
}

//+------------------------------------------------------------------+
//| HTTP request helper                                              |
//+------------------------------------------------------------------+
int DoRequest(string method, string url, string body, string &out_response)
{
   string headers = "Authorization: Bearer " + BridgeToken + "\r\nContent-Type: application/json\r\n";
   uchar  data[];
   uchar  result[];
   string result_headers;

   if(body != "")
      StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);

   int status = WebRequest(
      method,
      url,
      headers,
      10000,
      data,
      result,
      result_headers
   );

   if(status == -1)
   {
      Print("SocialForexAiTrader: WebRequest failed. Error=", GetLastError(),
            ". Add the URL in MT5 Options > Expert Advisors.");
      out_response = "";
      return -1;
   }

   out_response = CharArrayToString(result, 0, -1, CP_UTF8);
   return status;
}

//+------------------------------------------------------------------+
//| TV Mode: send symbol + current price, server pulls TV data      |
//| and runs DeepSeek-R1 analysis                                   |
//+------------------------------------------------------------------+
void PushTvAnalysis(string symbol)
{
   if(BridgeToken == "")
   {
      Print("SocialForexAiTrader: BridgeToken is empty.");
      return;
   }

   int    digits       = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double currentPrice = SymbolInfoDouble(symbol, SYMBOL_BID);

   string payload = "{";
   payload += "\"symbol\":"       + JsonString(symbol)                   + ",";
   payload += "\"currentPrice\":" + DoubleToString(currentPrice, digits);
   payload += "}";

   string response;
   int status = DoRequest("POST", ApiBase + "/api/mt5/tv-analysis", payload, response);
   if(status >= 200 && status < 300)
   {
      string proposalId = FindJsonValue(response, "proposalId");
      string direction  = FindJsonValue(response, "direction");
      string tvSummary  = FindJsonValue(response, "tvSummary");
      Print("SocialForexAiTrader [TV] ", symbol, " -> proposalId=", proposalId,
            " direction=", direction, " summary=", tvSummary);
   }
   else
   {
      Print("SocialForexAiTrader [TV] ", symbol, " push failed status=", status, " body=", response);
   }
}

//+------------------------------------------------------------------+
//| MT5 Mode: push OHLCV + indicators to AI analysis endpoint       |
//+------------------------------------------------------------------+
void PushChartAnalysis(string symbol)
{
   if(BridgeToken == "")
   {
      Print("SocialForexAiTrader: BridgeToken is empty. Cannot push chart analysis.");
      return;
   }

   // --- OHLCV bars ---
   MqlRates rates[];
   int copied = CopyRates(symbol, Timeframe, 0, AnalysisBars, rates);
   if(copied <= 0)
   {
      Print("SocialForexAiTrader: CopyRates failed for ", symbol, " err=", GetLastError());
      return;
   }

   // --- Current price ---
   double currentPrice = SymbolInfoDouble(symbol, SYMBOL_BID);

   // --- Indicators ---
   double rsiValues[];
   double atrValues[];
   double ema20Values[];
   double ema50Values[];

   int hRsi  = iRSI(symbol, Timeframe, 14, PRICE_CLOSE);
   int hAtr  = iATR(symbol, Timeframe, 14);
   int hEma20 = iMA(symbol, Timeframe, 20, 0, MODE_EMA, PRICE_CLOSE);
   int hEma50 = iMA(symbol, Timeframe, 50, 0, MODE_EMA, PRICE_CLOSE);

   if(hRsi == INVALID_HANDLE || hAtr == INVALID_HANDLE ||
      hEma20 == INVALID_HANDLE || hEma50 == INVALID_HANDLE)
   {
      Print("SocialForexAiTrader: Failed to create indicator handle for ", symbol);
      return;
   }

   if(CopyBuffer(hRsi,   0, 0, 1, rsiValues)   <= 0 ||
      CopyBuffer(hAtr,   0, 0, 1, atrValues)   <= 0 ||
      CopyBuffer(hEma20, 0, 0, 1, ema20Values) <= 0 ||
      CopyBuffer(hEma50, 0, 0, 1, ema50Values) <= 0)
   {
      Print("SocialForexAiTrader: CopyBuffer failed for indicator on ", symbol, " err=", GetLastError());
      IndicatorRelease(hRsi);
      IndicatorRelease(hAtr);
      IndicatorRelease(hEma20);
      IndicatorRelease(hEma50);
      return;
   }

   double rsi14 = rsiValues[0];
   double atr14 = atrValues[0];
   double ema20 = ema20Values[0];
   double ema50 = ema50Values[0];

   IndicatorRelease(hRsi);
   IndicatorRelease(hAtr);
   IndicatorRelease(hEma20);
   IndicatorRelease(hEma50);

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   // --- Build OHLCV JSON array (oldest first → newest last) ---
   string ohlcvArr = "[";
   for(int i = copied - 1; i >= 0; i--)
   {
      if(i < copied - 1) ohlcvArr += ",";
      ohlcvArr += "{";
      ohlcvArr += "\"time\":"  + IntegerToString((long)rates[i].time)         + ",";
      ohlcvArr += "\"open\":"  + DoubleToString(rates[i].open,  digits)       + ",";
      ohlcvArr += "\"high\":"  + DoubleToString(rates[i].high,  digits)       + ",";
      ohlcvArr += "\"low\":"   + DoubleToString(rates[i].low,   digits)       + ",";
      ohlcvArr += "\"close\":" + DoubleToString(rates[i].close, digits);
      ohlcvArr += "}";
   }
   ohlcvArr += "]";

   // --- Build full JSON payload ---
   string payload = "{";
   payload += "\"symbol\":"       + JsonString(symbol)                              + ",";
   payload += "\"timeframe\":"    + JsonString(TimeframeToString(Timeframe))        + ",";
   payload += "\"currentPrice\":" + DoubleToString(currentPrice, digits)            + ",";
   payload += "\"ohlcv\":"        + ohlcvArr                                        + ",";
   payload += "\"indicators\":{";
   payload += "\"rsi14\":"  + DoubleToString(rsi14, 2) + ",";
   payload += "\"ema20\":"  + DoubleToString(ema20, digits) + ",";
   payload += "\"ema50\":"  + DoubleToString(ema50, digits) + ",";
   payload += "\"atr14\":"  + DoubleToString(atr14, digits);
   payload += "}}";

   string response;
   int status = DoRequest("POST", ApiBase + "/api/mt5/chart-analysis", payload, response);
   Print("SocialForexAiTrader: pushed ", symbol, " chart. Status=", status);
}

//+------------------------------------------------------------------+
//| Execute a single trade from an AI signal                        |
//+------------------------------------------------------------------+
bool ExecuteAiTrade(string symbol, string direction, double entry,
                    double sl, double tp, string proposalId, double requestedLot)
{
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
   {
      Print("SocialForexAiTrader: Algo Trading is disabled. Enable it on the MT5 toolbar.");
      return false;
   }

   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      Print("SocialForexAiTrader: EA trading not allowed. Right-click chart -> Expert Advisors -> Allow Algo Trading.");
      return false;
   }

   if(!AccountInfoInteger(ACCOUNT_TRADE_ALLOWED))
   {
      Print("SocialForexAiTrader: Account trading is disabled by the broker.");
      return false;
   }

   string resolvedSymbol = ResolveBrokerSymbol(symbol);
   if(resolvedSymbol == "")
   {
      Print("SocialForexAiTrader: Cannot select symbol ", symbol);
      return false;
   }
   symbol = resolvedSymbol; // e.g. "XAUUSD" -> "XAUUSDm" on Standard/cent accounts

   if(SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE) != SYMBOL_TRADE_MODE_FULL)
   {
      Print("SocialForexAiTrader: Market closed or restricted for ", symbol, ". Retry next poll.");
      return false;
   }

   bool isBuy = (direction == "LONG");

   int    digits  = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double ptSz    = SymbolInfoDouble(symbol, SYMBOL_POINT);
   long   stopsLv = SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = stopsLv * ptSz;

   double marketPrice = isBuy ? SymbolInfoDouble(symbol, SYMBOL_ASK)
                               : SymbolInfoDouble(symbol, SYMBOL_BID);

   // Use AI entry if it's meaningfully better than market; fall back to market order
   double limitPrice  = NormalizeDouble(entry, digits);
   bool   useLimit    = (entry > 0) &&
                        (isBuy  ? (limitPrice < marketPrice - minDist)
                                : (limitPrice > marketPrice + minDist));

   ENUM_ORDER_TYPE  orderType;
   ENUM_TRADE_REQUEST_ACTIONS action;
   double price;

   if(useLimit)
   {
      orderType = isBuy ? ORDER_TYPE_BUY_LIMIT : ORDER_TYPE_SELL_LIMIT;
      action    = TRADE_ACTION_PENDING;
      price     = limitPrice;
      Print("SocialForexAiTrader: placing limit order at AI entry=", limitPrice,
            " (market=", marketPrice, ")");
   }
   else
   {
      orderType = isBuy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
      action    = TRADE_ACTION_DEAL;
      price     = marketPrice;
      Print("SocialForexAiTrader: AI entry=", entry,
            " too close to market=", marketPrice, ", using market order");
   }

   bool   slOk   = sl > 0 && (isBuy ? (price - sl >= minDist) : (sl - price >= minDist));
   bool   tpOk   = tp > 0 && (isBuy ? (tp - price >= minDist) : (price - tp >= minDist));
   double safeSL = slOk ? NormalizeDouble(sl, digits) : 0;
   double safeTP = tpOk ? NormalizeDouble(tp, digits) : 0;
   if(sl > 0 && !slOk) Print("SocialForexAiTrader: SL too close for ", symbol, " - skipped");
   if(tp > 0 && !tpOk) Print("SocialForexAiTrader: TP too close for ", symbol, " - skipped");

   // Use requested lot size; clamp to broker min/max and normalize to step
   double lotMin  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double lotMax  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if(lotMin  <= 0) lotMin  = 0.01;
   if(lotMax  <= 0) lotMax  = 100.0;
   if(lotStep <= 0) lotStep = 0.01;

   double lot = requestedLot > 0 ? requestedLot : lotMin;
   lot = MathMax(lotMin, MathMin(lotMax, lot));
   lot = MathRound(lot / lotStep) * lotStep;
   lot = NormalizeDouble(lot, 2);

   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action      = action;
   request.symbol      = symbol;
   request.volume      = lot;
   request.type        = orderType;
   request.price       = price;
   request.sl          = safeSL;
   request.tp          = safeTP;
   request.deviation   = MaxSlippage;
   request.magic       = MagicNumber;
   request.comment     = "SFAI:" + proposalId;
   // Limit orders expire after 24 hours
   if(action == TRADE_ACTION_PENDING)
      request.expiration = TimeCurrent() + 24 * 3600;

   if(!OrderSend(request, result))
   {
      Print("SocialForexAiTrader: OrderSend failed err=", GetLastError(), " rc=", result.retcode);
      return false;
   }

   Print("SocialForexAiTrader: Opened ", symbol, " ", direction,
         " lot=", lot, " ticket=", result.order, " proposalId=", proposalId);

   // Notify API that this proposal was executed
   string execBody     = "{\"mt5Ticket\":" + IntegerToString((long)result.order) + "}";
   string execResponse;
   int    execStatus   = DoRequest(
      "POST",
      ApiBase + "/api/mt5/ai-signals/" + proposalId + "/executed",
      execBody,
      execResponse
   );
   Print("SocialForexAiTrader: execution callback status=", execStatus);

   return true;
}

//+------------------------------------------------------------------+
//| Poll AI signals and optionally auto-execute                     |
//+------------------------------------------------------------------+
void PollAndExecuteSignals()
{
   if(BridgeToken == "")
   {
      Print("SocialForexAiTrader: BridgeToken is empty. Cannot poll AI signals.");
      return;
   }

   string response;
   int status = DoRequest("GET", ApiBase + "/api/mt5/ai-signals", "", response);

   if(status == -1)
      return;

   if(status < 200 || status >= 300)
   {
      Print("SocialForexAiTrader: PollAndExecuteSignals HTTP ", status);
      return;
   }

   Print("SocialForexAiTrader: ai-signals response=", response);

   string signalsStr = FindJsonValue(response, "signals");
   if(signalsStr == "" || signalsStr == "[]") return;

   // Iterate through signal objects
   int pos = 0;
   while(pos < StringLen(signalsStr))
   {
      int objStart = StringFind(signalsStr, "{", pos);
      if(objStart == -1) break;

      // Find matching closing brace
      int depth  = 0;
      bool inStr = false;
      int objEnd = -1;
      int i = objStart;
      while(i < StringLen(signalsStr))
      {
         ushort ch = StringGetCharacter(signalsStr, i);
         if(inStr)
         {
            if(ch == '\\') { i++; }
            else if(ch == '"') inStr = false;
         }
         else
         {
            if(ch == '"')  inStr = true;
            else if(ch == '{') depth++;
            else if(ch == '}')
            {
               depth--;
               if(depth == 0) { objEnd = i; break; }
            }
         }
         i++;
      }
      if(objEnd == -1) break;

      string obj = StringSubstr(signalsStr, objStart, objEnd - objStart + 1);
      pos = objEnd + 1;

      string proposalId  = FindJsonValue(obj, "proposalId");
      string signalId    = FindJsonValue(obj, "signalId");
      string symbol      = FindJsonValue(obj, "symbol");
      string direction   = FindJsonValue(obj, "direction");   // "LONG" or "SHORT"
      double entry       = StringToDouble(FindJsonValue(obj, "entry"));
      double sl          = StringToDouble(FindJsonValue(obj, "stopLoss"));
      double tp          = StringToDouble(FindJsonValue(obj, "takeProfit"));
      string lotStr      = FindJsonValue(obj, "lotSize");
      double requestedLot = (lotStr != "" && lotStr != "null") ? StringToDouble(lotStr) : 0;

      if(proposalId == "" || symbol == "") continue;

      // Skip already-processed proposals
      if(StringFind(executed_ids, proposalId + ",") != -1) continue;

      if(AutoExecute)
      {
         bool ok = ExecuteAiTrade(symbol, direction, entry, sl, tp, proposalId, requestedLot);
         if(ok)
            executed_ids += proposalId + ",";
         else
            Print("SocialForexAiTrader: ExecuteAiTrade failed for proposalId=", proposalId);
      }
      else
      {
         Print("SocialForexAiTrader: confirmed signal pending for ", symbol,
               " (", direction, ") proposalId=", proposalId,
               ". Set AutoExecute=true to trade, or confirm on the web.");
         // Add to executed_ids to avoid repeated logging
         executed_ids += proposalId + ",";
      }
   }
}

//+------------------------------------------------------------------+
//| EA lifecycle                                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   EventSetTimer(1);  // 1-second tick for interval checks
   Print("SocialForexAiTrader v2: initialized. Mode=", (UseTvMode ? "TV+DeepSeek-R1" : "MT5-OHLCV"),
         " AutoExecute=", AutoExecute);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   datetime now = TimeCurrent();

   // Push analysis request (TV mode or MT5 OHLCV mode)
   if(now - last_push_at >= PushIntervalSec)
   {
      string symbols[3];
      symbols[0] = AnalyzeSymbol1;
      symbols[1] = AnalyzeSymbol2;
      symbols[2] = AnalyzeSymbol3;
      for(int s = 0; s < 3; s++)
      {
         if(symbols[s] != "")
         {
            // Accept a bare name ("XAUUSD") even on a suffixed Standard account.
            string sym = ResolveBrokerSymbol(symbols[s]);
            if(sym == "") sym = symbols[s];
            if(UseTvMode)
               PushTvAnalysis(sym);
            else
               PushChartAnalysis(sym);
         }
      }
      last_push_at = now;
   }

   // Poll confirmed signals
   if(now - last_poll_at >= PollIntervalSec)
   {
      PollAndExecuteSignals();
      last_poll_at = now;
   }
}

void OnTick() { /* intentionally empty — timer-driven */ }
