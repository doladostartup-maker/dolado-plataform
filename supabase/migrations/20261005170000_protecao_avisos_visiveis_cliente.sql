-- DoLado — Proteção: o cliente vê os avisos de datas já enviados dos
-- próprios serviços (05/10/2026).
--
-- A área de Proteção mostra "O que já fizemos por si" (verificações,
-- comparações, situações comunicadas e avisos por e-mail). Os avisos de fim
-- de fidelização/promoção ficam em contratos_alertas_envios, que até aqui só
-- o admin lia. Esta policy deixa o cliente ler as linhas dos serviços que
-- são dele — só leitura (a escrita continua só do servidor: o REVOKE de
-- 20261003090000 mantém-se). Os dados são os mesmos que o cliente já recebeu
-- por e-mail; nada de interno é exposto.
--
-- Compatível com o código anterior (que não lê esta tabela) e com o novo
-- (sem esta policy, a leitura devolve vazio e o histórico omite os avisos).

create policy "Cliente vê os avisos enviados dos próprios serviços"
  on public.contratos_alertas_envios for select to authenticated
  using (
    exists (
      select 1 from public.contratos_monitorizados c
       where c.id = contrato_id
         and c.utilizador_id = auth.uid()
    )
  );
