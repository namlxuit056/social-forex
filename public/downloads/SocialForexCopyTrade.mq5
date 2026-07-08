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

// Gold/crypto move in far bigger price increments per lot than FX pairs, so a single
// fixedLot picked for EURUSD is rarely a safe size for XAUUSD/BTCUSD. Falls back to
// fixedLot when no override is set for the symbol (matches broker suffixes like
// "XAUUSDm"/"BTCUSD.a" via prefix match).
double ResolveFixedLot(string symbol, double fixedLot, double xauusdLot, double btcusdLot)
{
   if(xauusdLot > 0 && StringFind(symbol, "XAUUSD") == 0) return xauusdLot;
   if(btcusdLot > 0 && StringFind(symbol, "BTCUSD") == 0) return btcusdLot;
   return fixedLot;
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

ulong FindPositionBySignalId(string signalId)
{
   string target = "SF:" + signalId;
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_COMMENT) == target)
         return ticket;
   }
   return 0;
}

ulong FindOrderBySignalId(string signalId)
{
   string target = "SF:" + signalId;
   int total = OrdersTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0) continue;
      if(!OrderSelect(ticket)) continue;
      if(OrderGetInteger(ORDER_MAGIC) != MagicNumber) continue;
      if(OrderGetString(ORDER_COMMENT) == target)
         return ticket;
   }
   return 0;
}

// Maps the raw MT5 order-type string reported by the provider's bridge (e.g. "BUY_LIMIT")
// to a pending ENUM_ORDER_TYPE. Returns -1 when the type is a market order (BUY/SELL) or
// unrecognized, so callers can fall back to a market fill.
int PendingOrderTypeFromString(string orderType)
{
   if(orderType == "BUY_LIMIT")  return ORDER_TYPE_BUY_LIMIT;
   if(orderType == "SELL_LIMIT") return ORDER_TYPE_SELL_LIMIT;
   if(orderType == "BUY_STOP")   return ORDER_TYPE_BUY_STOP;
   if(orderType == "SELL_STOP")  return ORDER_TYPE_SELL_STOP;
   return -1;
}

bool SyncPositionStops(ulong ticket, string symbol, double newSL, double newTP)
{
   if(!PositionSelectByTicket(ticket)) return false;
   double curSL  = PositionGetDouble(POSITION_SL);
   double curTP  = PositionGetDouble(POSITION_TP);
   double pt     = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(MathAbs(curSL - newSL) <= pt && MathAbs(curTP - newTP) <= pt) return true;

   bool   isBuy  = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
   double price  = 0;
   if(isBuy) price = SymbolInfoDouble(symbol, SYMBOL_BID);
   else      price = SymbolInfoDouble(symbol, SYMBOL_ASK);
   int    digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double ptD    = SymbolInfoDouble(symbol, SYMBOL_POINT);
   long   stops  = SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minD   = stops * ptD;
   bool   slOk   = isBuy ? (price - newSL >= minD) : (newSL - price >= minD);
   bool   tpOk   = isBuy ? (newTP - price >= minD) : (price - newTP >= minD);
   double safeSL = (newSL > 0 && slOk) ? NormalizeDouble(newSL, digits) : (newSL > 0 ? curSL : 0);
   double safeTP = (newTP > 0 && tpOk) ? NormalizeDouble(newTP, digits) : (newTP > 0 ? curTP : 0);

   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action   = TRADE_ACTION_SLTP;
   req.position = ticket;
   req.symbol   = symbol;
   req.sl       = safeSL;
   req.tp       = safeTP;
   if(!OrderSend(req, res))
   {
      Print("SocialForexCopyTrade: SyncStops failed ticket=", ticket, " err=", GetLastError(), " rc=", res.retcode);
      return false;
   }
   Print("SocialForexCopyTrade: SyncStops ticket=", ticket, " SL=", safeSL, " TP=", safeTP);
   return true;
}

bool SyncOrderStops(ulong ticket, string symbol, double newSL, double newTP)
{
   if(!OrderSelect(ticket)) return false;
   double curSL = OrderGetDouble(ORDER_SL);
   double curTP = OrderGetDouble(ORDER_TP);
   double pt    = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(MathAbs(curSL - newSL) <= pt && MathAbs(curTP - newTP) <= pt) return true;

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action   = TRADE_ACTION_MODIFY;
   req.order    = ticket;
   req.symbol   = symbol;
   req.price    = OrderGetDouble(ORDER_PRICE_OPEN);
   req.sl       = newSL > 0 ? NormalizeDouble(newSL, digits) : 0;
   req.tp       = newTP > 0 ? NormalizeDouble(newTP, digits) : 0;
   req.type     = (ENUM_ORDER_TYPE)OrderGetInteger(ORDER_TYPE);
   if(!OrderSend(req, res))
   {
      Print("SocialForexCopyTrade: SyncOrderStops failed ticket=", ticket, " err=", GetLastError(), " rc=", res.retcode);
      return false;
   }
   Print("SocialForexCopyTrade: SyncOrderStops ticket=", ticket, " SL=", req.sl, " TP=", req.tp);
   return true;
}

bool CancelOrder(ulong ticket)
{
   if(!OrderSelect(ticket)) return false;

   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action = TRADE_ACTION_REMOVE;
   req.order  = ticket;
   if(!OrderSend(req, res))
   {
      Print("SocialForexCopyTrade: CancelOrder failed ticket=", ticket, " err=", GetLastError(), " rc=", res.retcode);
      return false;
   }
   Print("SocialForexCopyTrade: Cancelled pending order ticket=", ticket);
   return true;
}

bool ClosePosition(ulong ticket, string symbol)
{
   if(!PositionSelectByTicket(ticket)) return false;
   double volume  = PositionGetDouble(POSITION_VOLUME);
   long   posType = PositionGetInteger(POSITION_TYPE);

   bool   isSell = (posType == POSITION_TYPE_BUY);
   double price  = 0;
   if(isSell) price = SymbolInfoDouble(symbol, SYMBOL_BID);
   else       price = SymbolInfoDouble(symbol, SYMBOL_ASK);

   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action    = TRADE_ACTION_DEAL;
   req.position  = ticket;
   req.symbol    = symbol;
   req.volume    = volume;
   if(isSell) req.type = ORDER_TYPE_SELL;
   else       req.type = ORDER_TYPE_BUY;
   req.price     = price;
   req.deviation = MaxSlippage;
   req.magic     = MagicNumber;
   req.comment   = "SF:Close";
   if(!OrderSend(req, res))
   {
      Print("SocialForexCopyTrade: ClosePosition failed ticket=", ticket, " err=", GetLastError(), " rc=", res.retcode);
      return false;
   }
   Print("SocialForexCopyTrade: Closed ticket=", ticket, " symbol=", symbol);
   return true;
}

// Shared pre-flight checks before sending any new trade/order request.
bool CanTrade(string symbol)
{
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
      Print("SocialForexCopyTrade: Retcode 10018 - Market closed/restricted. Retry next poll.");
      return false;
   }

   return true;
}

bool OpenMarketTrade(string symbol, string direction, double entry, double sl, double tp, double lot, string signalId)
{
   ENUM_ORDER_TYPE orderType = (direction == "LONG" || direction == "BUY") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;

   if(!CanTrade(symbol)) return false;

   double price = 0;
   if(orderType == ORDER_TYPE_BUY)
      price = SymbolInfoDouble(symbol, SYMBOL_ASK);
   else
      price = SymbolInfoDouble(symbol, SYMBOL_BID);

   // Clamp SL/TP to broker's minimum stop distance (prevents Retcode 10016)
   int    digits  = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double ptSz    = SymbolInfoDouble(symbol, SYMBOL_POINT);
   long   stopsLv = SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = stopsLv * ptSz;
   bool   isBuy   = (orderType == ORDER_TYPE_BUY);

   bool   slOk  = sl > 0 && (isBuy ? (price - sl >= minDist) : (sl - price >= minDist));
   bool   tpOk  = tp > 0 && (isBuy ? (tp - price >= minDist) : (price - tp >= minDist));
   double safeSL = slOk ? NormalizeDouble(sl, digits) : 0;
   double safeTP = tpOk ? NormalizeDouble(tp, digits) : 0;
   if(sl > 0 && !slOk) Print("SocialForexCopyTrade: SL too close - skipped");
   if(tp > 0 && !tpOk) Print("SocialForexCopyTrade: TP too close - skipped");

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
   request.comment   = "SF:" + signalId;

   if(!OrderSend(request, result))
   {
      Print("SocialForexCopyTrade: OrderSend failed err=", GetLastError(), " rc=", result.retcode);
      return false;
   }

   Print("SocialForexCopyTrade: Opened ", symbol, " ", direction, " lot=", lot, " ticket=", result.order);
   return true;
}

// Mirrors a still-pending order on the provider (BUY_LIMIT/SELL_LIMIT/BUY_STOP/SELL_STOP)
// as a pending order here too, at the provider's entry price, instead of firing a market
// order — so the follower only fills when price actually reaches that level, same as the
// provider will.
bool OpenPendingOrder(string symbol, int pendingType, double entry, double sl, double tp, double lot, string signalId)
{
   if(!CanTrade(symbol)) return false;

   if(entry <= 0)
   {
      Print("SocialForexCopyTrade: Missing entry price for pending order - skipped");
      return false;
   }

   int    digits  = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double ptSz    = SymbolInfoDouble(symbol, SYMBOL_POINT);
   long   stopsLv = SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = stopsLv * ptSz;
   bool   isBuy   = (pendingType == ORDER_TYPE_BUY_LIMIT || pendingType == ORDER_TYPE_BUY_STOP);

   bool   slOk  = sl > 0 && (isBuy ? (entry - sl >= minDist) : (sl - entry >= minDist));
   bool   tpOk  = tp > 0 && (isBuy ? (tp - entry >= minDist) : (entry - tp >= minDist));
   double safeSL = slOk ? NormalizeDouble(sl, digits) : 0;
   double safeTP = tpOk ? NormalizeDouble(tp, digits) : 0;
   if(sl > 0 && !slOk) Print("SocialForexCopyTrade: SL too close - skipped");
   if(tp > 0 && !tpOk) Print("SocialForexCopyTrade: TP too close - skipped");

   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action    = TRADE_ACTION_PENDING;
   request.symbol    = symbol;
   request.volume    = lot;
   request.type      = (ENUM_ORDER_TYPE)pendingType;
   request.price     = NormalizeDouble(entry, digits);
   request.sl        = safeSL;
   request.tp        = safeTP;
   request.type_time = ORDER_TIME_GTC;
   request.magic     = MagicNumber;
   request.comment   = "SF:" + signalId;

   if(!OrderSend(request, result))
   {
      Print("SocialForexCopyTrade: Pending OrderSend failed err=", GetLastError(), " rc=", result.retcode);
      return false;
   }

   Print("SocialForexCopyTrade: Placed pending ", symbol, " type=", pendingType, " entry=", entry, " lot=", lot, " ticket=", result.order);
   return true;
}

string RemoveFromList(string list, string id)
{
   string target = id + ",";
   int p    = StringFind(list, target);
   if(p == -1) return list;
   int tlen = StringLen(target);
   string lhs = StringSubstr(list, 0, p);
   string rhs = StringSubstr(list, p + tlen);
   return lhs + rhs;
}

void ProcessSignals(string response)
{
   string signalsStr = FindJsonValue(response, "signals");
   if(signalsStr == "" || signalsStr == "[]") return;

   string mode        = FindJsonValue(response, "mode");
   double fixedLot    = StringToDouble(FindJsonValue(response, "fixedLot"));
   double riskPercent = StringToDouble(FindJsonValue(response, "riskPercent"));
   double maxLots     = StringToDouble(FindJsonValue(response, "maxLots"));
   double xauusdLot   = StringToDouble(FindJsonValue(response, "xauusdLot"));
   double btcusdLot   = StringToDouble(FindJsonValue(response, "btcusdLot"));
   if(maxLots <= 0) maxLots = 10;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);

   int pos = 0;
   while(pos < StringLen(signalsStr))
   {
      int objStart = StringFind(signalsStr, "{", pos);
      if(objStart == -1) break;

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
      string orderType = FindJsonValue(signalObj, "orderType");
      double entry     = StringToDouble(FindJsonValue(signalObj, "entry"));
      double sl        = StringToDouble(FindJsonValue(signalObj, "stopLoss"));
      double tp        = StringToDouble(FindJsonValue(signalObj, "takeProfit"));
      string status    = FindJsonValue(signalObj, "status");

      if(signalId == "" || symbol == "") continue;

      bool  isClosed  = (status == "CLOSED_WIN" || status == "CLOSED_LOSS" || status == "CANCELLED");
      bool  isPending = (status == "PENDING");
      bool  isKnown   = (StringFind(known_signal_ids, signalId + ",") != -1);
      int   pendingType = PendingOrderTypeFromString(orderType);
      ulong ticket    = 0;
      double lot      = ResolveFixedLot(symbol, fixedLot, xauusdLot, btcusdLot);
      bool  opened    = false;

      if(isClosed && isKnown)
      {
         ticket = FindPositionBySignalId(signalId);
         if(ticket > 0)
            ClosePosition(ticket, symbol);
         else
         {
            ticket = FindOrderBySignalId(signalId);
            if(ticket > 0) CancelOrder(ticket);
         }
         known_signal_ids = RemoveFromList(known_signal_ids, signalId);
      }
      else if(!isClosed && isKnown)
      {
         ticket = FindPositionBySignalId(signalId);
         if(ticket > 0)
            SyncPositionStops(ticket, symbol, sl, tp);
         else
         {
            ticket = FindOrderBySignalId(signalId);
            if(ticket > 0) SyncOrderStops(ticket, symbol, sl, tp);
         }
      }
      else if(!isClosed && !isKnown && direction != "")
      {
         if(mode == "PERCENT") lot = CalcLotSize(symbol, balance, riskPercent, entry, sl);
         lot = MathMin(lot, maxLots);
         if(lot <= 0) lot = 0.01;

         if(isPending && pendingType != -1)
            opened = OpenPendingOrder(symbol, pendingType, entry, sl, tp, lot, signalId);
         else
            opened = OpenMarketTrade(symbol, direction, entry, sl, tp, lot, signalId);

         if(opened) known_signal_ids += signalId + ",";
      }
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

   // Rebuild known_signal_ids from existing EA-managed positions after restart
   int total = PositionsTotal();
   for(int idx = 0; idx < total; idx++)
   {
      ulong tk = PositionGetTicket(idx);
      if(tk == 0) continue;
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      string cmt = PositionGetString(POSITION_COMMENT);
      if(StringFind(cmt, "SF:") != 0) continue;
      string sigId = StringSubstr(cmt, 3);
      if(StringFind(known_signal_ids, sigId + ",") == -1)
         known_signal_ids += sigId + ",";
   }

   // Also rebuild from EA-managed pending orders (mirrored BUY_LIMIT/SELL_LIMIT/etc.)
   int totalOrders = OrdersTotal();
   for(int idx = 0; idx < totalOrders; idx++)
   {
      ulong tk = OrderGetTicket(idx);
      if(tk == 0) continue;
      if(!OrderSelect(tk)) continue;
      if(OrderGetInteger(ORDER_MAGIC) != MagicNumber) continue;
      string cmt = OrderGetString(ORDER_COMMENT);
      if(StringFind(cmt, "SF:") != 0) continue;
      string sigId = StringSubstr(cmt, 3);
      if(StringFind(known_signal_ids, sigId + ",") == -1)
         known_signal_ids += sigId + ",";
   }

   Print("SocialForexCopyTrade initialized. Token=", CopyToken, " tracking=", known_signal_ids);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}
