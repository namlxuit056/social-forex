import type { VipPlan } from "@/lib/vip-plans";

export function addVipDays(currentVipUntil: Date | null | undefined, days: number): Date {
  const base =
    currentVipUntil && currentVipUntil.getTime() > Date.now()
      ? new Date(currentVipUntil)
      : new Date();
  base.setDate(base.getDate() + days);
  return base;
}

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getPayPalCredentials() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID ?? process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID;
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

type PayPalCaptureResponse = PayPalOrderResponse & {
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
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
