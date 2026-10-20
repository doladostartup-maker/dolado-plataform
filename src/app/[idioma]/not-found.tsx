import Link from "@/i18n/Link";
import { tComum } from "@/i18n/mensagens/comum";
import { obterIdioma } from "@/i18n/servidor";

// Página não encontrada (site público e portal), no idioma do pedido.
export default async function NaoEncontrada() {
  const t = tComum[await obterIdioma()].naoEncontrada;
  return (
    <main className="tema-v2 flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center text-[var(--v2-navy)]">
      <p className="text-[14px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">404</p>
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">{t.titulo}</h1>
      <p className="max-w-[46ch] text-[16px] leading-relaxed text-[var(--v2-muted)]">{t.texto}</p>
      <Link href="/" prefetch={false} className="font-semibold text-[var(--v2-green)] underline underline-offset-4">
        {t.voltar}
      </Link>
    </main>
  );
}
