import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// <html>/<body> partilhados pelos dois layouts raiz: src/app/[idioma]
// (páginas do cliente, com lang do idioma) e src/app/backoffice (sempre
// português). Não é uma rota: só um componente.

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export function DocumentoRaiz({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
