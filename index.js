const http = require("http");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const INGEST_SECRET = process.env.INGEST_SECRET;

let eventos = [];
let siguienteId = 1;

function responder(res, codigo, datos) {
    res.writeHead(codigo, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify(datos));
}

function leerCuerpo(req) {
    return new Promise((resolve, reject) => {
        let cuerpo = "";

        req.on("data", parte => {
            cuerpo += parte;

            if (cuerpo.length > 100000) {
                reject(new Error("Cuerpo demasiado grande"));
                req.destroy();
            }
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(cuerpo || "{}"));
            } catch {
                reject(new Error("JSON inválido"));
            }
        });

        req.on("error", reject);
    });
}

const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/") {
        return responder(res, 200, {
            estado: "Servidor funcionando"
        });
    }

    if (req.method === "POST" && url.pathname === "/evento") {
        if (!INGEST_SECRET ||
            req.headers["x-ingest-key"] !== INGEST_SECRET) {
            return responder(res, 401, {
                error: "No autorizado"
            });
        }

        try {
            const datos = await leerCuerpo(req);

            if (
                datos.tipo !== "entrar" ||
                typeof datos.nombre !== "string" ||
                !datos.nombre.trim()
            ) {
                return responder(res, 400, {
                    error: "Evento inválido"
                });
            }

            const evento = {
                id: String(siguienteId++),
                tipo: "entrar",
                nombre: datos.nombre.trim()
            };

            eventos.push(evento);

            if (eventos.length > 1000) {
                eventos.shift();
            }

            return responder(res, 200, {
                recibido: true,
                id: evento.id
            });
        } catch {
            return responder(res, 400, {
                error: "No se pudo leer el evento"
            });
        }
    }

    if (req.method === "GET" && url.pathname === "/eventos") {
        if (!API_KEY ||
            req.headers["x-api-key"] !== API_KEY) {
            return responder(res, 401, {
                error: "No autorizado"
            });
        }

        const limite = Math.min(
            Math.max(parseInt(url.searchParams.get("limite")) || 10, 1),
            100
        );

        const desde = parseInt(
            url.searchParams.get("desde") || "0"
        ) || 0;

        const disponibles = eventos.filter(
            evento => Number(evento.id) > desde
        );

        const seleccionados = disponibles.slice(0, limite);

        const siguiente = seleccionados.length
            ? seleccionados[seleccionados.length - 1].id
            : String(desde);

        return responder(res, 200, {
            eventos: seleccionados,
            siguiente
        });
    }

    return responder(res, 404, {
        error: "Ruta no encontrada"
    });
});

servidor.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});
