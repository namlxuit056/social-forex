import { ChartCandlestick, MessageSquare, Shield, BookOpen } from "lucide-react";

export const primaryNavKeys = [
  { href: "/desk", key: "desk", icon: ChartCandlestick },
  { href: "/signals", key: "signals", icon: Shield },
  { href: "/forum", key: "forum", icon: MessageSquare },
  { href: "/academy", key: "academy", icon: BookOpen },
] as const;

export const marketNavKeys = [
  { href: "/quotes", key: "quotes" },
  { href: "/calendar", key: "calendar" },
  { href: "/chart", key: "chart" },
  { href: "/tools", key: "tools" },
  { href: "/screener", key: "screener" },
  { href: "/scalping", key: "scalping" },
  { href: "/alerts", key: "alerts" },
  { href: "/heatmap", key: "heatmap" },
  { href: "/sentiment", key: "sentiment" },
] as const;

export const communityNavKeys = [
  { href: "/leaderboard", key: "leaderboard" },
  { href: "/copy-trade", key: "copyTrade" },
  { href: "/ai-trade-proposals", key: "aiTradeProposal" },
  { href: "/plan", key: "plan" },
  { href: "/journal", key: "journal" },
  { href: "/mt5", key: "mt5" },
  { href: "/positions", key: "positions" },
  { href: "/backtest", key: "backtest" },
  { href: "/messages", key: "messages" },
  { href: "/forum/search", key: "searchTopics" },
] as const;

export const learningNavKeys = [
  { href: "/articles", key: "articles" },
  { href: "/challenge", key: "challenge" },
  { href: "/start", key: "startHere" },
  { href: "/webinar", key: "webinar" },
  { href: "/resources", key: "resources" },
  { href: "/brokers", key: "brokers" },
  { href: "/partners", key: "partners" },
] as const;
