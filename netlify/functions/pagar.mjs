// Crea el pago en Mercado Pago (Yape, tarjetas y demás medios) por 30 días de acceso.
import { json, env, usuarioDesdeToken, PRECIO, PRECIO_ALERTA } from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const yo = await usuarioDesdeToken(req);
  if (!yo) return json({ error: "Inicia sesión con Google antes de pagar." }, 401);
  let body = {};
  try { body = await req.json(); } catch {}
  const cupon = String(body.cupon || "").trim().toUpperCase();
  const cuponValido = env("CUPON_ALERTA", "").trim().toUpperCase();
  let precio = PRECIO();
  let conCupon = false;
  if (cupon) {
    if (!cuponValido || cupon !== cuponValido) return json({ error: "Ese código de descuento no es válido." }, 400);
    precio = PRECIO_ALERTA();
    conCupon = true;
  }
  const base = env("URL", new URL(req.url).origin);
  const pref = {
    items: [{ id: "computo-penal-30d", title: "Cómputo Penal: acceso por 30 días", quantity: 1, unit_price: precio, currency_id: "PEN" }],
    payer: { email: yo.email },
    external_reference: yo.email,
    notification_url: `${base}/api/webhook`,
    back_urls: { success: `${base}/?pago=ok`, pending: `${base}/?pago=pendiente`, failure: `${base}/?pago=error` },
    auto_return: "approved",
    statement_descriptor: "COMPUTOPENAL",
    metadata: { email: yo.email, cupon: conCupon },
  };
  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: "Bearer " + env("MP_ACCESS_TOKEN"), "Content-Type": "application/json" },
    body: JSON.stringify(pref),
  });
  if (!r.ok) {
    console.error("Error de Mercado Pago", r.status, await r.text());
    return json({ error: "No se pudo iniciar el pago. Intenta de nuevo en unos minutos." }, 502);
  }
  const data = await r.json();
  return json({ url: data.init_point, precio });
};

export const config = { path: "/api/pagar" };
