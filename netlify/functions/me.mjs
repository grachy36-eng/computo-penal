import { json, usuarioDesdeToken, leer, estado } from "../lib/util.mjs";

export default async (req) => {
  const yo = await usuarioDesdeToken(req);
  if (!yo) return json({ error: "Inicia sesión de nuevo." }, 401);
  return json(estado(await leer(yo.email)));
};

export const config = { path: "/api/me" };
