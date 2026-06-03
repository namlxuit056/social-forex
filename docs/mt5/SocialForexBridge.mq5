//+------------------------------------------------------------------+
//| SocialForexBridge.mq5                                            |
//| Read-only MT5 bridge for Social Forex.                           |
//| Sends account info and open positions. It does not place trades.  |
//+------------------------------------------------------------------+
#property copyright "Social Forex"
#property version   "1.00"
#property strict

input string BridgeEndpoint = "https://social-forex.vercel.app/api/mt5/bridge";
input string BridgeToken = "";
input int HeartbeatSeconds = 30;

datetime last_send_at = 0;

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

string BuildPayload()
{
   string json = "{";
   json += "\"token\":" + JsonString(BridgeToken) + ",";
   json += "\"account\":" + AccountJson() + ",";
   json += "\"positions\":" + PositionsJson() + ",";
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
   char data[];
   char result[];
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

int OnInit()
{
   EventSetTimer(MathMax(5, HeartbeatSeconds));
   Print("SocialForexBridge initialized. Read-only sync enabled.");
   SendSnapshot();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   datetime now = TimeCurrent();
   if(now - last_send_at < MathMax(5, HeartbeatSeconds))
      return;
   last_send_at = now;
   SendSnapshot();
}
