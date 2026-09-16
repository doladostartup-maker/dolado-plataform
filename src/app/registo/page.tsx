import Link from "next/link";
import { registar } from "./actions";

export default async function RegistoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Criar conta</h1>

      {params.erro && <p className="text-sm text-red-600">{params.erro}</p>}

      <form action={registar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            name="nome"
            type="text"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="rounded border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Criar conta
        </button>
      </form>

      <p className="text-sm">
        Já tens conta?{" "}
        <Link href="/login" className="underline">
          Entra
        </Link>
      </p>
    </main>
  );
}
