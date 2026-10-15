// Registra un cálculo. Los suscriptores no tienen límite; los demás, LIMITE_GRATIS por mes.
import { json, usuarioDesdeToken, leer, guardar, estado, mesLima, LIMITE } from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const yo = await usuarioDesdeToken(req);
  if (!yo) return json({ error: "Inicia sesión de nuevo." }, 401);
  const u = await leer(yo.email);
  const e = estado(u);
  if (e.estado === "pago") return json({ ok: true, ...e });
  if (e.usos >= LIMITE()) return json({ ok: false, ...e }, 402);
  u.usos = u.usos || {};
  u.usos[mesLima()] = e.usos + 1;
  await guardar(u);
  return json({ ok: true, ...estado(u) });
};

export const config = { path: "/api/usar" };
