import { json, env, PRECIO, LIMITE, GOOGLE_CLIENT_ID } from "../lib/util.mjs";

export default async () =>
  json({
    googleClientId: GOOGLE_CLIENT_ID(),
    precio: PRECIO(),
    limite: LIMITE(),
    contacto: env("CONTACTO", ""),
  });

export const config = { path: "/api/config" };
