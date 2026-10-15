// Revisión temporal del estado de la cuenta de Mercado Pago (sin datos secretos).
import { json, env, leer } from "../lib/util.mjs";

export default async (req) => {
  if (new URL(req.url).searchParams.get("preferencia") === "1") return preferenciaDePrueba();
  const tok = env("MP_ACCESS_TOKEN", "");
  const tipo = tok.startsWith("TEST-") ? "TEST" : tok.startsWith("APP_USR-") ? "APP_USR" : (tok ? "otro" : "vacío");
  if (!tok) return json({ token: tipo });
  const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: "Bearer " + tok } });
  if (!r.ok) return json({ token: tipo, error: "Mercado Pago respondió " + r.status });
  const u = await r.json();
  // Últimos intentos de pago (sin datos personales): estado y motivo.
  let intentos = null;
  try {
    const s = await fetch("https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=10", { headers: { Authorization: "Bearer " + tok } });
    const d = await s.json();
    intentos = await Promise.all((d.results || []).map(async (p) => {
      let acceso = null;
      try { const u = p.external_reference && p.external_reference !== "diagnostico" ? await leer(String(p.external_reference).toLowerCase()) : null; acceso = u ? { pago_registrado: (u.pagos || []).includes(String(p.id)), activo_hasta: u.pagadoHasta } : null; } catch (e) { acceso = "error"; }
      return { fecha: p.date_created, estado: p.status, motivo: p.status_detail, medio: p.payment_method_id, tipo: p.payment_type_id, monto: p.transaction_amount, acceso };
    }));
  } catch (e) { intentos = "error: " + e.message; }
  return json({
    intentos,
    token: tipo,
    pais: u.site_id,
    usuario_de_prueba: Array.isArray(u.tags) && u.tags.includes("test_user"),
    etiquetas: u.tags,
    estado_cuenta: u.status?.site_status,
    puede_vender: u.status?.sell ?? null,
    puede_cobrar: u.status?.billing ?? null,
    identidad: u.status?.confirmed_email ?? null,
  });
};

export const config = { path: "/api/diagnostico" };

// Crea una preferencia de prueba (no cobra nada) y muestra la respuesta sin datos personales.
async function preferenciaDePrueba() {
  const tok = env("MP_ACCESS_TOKEN", "");
  const base = env("URL", "https://computo-penal.netlify.app");
  const body = {
    items: [{ id: "computo-penal-30d", title: "Cómputo Penal: acceso por 30 días", quantity: 1, unit_price: 1, currency_id: "PEN" }],
    external_reference: "diagnostico",
    notification_url: `${base}/api/webhook`,
    back_urls: { success: `${base}/?pago=ok`, pending: `${base}/?pago=pendiente`, failure: `${base}/?pago=error` },
    auto_return: "approved",
    statement_descriptor: "COMPUTOPENAL",
  };
  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  return json({
    http_status: r.status,
    id: d.id, collector_id: d.collector_id, client_id: d.client_id, site_id: d.site_id,
    operation_type: d.operation_type, date_created: d.date_created,
    items: d.items, payment_methods: d.payment_methods, binary_mode: d.binary_mode,
    auto_return: d.auto_return, back_urls: d.back_urls, notification_url: d.notification_url,
    statement_descriptor: d.statement_descriptor, init_point: d.init_point,
    error: d.error || null, message: d.message || null, cause: d.cause || null,
  });
}
