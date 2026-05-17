import type { VipPlan } from "@/lib/vip-plans";

export function isPayPalLive(): boolean {
  return process.env.PAYPAL_ENV === "live";
}

export function getPayPalPublicClientId(): string | undefined {
  if (isPayPalLive()) {
    return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  }

  return (
    process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    process.env.PAYPAL_CLIENT_ID
  );
}

export function addVipDays(currentVipUntil: Date | null | undefined, days: number): Date {
  const base =
    currentVipUntil && currentVipUntil.getTime() > Date.now()
      ? new Date(currentVipUntil)
      : new Date();
  base.setDate(base.getDate() + days);
  return base;
}

const PAYPAL_API_BASE =
  isPayPalLive()
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID || getPayPalPublicClientId();
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    throw new Error("Missing PayPal credentials.");
  }

  return { clientId, secret };
}

async function getPayPalAccessToken(): Promise<string> {
  const { clientId, secret } = getPayPalCredentials();
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("PayPal token response did not include access_token.");
  }
  return data.access_token;
}

type PayPalOrderResponse = {
  id?: string;
  status?: string;
};

export type PayPalCapture = {
  id?: string;
  status?: string;
  amount?: { currency_code?: string; value?: string };
};

export type PayPalCaptureResponse = PayPalOrderResponse & {
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    payments?: {
      captures?: PayPalCapture[];
    };
  }>;
};

export type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    amount?: { currency_code?: string; value?: string };
    custom_id?: string;
    purchase_units?: PayPalCaptureResponse["purchase_units"];
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
};

export async function createPayPalVipOrder({
  plan,
  userId,
  userEmail,
}: {
  plan: VipPlan;
  userId: string;
  userEmail?: string | null;
}): Promise<{ id: string }> {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `vip-${plan.key}-${userId}`,
          custom_id: JSON.stringify({ userId, plan: plan.key }),
          description: `Social Forex VIP ${plan.months} month educational access`,
          amount: {
            currency_code: "USD",
            value: plan.price,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Social Forex",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
          ...(userEmail ? { email_address: userEmail } : {}),
        },
      },
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as PayPalOrderResponse;
  if (!res.ok || !data.id) {
    throw new Error(`PayPal create order failed: ${res.status}`);
  }

  return { id: data.id };
}

export async function capturePayPalVipOrder(orderId: string): Promise<PayPalCaptureResponse> {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = (await res.json()) as PayPalCaptureResponse;
  if (!res.ok) {
    throw new Error(`PayPal capture order failed: ${res.status}`);
  }
  return data;
}

export function getSuccessfulCapture(data: PayPalCaptureResponse) {
  return data.purchase_units
    ?.flatMap((unit) => unit.payments?.captures ?? [])
    .find((capture) => capture.status === "COMPLETED");
}

export function getCaptureOrderId(event: PayPalWebhookEvent): string | null {
  const resource = event.resource;
  return (
    resource?.supplementary_data?.related_ids?.order_id ??
    (event.event_type === "CHECKOUT.ORDER.COMPLETED" ? resource?.id : undefined) ??
    null
  );
}

export function getSuccessfulWebhookCapture(
  event: PayPalWebhookEvent,
): PayPalCapture | null {
  const resource = event.resource;
  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    return {
      id: resource?.id,
      status: resource?.status,
      amount: resource?.amount,
    };
  }

  if (event.event_type === "CHECKOUT.ORDER.COMPLETED") {
    return (
      resource?.purchase_units
        ?.flatMap((unit) => unit.payments?.captures ?? [])
        .find((capture) => capture.status === "COMPLETED") ?? null
    );
  }

  return null;
}

export function parsePayPalCustomId(customId: string | null | undefined):
  | { userId?: string; plan?: string }
  | null {
  if (!customId) return null;
  try {
    const parsed = JSON.parse(customId) as { userId?: unknown; plan?: unknown };
    return {
      userId: typeof parsed.userId === "string" ? parsed.userId : undefined,
      plan: typeof parsed.plan === "string" ? parsed.plan : undefined,
    };
  } catch {
    return null;
  }
}

export function getPayPalWebhookId(): string | undefined {
  return isPayPalLive()
    ? process.env.PAYPAL_WEBHOOK_ID
    : process.env.PAYPAL_SANDBOX_WEBHOOK_ID || process.env.PAYPAL_WEBHOOK_ID;
}

export async function verifyPayPalWebhookSignature({
  headers,
  event,
}: {
  headers: Headers;
  event: PayPalWebhookEvent;
}): Promise<boolean> {
  const webhookId = getPayPalWebhookId();
  if (!webhookId) return false;

  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
    cache: "no-store",
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}
