import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold">DoLado</h1>
      <p className="text-neutral-600">
        Plataforma de acompanhamento de reclamações de consumo.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Entrar
        </Link>
        <Link href="/registo" className="rounded border px-4 py-2">
          Criar conta
        </Link>
      </div>
    </main>
  );
}
