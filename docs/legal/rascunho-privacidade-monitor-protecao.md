# Rascunho — Política de Privacidade, versão para o Monitor de Proteção

**Estado:** rascunho para validação pela advogada. **Não publicado.**
**Base:** versão em vigor `2026-10-02d`.
**Versão proposta:** `2026-10-0X` (a data da publicação, depois da validação).
**Porquê:** o Monitor de Proteção (`docs/especificacoes/PLANO_MONITOR_FASE1.md`) junta e alarga as funcionalidades de proteção: a DoLado passa a guardar um registo estruturado de cada contrato acompanhado, o histórico das faturas carregadas, identificadores da instalação (CPE/CUI) e situações detetadas nas faturas, com revisão humana antes de qualquer comunicação.

Só mudam as secções 2, 3, 4, 5 (Anthropic) e 6 (tabela de prazos). As secções 1 e 7 a 10 não mudam.

Depois de validado: criar `src/app/(legal)/privacidade/_versoes/v2026-10-0X.tsx` a partir da `v2026-10-02d.tsx`, registar em `index.ts`, subir `PRIVACIDADE_VERSAO` em `src/lib/legal.ts` e atualizar a matriz `docs/legal/matriz-subcontratantes.md` (finalidade da Anthropic).

---

## Secção 2 — Que dados tratamos

**Substituir** o ponto "Dados das funcionalidades de proteção" por:

> **Dados do Monitor de Proteção:** os contratos que o Utilizador decide acompanhar e a informação que deles resulta — fornecedor, serviço, referência do contrato, mensalidade, datas de início e de fim de fidelização e de promoção, valor da vantagem associada à fidelização, valor de cessação antecipada indicado na fatura e, quando aplicável, os códigos de identificação da instalação (CPE, para a eletricidade, e CUI, para o gás natural); as faturas e os contratos que carrega e os valores lidos desses documentos; a origem de cada dado (introduzido pelo Utilizador, lido de um documento ou corrigido pela DoLado) e as confirmações e correções feitas pelo Utilizador; as situações detetadas na comparação das faturas e a respetiva revisão pela DoLado; e o registo dos alertas enviados.

## Secção 3 — Para que usamos estes dados

No fundamento "Execução do contrato", **substituir** "prestar as funcionalidades de proteção do plano contratado;" por:

> prestar as funcionalidades de proteção do plano contratado, incluindo o Monitor de Proteção: ler os documentos carregados, acompanhar as datas e as condições dos contratos, comparar as faturas ao longo do tempo e avisar o titular das datas relevantes e das situações que, depois de revistas pela DoLado, mereçam ser verificadas;

No fundamento "Interesse legítimo", **substituir** "a configuração dos alertas desativados" por:

> a configuração dos alertas e dos contratos acompanhados que tenham sido desativados

## Secção 4 — Inteligência artificial e decisões automatizadas

**Substituir** o primeiro parágrafo por:

> A DoLado utiliza sistemas de inteligência artificial como ferramenta de apoio no Monitor de Proteção, para ler as faturas e os contratos que o Utilizador carrega e extrair deles dados objetivos — por exemplo, datas, valores e o nome do fornecedor.

**Acrescentar** depois do terceiro parágrafo ("A utilização de inteligência artificial não implica…"):

> A inteligência artificial é usada apenas para ler e estruturar os documentos. As comparações, os cálculos e a aplicação de regras são feitos por programas com regras fixas, e o Utilizador pode confirmar ou corrigir os dados lidos. Qualquer situação detetada na comparação das faturas é revista por uma pessoa da equipa DoLado antes de ser comunicada ao Utilizador, e é apresentada como uma situação que merece ser verificada, nunca como uma conclusão sobre o cumprimento da lei ou do contrato.

O parágrafo sobre minimização mantém-se; **acrescentar** no fim:

> O conteúdo dos documentos é tratado apenas como dados a extrair, e o prestador recebe um documento de cada vez, sem o histórico do Utilizador.

## Secção 5 — Com quem partilhamos os dados

No ponto da **Supabase**, **substituir** "dados das funcionalidades de proteção" por:

> dados das funcionalidades de proteção e do Monitor de Proteção, incluindo os documentos carregados

No ponto da **Anthropic**, **substituir** "tratamento da informação necessária às funcionalidades de inteligência artificial descritas na secção 4" por:

> leitura das faturas e dos contratos carregados no Monitor de Proteção, descrita na secção 4

## Secção 6 — Prazos de conservação (tabela)

**Substituir** as linhas "Alertas das funcionalidades de proteção…" e "Faturas carregadas no comparador de faturas e respetivas comparações" por:

| Categoria | Prazo |
|---|---|
| Monitor de Proteção e restantes funcionalidades de proteção: contratos acompanhados, faturas e contratos carregados (documentos e dados lidos), origem e correções dos dados, situações detetadas e respetiva revisão, alertas e setores subscritos para o aviso sectorial | Enquanto a subscrição com Proteção estiver ativa ou até o titular deixar de acompanhar o contrato ou pedir a sua eliminação. Quando a subscrição termina, o acompanhamento é desativado e deixam de ser enviados alertas; os dados e os documentos são conservados durante 6 meses a contar dessa data, apenas para que o titular possa recuperar o acompanhamento se voltar à DoLado, sem qualquer envio nesse período. Após esse prazo, são eliminados ou anonimizados, salvo obrigação legal que exija a sua conservação. |
| Registos do custo de utilização da inteligência artificial (modelo, quantidade de dados processados e custo, sem conteúdo dos documentos) | Sem dados pessoais: conservados para controlo de custos. |

---

## Pontos para a advogada

1. **CPE/CUI:** são dados pessoais quando associados à conta (identificam a instalação de uma casa). Concorda que o fundamento é a execução do contrato e que não há outro cuidado necessário?
2. **Situações detetadas:** a formulação da secção 4 ("merece ser verificada, nunca como uma conclusão") é suficiente para manter a linha entre apoio administrativo e aconselhamento jurídico, tendo em conta que há sempre revisão humana antes da comunicação?
3. **Documentos de terceiros:** as faturas podem conter dados de outras pessoas (cotitulares). A secção 8 atual cobre isto ou deve referir também o Monitor?
4. **Conservação de 6 meses dos documentos** (decisão de Thiago de 02/10/2026): validar a proporcionalidade, dado que os documentos permitem reprocessar a leitura e servem de prova numa reclamação posterior.
5. **Migração:** os alertas existentes (4, de 2 clientes) passam para o Monitor sem mudança de finalidade nem de prazo. É preciso avisar estes clientes?
