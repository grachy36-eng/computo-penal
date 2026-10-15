// Al volver de Mercado Pago, activa el pago de inmediato sin esperar el aviso automático.
import { json, usuarioDesdeToken, activarPago, leer, estado } from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const yo = await usuarioDesdeToken(req);
  if (!yo) return json({ error: "Inicia sesión de nuevo." }, 401);
  let body = {};
  try { body = await req.json(); } catch {}
  const id = String(body.payment_id || "").replace(/\D/g, "");
  if (!id) return json({ error: "Falta el número de pago." }, 400);
  try {
    const r = await activarPago(id, yo.email);
    return json({ ...r, ...estado(await leer(yo.email)) });
  } catch (e) {
    return json({ error: "No se pudo confirmar el pago todavía." }, 502);
  }
};

export const config = { path: "/api/confirmar" };
