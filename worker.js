// Contador de escaneamentos do QR code — ServFaz (teste)
// Cloudflare Worker + KV (namespace vinculado com o nome CONTADOR)

const WHATSAPP = "5586981801575";
const MENSAGEM = "Olá, vi o vídeo da ServFaz";
const DESTINO = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAGEM)}`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Dados brutos
    if (url.pathname === "/stats.json") {
      return Response.json(await lerDados(env));
    }

    // Painel
    if (url.pathname === "/stats") {
      return new Response(painel(await lerDados(env)), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Escaneamento: conta só GET na raiz (ignora favicon e afins)
    if (url.pathname === "/" && req.method === "GET") {
      const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      for (const chave of ["total", `dia:${hoje}`]) {
        const atual = Number(await env.CONTADOR.get(chave)) || 0;
        await env.CONTADOR.put(chave, String(atual + 1));
      }
      return Response.redirect(DESTINO, 302);
    }

    return new Response("Não encontrado", { status: 404 });
  },
};

async function lerDados(env) {
  const total = Number(await env.CONTADOR.get("total")) || 0;
  const lista = await env.CONTADOR.list({ prefix: "dia:" });
  const dias = [];
  for (const k of lista.keys) {
    dias.push({ data: k.name.slice(4), escaneamentos: Number(await env.CONTADOR.get(k.name)) });
  }
  dias.sort((a, b) => b.data.localeCompare(a.data));
  return { total, dias };
}

function painel({ total, dias }) {
  const max = Math.max(1, ...dias.map((d) => d.escaneamentos));
  const linhas = dias
    .map((d) => {
      const [a, m, dia] = d.data.split("-");
      const largura = (d.escaneamentos / max) * 100;
      return `<tr><td>${dia}/${m}/${a}</td><td class="barra"><span style="width:${largura}%"></span></td><td>${d.escaneamentos}</td></tr>`;
    })
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Escaneamentos QR</title>
<style>
body{font-family:system-ui,sans-serif;background:#f5f6f8;color:#1a1a1a;margin:0;padding:24px 16px}
main{max-width:560px;margin:auto}
.card{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px #0001}
.num{font-size:48px;font-weight:700;color:#128c7e}
table{width:100%;border-collapse:collapse}td{padding:8px 4px;border-bottom:1px solid #eee}
.barra{width:60%}.barra span{display:block;height:10px;background:#25d366;border-radius:5px}
small{color:#666}
</style></head><body><main>
<div class="card"><small>Total de escaneamentos</small><div class="num">${total}</div></div>
<div class="card"><small>Por dia</small><table>${linhas || "<tr><td>Nenhum escaneamento ainda</td></tr>"}</table></div>
<small>Atualize a página para ver novos dados.</small>
</main></body></html>`;
}
