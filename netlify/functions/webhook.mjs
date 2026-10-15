// Aviso automático de Mercado Pago. No confía en lo que llega: vuelve a consultar el pago en Mercado Pago.
import { json, activarPago } from "../lib/util.mjs";

export default async (req) => {
  const url = new URL(req.url);
  let body = {};
  try { body = await req.json(); } catch {}
  const tipo = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "";
  const id = body?.data?.id || url.searchParams.get("data.id") || (tipo === "payment" ? url.searchParams.get("id") : null);
  if (!String(tipo).startsWith("payment") || !id) return json({ ignorado: true });
  try {
    const r = await activarPago(id);
    console.log("Pago", id, r.motivo, r.email || "");
    return json({ recibido: true });
  } catch (e) {
    console.error("Error al procesar el pago", id, e.message);
    return json({ error: "reintentar" }, 500); // Mercado Pago reintenta más tarde
  }
};

export const config = { path: "/api/webhook" };
