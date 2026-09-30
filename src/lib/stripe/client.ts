import Stripe from "stripe";

// Instanciação lazy de propósito — o Next.js executa este módulo durante o
// build (fase de "collect page data" das route handlers), onde as
// variáveis de ambiente da Clever Cloud podem ainda não estar injectadas.
// Um `new Stripe(...)` ao nível do módulo rebenta o build nessa fase; só
// deve correr quando um pedido real precisa do cliente.
let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

// Os price IDs estão em src/lib/stripe/planos.ts.
