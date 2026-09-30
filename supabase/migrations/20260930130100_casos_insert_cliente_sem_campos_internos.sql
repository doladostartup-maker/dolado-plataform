-- DoLado — Auditoria de segurança de 30/09/2026: atribuição em massa em casos
--
-- Problema: a policy "Cliente cria os próprios casos" só validava
-- utilizador_id. Chamando a API diretamente (sem passar pelo formulário do
-- portal), um cliente podia criar um caso próprio já com campos que só o
-- backoffice deve preencher — p.ex. status 'Resolvido' (o caso saltava a
-- fila de revisão), dossie_url, valor_indicado, tipo_abc, notas ou
-- primeira_resposta_em.
--
-- Correção: o cliente continua a criar casos só em nome próprio, mas agora
-- obrigatoriamente com status 'Novo' e sem campos internos. O admin cria e
-- edita casos pela policy "Admin gere todos os casos", que não muda. O
-- formulário do portal (src/app/portal/casos/actions.ts) não envia nenhum
-- destes campos, por isso não é afetado.

drop policy "Cliente cria os próprios casos" on public.casos;

create policy "Cliente cria os próprios casos" on public.casos
  for insert with check (
    utilizador_id = auth.uid()
    and status = 'Novo'
    and tipo_abc is null
    and valor_indicado is null
    and notas is null
    and dossie_url is null
    and data_envio_reclamacao is null
    and email_boas_vindas_enviado_em is null
    and primeira_resposta_em is null
  );
