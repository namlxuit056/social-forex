# Signup Funnel Analytics

Use these custom Vercel Analytics events to review the signup funnel weekly.
Event names are stable and must not depend on visible EN/VI copy.

## Events

| Event | When | Properties |
| --- | --- | --- |
| `homepage_cta_click` | Visitor clicks a homepage CTA | `cta`, `destination`, optional `surface` |
| `start_cta_click` | Visitor clicks a CTA on `/start` | `cta`, `destination` |
| `register_view` | Register form mounts | `surface` |
| `register_submit` | Register form is submitted | `surface` |
| `register_success` | Account is created and credential sign-in succeeds | `surface` |
| `register_failure` | Register API or sign-in-after-create fails | `surface`, `reason` |
| `signup_prompt_view` | A contextual signup prompt is shown | `surface` |
| `signup_prompt_click` | Visitor clicks a contextual signup prompt | `surface` |

## Surfaces

Current contextual prompt surfaces:

- `watchlist`
- `journal`
- `academy_progress`
- `calendar_reminders`
- `start_progress`

## Weekly Review

1. Check sessions and top landing pages in Vercel Analytics.
2. Compare `homepage_cta_click` and `start_cta_click` against page views.
3. Compare `register_view`, `register_submit`, `register_success`, and `register_failure`.
4. Break down `signup_prompt_view` and `signup_prompt_click` by `surface`.
5. If traffic is low, prioritize acquisition and SEO. If traffic exists but `register_submit` or `register_success` is low, prioritize signup copy, prompt placement, and form friction.

Do not add email, password, name, or other PII to analytics properties.
