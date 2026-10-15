// Revisión temporal del estado de la cuenta de Mercado Pago (sin datos secretos).
import { json, env } from "../lib/util.mjs";

export default async () => {
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
    intentos = (d.results || []).map((p) => ({ fecha: p.date_created, estado: p.status, motivo: p.status_detail, medio: p.payment_method_id, tipo: p.payment_type_id, monto: p.transaction_amount }));
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
