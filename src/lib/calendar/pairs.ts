import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";

/** Cặp app hỗ trợ có thể chịu ảnh hưởng bởi một đồng tiền cụ thể. Thuần, không phụ thuộc server-only module. */
export function affectedPairsForCurrency(currency: string) {
  const c = currency.toUpperCase();
  const pairs = QUOTE_DEFINITIONS.filter((quote) => {
    if (quote.group === "major" || quote.group === "minor") {
      return quote.symbol.includes(c);
    }
    if (c === "USD") return ["XAUUSD", "XAGUSD", "USOIL", "BTCUSD", "ETHUSD"].includes(quote.symbol);
    return false;
  }).map((quote) => quote.symbol);

  return pairs.length > 0 ? pairs : ["No direct app pair"];
}
