import Link from "next/link";
import { login, loginComGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; info?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Entrar</h1>

      {params.info && <p className="text-sm text-blue-600">{params.info}</p>}
      {params.erro && <p className="text-sm text-red-600">{params.erro}</p>}

      <form action={login} className="flex flex-col gap-4">
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
            className="rounded border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Entrar
        </button>
      </form>

      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        ou
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={loginComGoogle}>
        <button type="submit" className="w-full rounded border px-4 py-2">
          Entrar com Google
        </button>
      </form>

      <p className="text-sm">
        Não tens conta?{" "}
        <Link href="/registo" className="underline">
          Regista-te
        </Link>
      </p>
    </main>
  );
}
