// Utilidades compartidas por las funciones de Cómputo Penal.
import { getStore } from "@netlify/blobs";

let storeOverride = null;
export const setStoreForTests = (s) => { storeOverride = s; };
const store = () => storeOverride || getStore({ name: "usuarios", consistency: "strong" });

export const env = (k, def) => (process.env[k] ?? def);
// ID público del botón "Iniciar sesión con Google" (no es secreto). Se puede reemplazar con la variable GOOGLE_CLIENT_ID.
export const GOOGLE_CLIENT_ID = () => env("GOOGLE_CLIENT_ID", "1047922090543-fvuemm498fkp6p444fhfqr7jcjf4t4im.apps.googleusercontent.com");
export const PRECIO = () => Number(env("PRECIO", "9"));
export const PRECIO_ALERTA = () => Number(env("PRECIO_ALERTA", "6"));
export const LIMITE = () => Number(env("LIMITE_GRATIS", "3"));
export const DIAS_ACCESO = 30;

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Mes actual en Lima (AAAA-MM), para reiniciar los cálculos gratis cada mes.
export const mesLima = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 7);

// Verifica el token de "Iniciar sesión con Google" y devuelve el correo.
export async function usuarioDesdeToken(req) {
  const h = req.headers.get("authorization") || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!tok) return null;
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(tok));
  if (!r.ok) return null;
  const p = await r.json();
  if (!p.email || p.aud !== GOOGLE_CLIENT_ID()) return null;
  if (!(p.email_verified === true || p.email_verified === "true")) return null;
  if (Number(p.exp) * 1000 < Date.now()) return null;
  return { email: String(p.email).toLowerCase() };
}

export async function leer(email) {
  const u = await store().get(email, { type: "json" });
  return u || { email, usos: {}, pagadoHasta: null, pagos: [] };
}
export async function guardar(u) {
  await store().setJSON(u.email, u);
}

export function estado(u) {
  const activo = !!u.pagadoHasta && new Date(u.pagadoHasta) > new Date();
  return {
    email: u.email,
    estado: activo ? "pago" : "gratis",
    pagadoHasta: u.pagadoHasta,
    usos: (u.usos || {})[mesLima()] || 0,
    limite: LIMITE(),
  };
}

// Consulta un pago en Mercado Pago y, si está aprobado, activa 30 días.
// Devuelve { activado, motivo, email }.
export async function activarPago(paymentId, emailEsperado = null) {
  const r = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), {
    headers: { Authorization: "Bearer " + env("MP_ACCESS_TOKEN") },
  });
  if (!r.ok) throw new Error("Mercado Pago respondió " + r.status);
  const p = await r.json();
  const email = String(p.external_reference || "").toLowerCase();
  if (!email) return { activado: false, motivo: "sin_referencia" };
  if (emailEsperado && email !== emailEsperado) return { activado: false, motivo: "otro_usuario" };
  if (p.status !== "approved") return { activado: false, motivo: "estado_" + p.status, email };
  const minimo = Math.min(PRECIO(), PRECIO_ALERTA());
  if (p.currency_id !== "PEN" || Number(p.transaction_amount) < minimo) return { activado: false, motivo: "monto", email };

  const u = await leer(email);
  u.pagos = u.pagos || [];
  if (u.pagos.includes(String(p.id))) return { activado: true, motivo: "ya_procesado", email };
  const desde = u.pagadoHasta && new Date(u.pagadoHasta) > new Date() ? new Date(u.pagadoHasta) : new Date();
  u.pagadoHasta = new Date(desde.getTime() + DIAS_ACCESO * 864e5).toISOString();
  u.pagos.push(String(p.id));
  u.ultimoPago = { id: String(p.id), monto: Number(p.transaction_amount), metodo: p.payment_method_id || null, fecha: p.date_approved || new Date().toISOString() };
  await guardar(u);
  return { activado: true, motivo: "ok", email };
}
