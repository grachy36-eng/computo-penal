import { json, env, PRECIO, LIMITE } from "../lib/util.mjs";

export default async () =>
  json({
    googleClientId: env("GOOGLE_CLIENT_ID", ""),
    precio: PRECIO(),
    limite: LIMITE(),
    contacto: env("CONTACTO", ""),
  });

export const config = { path: "/api/config" };
