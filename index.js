const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:21213/");

ws.on("open", () => {
    console.log("Conectado a TikFinity");
    console.log("Esperando comentarios...");
});

ws.on("message", (raw) => {
    try {
        const evento = JSON.parse(raw.toString());
console.log("EVENTO COMPLETO:", raw.toString());
        if (evento.event === "chat") {
            const comentario = evento.data?.comment;

            if (comentario) {
                console.log("Comentario recibido: " + comentario);
            }
        }
    } catch (error) {
        console.log("No se pudo leer el evento.");
    }
});

ws.on("error", (error) => {
    console.log("Error de conexión: " + error.message);
});

ws.on("close", () => {
    console.log("Conexión cerrada.");
});