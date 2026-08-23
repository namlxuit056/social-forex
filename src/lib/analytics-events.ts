export const ANALYTICS_EVENTS = {
  // Acquisition
  homepageCtaClick: "homepage_cta_click",
  startCtaClick: "start_cta_click",

  // Auth funnel
  registerView: "register_view",
  registerSubmit: "register_submit",
  registerSuccess: "register_success",
  registerFailure: "register_failure",
  loginSuccess: "login_success",
  loginFailure: "login_failure",

  // Conversion prompts
  signupPromptView: "signup_prompt_view",
  signupPromptClick: "signup_prompt_click",
  vipUpgradeView: "vip_upgrade_view",
  vipUpgradeClick: "vip_upgrade_click",
  vipOrderCreate: "vip_order_create",

  // Core feature usage
  signalView: "signal_view",
  signalVipBlocked: "signal_vip_blocked",
  articleRead: "article_read",
  forumThreadView: "forum_thread_view",
  forumPostCreate: "forum_post_create",
  aiChatMessage: "ai_chat_message",
  journalEntryCreate: "journal_entry_create",

  // Search / discovery
  signalFilter: "signal_filter",
  quoteView: "quote_view",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null
>;
