import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRECO_AVULSO_ID = process.env.STRIPE_PRICE_AVULSO_ID!;
export const PRECO_ASSINATURA_ID = process.env.STRIPE_PRICE_ASSINATURA_ID!;
