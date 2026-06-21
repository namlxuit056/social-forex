//+------------------------------------------------------------------+
//| SocialForexCopyTrade.mq5                                         |
//| Auto copy trades from signal providers on Social Forex.          |
//+------------------------------------------------------------------+
#property copyright "Social Forex"
#property version   "1.00"
#property strict

input string ApiEndpoint = "https://www.toolforex.xyz/api/copy-trade/signals";
input string CopyToken = "";
input int PollSeconds = 10;
input bool AllowAutoTrade = true;
input int MaxSlippage = 30;
input int MagicNumber = 20260621;

datetime last_poll_at = 0;
string known_signal_ids = "";

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

string FetchResponse()
{
   uchar result[];
   uchar data[];
   string result_headers;
   int status = WebRequest(
      "GET",
      ApiEndpoint + "?token=" + CopyToken,
      "Content-Type: application/json\r\n",
      10000,
      data,
      result,
      result_headers
   );

   if(status == -1)
   {
      Print("SocialForexCopyTrade: WebRequest failed. Error=", GetLastError(),
            ". Add the URL in MT5 Options > Expert Advisors.");
      return "";
   }

   if(status < 200 || status >= 300)
   {
      Print("SocialForexCopyTrade: HTTP ", status);
      return "";
   }

   return CharArrayToString(result, 0, -1, CP_UTF8);
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
      ushort open = first;
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
            else if(ch == open) depth++;
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

double CalcLotSize(string symbol, double balance, double riskPercent, double entry, double sl)
{
   if(riskPercent <= 0 || entry <= 0 || sl <= 0)
      return 0.01;

   double riskAmount = balance * riskPercent / 100.0;
   double slDistance = MathAbs(entry - sl);
   if(slDistance <= 0) return 0.01;

   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0 || tickSize <= 0) return 0.01;

   double lot      = riskAmount / (slDistance / tickSize * tickValue);
   double minLot   = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot   = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double stepLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   lot = MathFloor(lot / stepLot) * stepLot;
   lot = MathMax(lot, minLot);
   lot = MathMin(lot, maxLot);

   return NormalizeDouble(lot, 2);
}

bool HasOpenPosition(string symbol, long posType)
{
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetString(POSITION_SYMBOL) != symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetInteger(POSITION_TYPE) == posType)
         return true;
   }
   return false;
}

bool OpenTrade(string symbol, string direction, double entry, double sl, double tp, double lot)
{
   ENUM_ORDER_TYPE orderType = (direction == "LONG" || direction == "BUY") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   long posType = (orderType == ORDER_TYPE_BUY) ? POSITION_TYPE_BUY : POSITION_TYPE_SELL;

   if(!AllowAutoTrade)
   {
      Print("SocialForexCopyTrade: AllowAutoTrade = false. Set it to true in EA inputs.");
      return false;
   }

   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
   {
      Print("SocialForexCopyTrade: Retcode 10027 - Algo Trading is disabled. Click the green play button on the MT5 toolbar.");
      return false;
   }

   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      Print("SocialForexCopyTrade: Trading not allowed for this EA. Right-click chart -> Expert Advisors -> check Allow Algo Trading.");
      return false;
   }

   if(!AccountInfoInteger(ACCOUNT_TRADE_ALLOWED))
   {
      Print("SocialForexCopyTrade: Account trading is disabled by the broker.");
      return false;
   }

   if(!SymbolSelect(symbol, true))
   {
      Print("SocialForexCopyTrade: Cannot select symbol ", symbol);
      return false;
   }

   if(SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE) != SYMBOL_TRADE_MODE_FULL)
   {
      Print("SocialForexCopyTrade: Retcode 10018 - Market closed/restricted for ", symbol, ". TradeMode=", SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE), ". Will retry next poll.");
      return false;
   }
   if(HasOpenPosition(symbol, posType))
   {
      Print("SocialForexCopyTrade: Already have open position for ", symbol);
      return false;
   }

   double price;
   if(orderType == ORDER_TYPE_BUY)
      price = SymbolInfoDouble(symbol, SYMBOL_ASK);
   else
      price = SymbolInfoDouble(symbol, SYMBOL_BID);

   // Clamp SL/TP to broker's minimum stop distance (prevents Retcode 10016)
   int    digits  = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double minDist = SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL)
                    * SymbolInfoDouble(symbol, SYMBOL_POINT);
   bool   isBuy   = (orderType == ORDER_TYPE_BUY);

   double safeSL = 0;
   if(sl > 0)
   {
      bool slOk = isBuy ? (price - sl >= minDist) : (sl - price >= minDist);
      if(slOk) safeSL = NormalizeDouble(sl, digits);
      else Print("SocialForexCopyTrade: SL ", sl, " too close (minDist=", minDist, ") - skipped");
   }

   double safeTP = 0;
   if(tp > 0)
   {
      bool tpOk = isBuy ? (tp - price >= minDist) : (price - tp >= minDist);
      if(tpOk) safeTP = NormalizeDouble(tp, digits);
      else Print("SocialForexCopyTrade: TP ", tp, " too close (minDist=", minDist, ") - skipped");
   }

   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action    = TRADE_ACTION_DEAL;
   request.symbol    = symbol;
   request.volume    = lot;
   request.type      = orderType;
   request.price     = price;
   request.sl        = safeSL;
   request.tp        = safeTP;
   request.deviation = MaxSlippage;
   request.magic     = MagicNumber;
   request.comment   = "SocialForex Copy";

   if(!OrderSend(request, result))
   {
      Print("SocialForexCopyTrade: OrderSend failed. Error=", GetLastError(),
            " Retcode=", result.retcode);
      return false;
   }

   Print("SocialForexCopyTrade: Opened ", symbol, " ", direction,
         " lot=", lot, " ticket=", result.order);
   return true;
}

void ProcessSignals(string response)
{
   string signalsStr = FindJsonValue(response, "signals");
   if(signalsStr == "" || signalsStr == "[]") return;

   string mode          = FindJsonValue(response, "mode");
   double fixedLot      = StringToDouble(FindJsonValue(response, "fixedLot"));
   double riskPercent   = StringToDouble(FindJsonValue(response, "riskPercent"));
   double maxLots       = StringToDouble(FindJsonValue(response, "maxLots"));
   if(maxLots <= 0) maxLots = 10;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);

   int pos = 0;
   while(pos < StringLen(signalsStr))
   {
      int objStart = StringFind(signalsStr, "{", pos);
      if(objStart == -1) break;

      // Find matching closing brace (skip nested objects in string values)
      int depth = 0;
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
            if(ch == '"') inStr = true;
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

      string signalObj = StringSubstr(signalsStr, objStart, objEnd - objStart + 1);
      pos = objEnd + 1;

      string signalId  = FindJsonValue(signalObj, "id");
      string symbol    = FindJsonValue(signalObj, "symbol");
      string direction = FindJsonValue(signalObj, "direction");
      double entry     = StringToDouble(FindJsonValue(signalObj, "entry"));
      double sl        = StringToDouble(FindJsonValue(signalObj, "stopLoss"));
      double tp        = StringToDouble(FindJsonValue(signalObj, "takeProfit"));

      if(signalId == "" || symbol == "" || direction == "") continue;

      if(StringFind(known_signal_ids, signalId + ",") != -1)
         continue;

      double lot;
      if(mode == "PERCENT")
         lot = CalcLotSize(symbol, balance, riskPercent, entry, sl);
      else
         lot = fixedLot;

      lot = MathMin(lot, maxLots);
      if(lot <= 0) lot = 0.01;

      bool opened = OpenTrade(symbol, direction, entry, sl, tp, lot);
      if(opened)
         known_signal_ids += signalId + ",";
   }
}

void PollAndProcess()
{
   if(CopyToken == "") return;

   datetime now = TimeCurrent();
   if(now - last_poll_at < MathMax(5, PollSeconds))
      return;
   last_poll_at = now;

   string response = FetchResponse();
   if(response == "") return;

   Print("SocialForexCopyTrade: response=", response);
   ProcessSignals(response);
}

void OnTick()  { PollAndProcess(); }
void OnTimer() { PollAndProcess(); }

int OnInit()
{
   EventSetTimer(MathMax(5, PollSeconds));
   Print("SocialForexCopyTrade initialized. Token=", CopyToken);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}
