# Recuperação do MFA da conta de admin

Fase 1A do piloto DoLado Empresas (23/10/2026). O admin inscreve dois factores TOTP em `/auth/mfa` (ligação «Segurança da conta» no menu do backoffice): o **Principal** e o de **Reserva**. Nesta fase o backoffice ainda **não** exige a verificação (aal2); isso só acontece na Fase 1B, depois de este procedimento ter sido ensaiado em produção.

## Antes de tudo

- A conta de Thiago no **Dashboard da Supabase** (supabase.com) tem de ter o seu próprio MFA activo: é a via de recuperação de último recurso. Sem ela, quem controla o Dashboard controla também o MFA do backoffice.
- Guardar o factor de reserva num dispositivo diferente do principal (outro telemóvel, ou um gestor de palavras-passe com TOTP — ex.: 1Password, Bitwarden). Dois factores no mesmo telemóvel não protegem contra a perda do telemóvel.
- A chave mostrada na inscrição (texto) serve para inscrever a mesma conta noutra aplicação **só no momento da inscrição**; não fica disponível depois.

## Caso 1 — perdeu um dos factores

1. Entrar no backoffice com a palavra-passe.
2. Abrir **Segurança da conta** (`/auth/mfa`) e verificar a sessão com o factor que ainda tem.
3. **Retirar** o factor perdido (só é possível com a sessão verificada e mantendo outro).
4. **Acrescentar outro factor** e confirmá-lo com o primeiro código.
5. Confirmar que a lista mostra de novo dois factores.

## Caso 2 — perdeu os dois factores

1. Entrar no Dashboard da Supabase (projecto `DoLado`, região `eu-west-3`) com a conta de Thiago e o MFA dela.
2. **SQL Editor** → identificar o utilizador:
   ```sql
   select id, email from auth.users where email = '<e-mail do admin>';
   ```
3. Ver os factores (confirmar que são os da conta certa antes de apagar):
   ```sql
   select id, friendly_name, factor_type, status, created_at
   from auth.mfa_factors where user_id = '<id>';
   ```
4. Apagar os factores dessa conta:
   ```sql
   delete from auth.mfa_factors where user_id = '<id>';
   ```
5. Entrar no backoffice com a palavra-passe e inscrever de novo o Principal e a Reserva em `/auth/mfa`.
6. Anotar a data e o motivo (fora do repositório).

Depois da Fase 1B, o passo 5 continua possível: `/auth/mfa` abre com a sessão aal1, mesmo quando o backoffice exige aal2.

## Ensaio obrigatório antes da Fase 1B

Fazer em produção, com a conta de admin, e confirmar por escrito:

- [ ] TOTP activo no Dashboard (Authentication → Multi-Factor → Authenticator app)
- [ ] MFA activo na conta do Dashboard da Supabase
- [ ] Principal e Reserva inscritos, em dispositivos diferentes
- [ ] «Estado desta sessão» mostra aal2 depois de verificar
- [ ] Caso 1 ensaiado: entrar só com a Reserva, retirar e voltar a inscrever o Principal
- [ ] Caso 2 conhecido: consultas do passo 3 executadas (sem apagar), para confirmar o acesso ao SQL Editor
