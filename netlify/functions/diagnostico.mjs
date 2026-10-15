// Revisión temporal del estado de la cuenta de Mercado Pago (sin datos secretos).
import { json, env } from "../lib/util.mjs";

export default async () => {
  const tok = env("MP_ACCESS_TOKEN", "");
  const tipo = tok.startsWith("TEST-") ? "TEST" : tok.startsWith("APP_USR-") ? "APP_USR" : (tok ? "otro" : "vacío");
  if (!tok) return json({ token: tipo });
  const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: "Bearer " + tok } });
  if (!r.ok) return json({ token: tipo, error: "Mercado Pago respondió " + r.status });
  const u = await r.json();
  return json({
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
