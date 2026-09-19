import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const BUCKET = "anexos-casos";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: anexo, error: erroAnexo } = await supabase
    .from("anexos")
    .select("caminho_storage")
    .eq("id", id)
    .single();

  if (erroAnexo || !anexo) {
    return NextResponse.json({ erro: "Anexo não encontrado." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(anexo.caminho_storage, 60);

  if (error || !data) {
    return NextResponse.json({ erro: "Não foi possível gerar o link." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
