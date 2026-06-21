//+------------------------------------------------------------------+
//| SocialForexCopyTrade.mq5                                         |
//| Auto copy trades from signal providers on Social Forex.          |
//+------------------------------------------------------------------+
#property copyright "Social Forex"
#property version   "1.00"
#property strict

input string ApiEndpoint = "https://toolforex.xyz/api/copy-trade/signals";
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

string ReadResponse(int handle)
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
      Print("SocialForexCopyTrade: WebRequest failed. Error=", GetLastError());
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

   if(StringGetCharacter(json, pos) == '"')
   {
      pos++;
      int start = pos;
      while(pos < StringLen(json))
      {
         if(StringGetCharacter(json, pos) == '"')
            break;
         if(StringGetCharacter(json, pos) == '\\')
            pos++;
         pos++;
      }
      return StringSubstr(json, start, pos - start);
   }

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

double CalcLotSize(double balance, double riskPercent, double entry, double sl)
{
   if(riskPercent <= 0 || entry <= 0 || sl <= 0)
      return 0.01;

   double riskAmount = balance * riskPercent / 100.0;
   double slDistance = MathAbs(entry - sl);
   if(slDistance <= 0) return 0.01;

   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0 || tickSize <= 0) return 0.01;

   double lot = riskAmount / (slDistance / tickSize * tickValue);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   lot = MathFloor(lot / stepLot) * stepLot;
   lot = MathMax(lot, minLot);
   lot = MathMin(lot, maxLot);

   return NormalizeDouble(lot, 2);
}

bool HasOpenPosition(string symbol, long signalType)
{
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetString(POSITION_SYMBOL) != symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetInteger(POSITION_TYPE) == signalType)
         return true;
   }
   return false;
}

bool OpenTrade(string symbol, string direction, double entry, double sl, double tp, double lot)
{
   if(!AllowAutoTrade)
   {
      Print("SocialForexCopyTrade: AutoTrade is disabled.");
      return false;
   }

   if(!SymbolSelect(symbol, true))
   {
      Print("SocialForexCopyTrade: Cannot select symbol ", symbol);
      return false;
   }

   ENUM_ORDER_TYPE orderType;
   if(direction == "LONG" || direction == "BUY")
      orderType = ORDER_TYPE_BUY;
   else
      orderType = ORDER_TYPE_SELL;

   long posType = (orderType == ORDER_TYPE_BUY) ? POSITION_TYPE_BUY : POSITION_TYPE_SELL;
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

   MqlTradeRequest request = {};
   MqlTradeResult result = {};

   request.action = TRADE_ACTION_DEAL;
   request.symbol = symbol;
   request.volume = lot;
   request.type = orderType;
   request.price = price;
   request.sl = sl;
   request.tp = tp;
   request.deviation = MaxSlippage;
   request.magic = MagicNumber;
   request.comment = "SocialForex Copy";

   if(!OrderSend(request, result))
   {
      Print("SocialForexCopyTrade: OrderSend failed. Error=", GetLastError(),
            " Retcode=", result.retcode);
      return false;
   }

   Print("SocialForexCopyTrade: Opened ", symbol, " ", direction, " lot=", lot,
         " ticket=", result.order);
   return true;
}

void OnTick()
{
   if(CopyToken == "") return;

   datetime now = TimeCurrent();
   if(now - last_poll_at < MathMax(5, PollSeconds))
      return;
   last_poll_at = now;

   string response = ReadResponse(0);
   if(response == "") return;

   Print("SocialForexCopyTrade: response=", response);

   string signalsStr = FindJsonValue(response, "signals");
   if(signalsStr == "" || signalsStr == "[]") return;

   string mode = FindJsonValue(response, "mode");
   string fixedLotStr = FindJsonValue(response, "fixedLot");
   string riskPercentStr = FindJsonValue(response, "riskPercent");
   string maxLotsStr = FindJsonValue(response, "maxLots");

   double fixedLot = StringToDouble(fixedLotStr);
   double riskPercent = StringToDouble(riskPercentStr);
   double maxLots = StringToDouble(maxLotsStr);
   if(maxLots <= 0) maxLots = 10;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);

   int pos = 0;
   while(pos < StringLen(signalsStr))
   {
      int objStart = StringFind(signalsStr, "{", pos);
      if(objStart == -1) break;
      int objEnd = StringFind(signalsStr, "}", objStart);
      if(objEnd == -1) break;

      string signalObj = StringSubstr(signalsStr, objStart, objEnd - objStart + 1);
      pos = objEnd + 1;

      string signalId = FindJsonValue(signalObj, "id");
      string symbol = FindJsonValue(signalObj, "symbol");
      string direction = FindJsonValue(signalObj, "direction");
      string entryStr = FindJsonValue(signalObj, "entry");
      string slStr = FindJsonValue(signalObj, "stopLoss");
      string tpStr = FindJsonValue(signalObj, "takeProfit");

      if(signalId == "" || symbol == "" || direction == "") continue;

      if(StringFind(known_signal_ids, signalId) != -1)
         continue;

      double entry = StringToDouble(entryStr);
      double sl = StringToDouble(slStr);
      double tp = StringToDouble(tpStr);

      double lot;
      if(mode == "PERCENT")
         lot = CalcLotSize(balance, riskPercent, entry, sl);
      else
         lot = fixedLot;

      lot = MathMin(lot, maxLots);

      if(lot <= 0) lot = 0.01;

      bool opened = OpenTrade(symbol, direction, entry, sl, tp, lot);
      if(opened)
      {
         known_signal_ids += signalId + ",";
      }
   }
}

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

void OnTimer()
{
   datetime now = TimeCurrent();
   if(now - last_poll_at < MathMax(5, PollSeconds))
      return;
   last_poll_at = now;

   string response = ReadResponse(0);
   if(response != "")
      Print("SocialForexCopyTrade: polled OK");
}
