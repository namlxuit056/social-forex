//+------------------------------------------------------------------+
//| SocialForexBridge.mq5                                            |
//| MT5 bridge for Social Forex.                                      |
//| Sends account info + open positions/orders, and executes          |
//| close/modify/close-all commands queued from the web dashboard.    |
//| It never opens new positions on its own.                          |
//+------------------------------------------------------------------+
#property copyright "Social Forex"
#property version   "1.10"
#property strict

input string BridgeEndpoint   = "https://social-forex.vercel.app/api/mt5/bridge";
input string CommandsEndpoint = "https://social-forex.vercel.app/api/mt5/commands";
input string BridgeToken      = "";
input int    HeartbeatSeconds = 30;
input int    CommandPollSeconds = 3;
input int    SlippagePoints   = 30;
input int    MagicNumber      = 990001;

datetime last_send_at = 0;
datetime last_poll_at = 0;

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

string BuildPayload()
{
   string json = "{";
   json += "\"token\":" + JsonString(BridgeToken) + ",";
   json += "\"account\":" + AccountJson() + ",";
   json += "\"positions\":" + PositionsJson() + ",";
   json += "\"orders\":" + OrdersJson() + ",";
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
bool ClosePositionByTicket(ulong ticket, string &errMsg)
{
   if(!PositionSelectByTicket(ticket))
   {
      errMsg = "position not found";
      return false;
   }
   string symbol  = PositionGetString(POSITION_SYMBOL);
   double volume  = PositionGetDouble(POSITION_VOLUME);
   long   posType = PositionGetInteger(POSITION_TYPE);
   bool   isBuy   = (posType == POSITION_TYPE_BUY);
   double price   = isBuy ? SymbolInfoDouble(symbol, SYMBOL_BID) : SymbolInfoDouble(symbol, SYMBOL_ASK);

   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action    = TRADE_ACTION_DEAL;
   req.position  = ticket;
   req.symbol    = symbol;
   req.volume    = volume;
   req.type      = isBuy ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
   req.price     = price;
   req.deviation = SlippagePoints;
   req.magic     = MagicNumber;
   req.comment   = "SF:CmdClose";

   if(!OrderSend(req, res) || (res.retcode != TRADE_RETCODE_DONE && res.retcode != TRADE_RETCODE_DONE_PARTIAL))
   {
      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: ClosePosition failed ticket=", ticket, " ", errMsg);
      return false;
   }
   Print("SocialForexBridge: Closed ticket=", ticket);
   return true;
}

bool ModifyPositionByTicket(ulong ticket, double sl, double tp, string &errMsg)
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

   if(!OrderSend(req, res) || (res.retcode != TRADE_RETCODE_DONE && res.retcode != TRADE_RETCODE_DONE_PARTIAL))
   {
      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: ModifyPosition failed ticket=", ticket, " ", errMsg);
      return false;
   }
   Print("SocialForexBridge: Modified ticket=", ticket, " SL=", safeSL, " TP=", safeTP);
   return true;
}

bool CancelOrderByTicket(ulong ticket, string &errMsg)
{
   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action = TRADE_ACTION_REMOVE;
   req.order  = ticket;

   if(!OrderSend(req, res) || res.retcode != TRADE_RETCODE_DONE)
   {
      errMsg = "err=" + IntegerToString(GetLastError()) + " rc=" + IntegerToString(res.retcode);
      Print("SocialForexBridge: CancelOrder failed ticket=", ticket, " ", errMsg);
      return false;
   }
   Print("SocialForexBridge: Cancelled order ticket=", ticket);
   return true;
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
      bool slNull, tpNull;
      double sl = JsonExtractNumber(obj, "stopLoss", slNull);
      double tp = JsonExtractNumber(obj, "takeProfit", tpNull);
      if(slNull) sl = 0.0;
      if(tpNull) tp = 0.0;

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
      else if(type == "MODIFY_POSITION")
      {
         if(ticket == 0)
            errorMsg = "invalid ticket";
         else
            success = ModifyPositionByTicket(ticket, sl, tp, errorMsg);
      }
      else if(type == "CLOSE_ALL")
      {
         success = CloseAllPositionsAndOrders(errorMsg);
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
   if(now - last_send_at >= MathMax(5, HeartbeatSeconds))
   {
      last_send_at = now;
      SendSnapshot();
   }
   if(now - last_poll_at >= MathMax(1, CommandPollSeconds))
   {
      last_poll_at = now;
      FetchAndExecuteCommands();
   }
}
