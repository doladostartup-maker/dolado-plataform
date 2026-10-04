-- DoLado — Links de revisão do texto: ordem dos bloqueios.
--
-- Problema (encontrado no teste de contrato textoCaso.contrato.test.mjs):
-- "Autorizo o envio" e "Pedir alterações" no mesmo instante davam deadlock.
-- texto__validar_link bloqueava primeiro o link e depois a versão; o núcleo
-- (texto__autorizar / texto__pedir_alteracoes) bloqueia a versão e depois
-- invalida o OUTRO link. Cada pedido ficava à espera do link do outro e o
-- Postgres abortava um deles (40P01): a base de dados ficava coerente (só
-- uma decisão), mas um cliente via "erro" em vez de "já recebemos o seu
-- pedido" / "já autorizado".
--
-- Correção: a versão (casos_textos) é bloqueada primeiro, como em todas as
-- outras funções do fluxo (texto_guardar, texto_emitir_links, portal); o link
-- é lido depois do bloqueio, já com o estado final do pedido concorrente.
-- Regras, resultados e permissões não mudam.

create or replace function public.texto__validar_link(p_hash text, p_finalidade text, p_em timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  l public.casos_textos_links;
  v public.casos_textos;
  s text;
begin
  select * into l from public.casos_textos_links where token_hash = p_hash;
  if l.id is null or l.finalidade <> p_finalidade then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  -- Bloqueio da versão primeiro (mesma ordem de todo o fluxo: versão → links).
  select * into v from public.casos_textos where id = l.texto_id for update;
  select * into l from public.casos_textos_links where id = l.id;
  s := public.texto__situacao(v);
  if s <> 'valido' then
    return jsonb_build_object('resultado', s, 'autorizado_em', v.autorizado_em, 'link_id', l.id, 'texto_id', l.texto_id);
  end if;
  if l.usado_em is not null or l.invalidado_em is not null then
    return jsonb_build_object('resultado', 'link_substituido');
  end if;
  if l.expira_em <= p_em then
    return jsonb_build_object('resultado', 'expirado');
  end if;
  return jsonb_build_object('resultado', 'ok', 'link_id', l.id, 'texto_id', l.texto_id);
end $$;

revoke execute on function public.texto__validar_link(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.texto__validar_link(text, text, timestamptz) to service_role;
