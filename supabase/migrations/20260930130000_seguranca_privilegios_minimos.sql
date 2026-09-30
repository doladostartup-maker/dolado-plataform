-- DoLado — Auditoria de segurança de 30/09/2026: privilégios mínimos
--
-- 1) Regista em migration o endurecimento que já existia em produção, feito
--    fora das migrations (via Dashboard). Sem isto, um projeto recriado a
--    partir do repositório (staging, recuperação) ficava mais permissivo do
--    que a produção. Em produção estas instruções são inócuas.
-- 2) Retira TRUNCATE / REFERENCES / TRIGGER a anon e authenticated. O
--    TRUNCATE ignora RLS; a API (PostgREST/GraphQL) não o emite, mas nenhum
--    destes privilégios é usado pela aplicação — o backend usa service_role.
--
-- O acesso a dados continua a ser decidido pelo RLS; isto é defesa em
-- profundidade, não substitui as policies.

-- anon: só leitura (o RLS filtra; templates é a única tabela pública).
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

-- authenticated: mantém SELECT/INSERT/UPDATE/DELETE (cliente e backoffice
-- usam-nos, sempre sujeitos a RLS), sem os privilégios que não usa.
revoke truncate, references, trigger
  on all tables in schema public from authenticated;

-- Tabelas criadas no futuro pelas migrations (dono: postgres) já nascem
-- com os mesmos privilégios mínimos.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- Função de trigger do registo: nunca deve ser chamável pela API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin(): as policies correm com o papel de quem faz o pedido, por isso
-- authenticated PRECISA de a executar. anon não (para anon devolve sempre
-- false e as policies de admin nunca se aplicam a pedidos sem sessão).
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- utilizadores: as policies só se aplicam a pedidos com sessão (igual à
-- produção).
alter policy "Admin gere todos os perfis" on public.utilizadores to authenticated;
alter policy "Utilizador vê o próprio perfil" on public.utilizadores to authenticated;
