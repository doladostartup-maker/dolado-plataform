// Templates da Supabase Auth em pt-PT e en-GB — `npm test`.
// O idioma vem de user_metadata.idioma ({{ .Data.idioma }}); sem idioma → português.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const CONDICAO = '{{ if eq (print .Data.idioma) "en-GB" }}';

describe("templates da Supabase Auth", () => {
  for (const [ficheiro, ligacao] of [
    ["../../supabase/templates/confirmacao.html", "{{ .ConfirmationURL }}"],
    ["../../supabase/templates/recuperacao.html", "{{ .RedirectTo }}?token_hash={{ .TokenHash }}"],
  ]) {
    test(ficheiro, () => {
      const html = ler(ficheiro);
      // Cada texto tem os dois ramos, e o português é sempre o ramo por omissão.
      const ramos = html.split(CONDICAO).length - 1;
      assert.ok(ramos >= 8, `${ramos} ramos`);
      assert.equal(ramos, html.split("{{ else }}").length - 1);
      assert.match(html, /<html lang="\{\{ if eq \(print \.Data\.idioma\) "en-GB" \}\}en-GB\{\{ else \}\}pt-PT\{\{ end \}\}">/);
      // A ligação (e o token) é a mesma nos dois idiomas.
      assert.equal(html.split(ligacao).length - 1, 1);
      // `$` e `with .Data` mudam o contexto e partem a condição (testado na stack local).
      assert.doesNotMatch(html, /\$\.Data|with \.Data/);
    });
  }

  test("código de confirmação só para contas de \"Tratar o meu caso\"", () => {
    assert.match(ler("../../supabase/templates/confirmacao.html"), /\{\{ if \.Data\.mostrar_codigo \}\}[\s\S]*\{\{ \.Token \}\}[\s\S]*\{\{ end \}\}/);
  });

  test("assuntos (config.toml): mesma condição, português por omissão", () => {
    const toml = ler("../../supabase/config.toml");
    assert.match(toml, /subject = '\{\{ if eq \(print \.Data\.idioma\) "en-GB" \}\}Confirm your email with DoLado\{\{ else \}\}Confirme o seu e-mail na DoLado\{\{ end \}\}'/);
    assert.match(toml, /subject = '\{\{ if eq \(print \.Data\.idioma\) "en-GB" \}\}Set a new password for DoLado\{\{ else \}\}Defina uma nova palavra-passe na DoLado\{\{ end \}\}'/);
  });
});
