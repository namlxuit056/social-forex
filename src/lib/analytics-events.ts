export const ANALYTICS_EVENTS = {
  homepageCtaClick: "homepage_cta_click",
  startCtaClick: "start_cta_click",
  registerView: "register_view",
  registerSubmit: "register_submit",
  registerSuccess: "register_success",
  registerFailure: "register_failure",
  signupPromptView: "signup_prompt_view",
  signupPromptClick: "signup_prompt_click",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null
>;
