import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(
  method: string,
  path: string,
  secretKey: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${STRIPE_API}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body && method !== "GET") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    init.body = params.toString();
  }

  const response = await fetch(url, init);
  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    const error = data.error as { message?: string; type?: string };
    throw new Error(`Stripe error: ${error.message ?? JSON.stringify(data.error)}`);
  }

  return data;
}

export class StripeChargeCreateExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const secretKey = String(inputs.secretKey ?? "").trim();
    const amount = Number(inputs.amount ?? 0);
    const currency = String(inputs.currency ?? "usd").toLowerCase();
    const description = String(inputs.description ?? "").trim();
    const customerId = String(inputs.customerId ?? "").trim();
    const metadata = String(inputs.metadata ?? "").trim();

    if (!secretKey || !amount) {
      throw new Error("secretKey y amount son requeridos");
    }

    const body: Record<string, unknown> = {
      amount: Math.round(amount * 100),
      currency,
    };
    if (description) body.description = description;
    if (customerId) body.customer = customerId;
    if (metadata) {
      try {
        body.metadata = JSON.parse(metadata);
      } catch {
        throw new Error("metadata debe ser un JSON válido");
      }
    }

    const data = await stripeRequest("POST", "/payment_intents", secretKey, body);

    return {
      outputs: {
        id: data.id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        client_secret: data.client_secret,
      },
    };
  }
}

export class StripeCustomerCreateExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const secretKey = String(inputs.secretKey ?? "").trim();
    const email = String(inputs.email ?? "").trim();
    const name = String(inputs.name ?? "").trim();
    const phone = String(inputs.phone ?? "").trim();
    const description = String(inputs.description ?? "").trim();
    const metadata = String(inputs.metadata ?? "").trim();

    if (!secretKey) {
      throw new Error("secretKey es requerido");
    }

    const body: Record<string, unknown> = {};
    if (email) body.email = email;
    if (name) body.name = name;
    if (phone) body.phone = phone;
    if (description) body.description = description;
    if (metadata) {
      try {
        body.metadata = JSON.parse(metadata);
      } catch {
        throw new Error("metadata debe ser un JSON válido");
      }
    }

    const data = await stripeRequest("POST", "/customers", secretKey, body);

    return {
      outputs: {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        created: data.created,
      },
    };
  }
}

export class StripeSubscriptionCreateExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const secretKey = String(inputs.secretKey ?? "").trim();
    const customerId = String(inputs.customerId ?? "").trim();
    const priceId = String(inputs.priceId ?? "").trim();
    const trialDays = Number(inputs.trialDays ?? 0);
    const metadata = String(inputs.metadata ?? "").trim();

    if (!secretKey || !customerId || !priceId) {
      throw new Error("secretKey, customerId y priceId son requeridos");
    }

    const body: Record<string, unknown> = {
      customer: customerId,
      items: [{ price: priceId }],
    };

    if (trialDays > 0) {
      body.trial_period_days = trialDays;
    }
    if (metadata) {
      try {
        body.metadata = JSON.parse(metadata);
      } catch {
        throw new Error("metadata debe ser un JSON válido");
      }
    }

    const data = await stripeRequest("POST", "/subscriptions", secretKey, body);

    return {
      outputs: {
        id: data.id,
        status: data.status,
        current_period_end: data.current_period_end,
        trial_end: data.trial_end,
      },
    };
  }
}
