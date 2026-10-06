// PDF mínimo com camada de texto (Helvetica, WinAnsi), para os testes.
// Cada linha: [x, y, tamanho, texto]. Só dados fictícios. `escala` aumenta a
// página (usado para gerar as imagens dos testes de OCR).
export function pdfComTexto(linhas, escala = 1) {
  const esc = (t) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const conteudo = linhas.map(([x, y, t, texto]) => `BT /F1 ${t * escala} Tf ${x * escala} ${y * escala} Td (${esc(texto)}) Tj ET`).join("\n");
  const stream = Buffer.from(conteudo, "latin1");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${595 * escala} ${842 * escala}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    null,
  ];
  const partes = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets = [];
  let pos = partes[0].length;
  objetos.forEach((o, i) => {
    const corpo =
      o === null
        ? Buffer.concat([Buffer.from(`${i + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n`, "latin1"), stream, Buffer.from("\nendstream\nendobj\n", "latin1")])
        : Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, "latin1");
    offsets.push(pos);
    partes.push(corpo);
    pos += corpo.length;
  });
  const xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  partes.push(Buffer.from(xref, "latin1"));
  return new Uint8Array(Buffer.concat(partes));
}

// Fatura fictícia de telecomunicações: bloco da empresa (NIPC, sede), bloco
// do destinatário (nome e morada sem rótulo) e quadro com NIF e números.
export const LINHAS_FATURA = [
  [40, 800, 12, "Operadora Exemplo, S.A."],
  [40, 786, 9, "Av. da Liberdade 100, 1250-100 Lisboa"],
  [40, 774, 9, "NIPC 503504564 Capital social 100 000 EUR"],
  [330, 720, 11, "MARIA JOSÉ DA SILVA"],
  [330, 706, 11, "RUA DAS FLORES 12 2 ESQ"],
  [330, 692, 11, "4000-123 PORTO"],
  [40, 640, 10, "Fatura n.º FT 2026/12345"],
  [40, 620, 10, "N.º Cliente: 1234567"],
  [300, 620, 10, "N.º Contrato: C-778899"],
  [40, 600, 10, "NIF: 123456789"],
  [300, 600, 10, "Data de emissão: 01/09/2026"],
  [40, 560, 10, "Mensalidade pacote fibra 45,99 EUR"],
];
