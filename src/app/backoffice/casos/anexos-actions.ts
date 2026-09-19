"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "anexos-casos";

export async function carregarAnexo(casoId: string, formData: FormData) {
  const supabase = await createClient();
  const ficheiro = formData.get("ficheiro") as File | null;

  if (!ficheiro || ficheiro.size === 0) {
    revalidatePath(`/backoffice/casos/${casoId}`);
    return;
  }

  const caminho = `${casoId}/${Date.now()}-${ficheiro.name}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, ficheiro, { contentType: ficheiro.type || undefined });

  if (erroUpload) {
    revalidatePath(`/backoffice/casos/${casoId}`);
    return;
  }

  await supabase.from("anexos").insert({
    caso_id: casoId,
    nome_ficheiro: ficheiro.name,
    caminho_storage: caminho,
    tipo_mime: ficheiro.type || null,
    tamanho_bytes: ficheiro.size,
  });

  revalidatePath(`/backoffice/casos/${casoId}`);
}

export async function apagarAnexo(
  anexoId: string,
  casoId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- exigido pela assinatura de Server Action ligada a um form
  _formData: FormData,
) {
  const supabase = await createClient();

  const { data: anexo } = await supabase
    .from("anexos")
    .select("caminho_storage")
    .eq("id", anexoId)
    .single();

  if (anexo) {
    await supabase.storage.from(BUCKET).remove([anexo.caminho_storage]);
    await supabase.from("anexos").delete().eq("id", anexoId);
  }

  revalidatePath(`/backoffice/casos/${casoId}`);
}
