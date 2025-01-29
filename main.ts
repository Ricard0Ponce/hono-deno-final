import { Hono } from "hono";
import { getTasas } from "./controllers/tasas.controller.ts";
import { getUdis } from "./controllers/udis.controller.ts";
import { getSofipos } from "./controllers/sofipos.controller.ts";
import { inversionParams } from "./types/inversionParams.types.ts";
import { getCalculos } from "./controllers/calculos.controller.ts";

const app = new Hono();

// Middleware de CORS
app.use("*", async (c, next) => {
  // Configurar los encabezados CORS
  c.header("Access-Control-Allow-Origin", "*"); // Permite cualquier origen
  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  ); // Métodos permitidos
  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  ); // Encabezados permitidos

  // Manejar solicitudes preflight (OPTIONS)
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204 }); // No Content
  }

  await next(); // Continuar con el siguiente middleware o ruta
});

// Rutas
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/tasas", async (c) => {
  const tasas = await getTasas();
  return c.json(tasas);
});

app.get("/udis", async (c) => {
  const udis = await getUdis();
  return c.json(udis);
});

app.get("/sofipos", async (c) => {
  const sofipos = await getSofipos();
  return c.json(sofipos);
});

app.post("/inversion", async (c) => {
  try {
    const body = await c.req.json() as inversionParams;

    // Validación de los datos recibidos
    if (
      typeof body.monto_a_invertir !== "number" ||
      typeof body.fija_o_flexible !== "string" ||
      typeof body.modelo_de_inversion !== "string"
    ) {
      return c.json({ error: "Faltan datos o datos incorrectos" }, 400);
    }

    const calculo = await getCalculos(body);
    return c.json(calculo);
  } catch (error) {
    return c.json({ error: "Error en los datos!" }, 400);
  }
});

// Iniciar el servidor
Deno.serve(app.fetch);