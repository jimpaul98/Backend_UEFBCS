// server.js
process.env.DOTENV_CONFIG_SILENT = "true";
require("dotenv/config");
const express = require("express");
const cors = require("cors");
const conectarDB = require("./config/db");
const errorHandler = require("./middleware/error");

const app = express();

// =======================
//  SECURITY & PERFORMANCE
// =======================
const compression = require("compression");
const helmet = require("helmet");

app.use(compression());
app.use(helmet());

// =======================
//  CORS CONFIG
// =======================

// Origins permitidos en desarrollo
const allowedOrigins = [
  "http://192.168.0.10:4200", // <--- Poner aquí la IP de tu VPS. Ejemplo: "http://45.23.12.89:4200"
  "http://localhost:4200"      // (Opcional) Mantenlo si quieres seguir probando desde tu PC
];

const corsOptions = {
  origin: function (origin, callback) {
    // Eliminamos '!origin'. Ahora si no hay origen (Postman), se bloquea.
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Bloqueado (IP no autorizada o herramienta externa):", origin);
      callback(new Error("Acceso denegado: Solo se permite la IP autorizada."));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));


// =======================
//  MIDDLEWARES
// =======================
app.use(express.json());

// =======================
//  RUTAS
// =======================
app.use("/api/autenticacion", require("./routes/autenticacion"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/estudiantes", require("./routes/estudiantes"));
app.use("/api/cursos", require("./routes/cursos"));
app.use("/api/calificaciones", require("./routes/calificaciones"));
app.use("/api/asistencias", require("./routes/asistencias"));
app.use("/api/materias", require("./routes/materia"));
app.use("/api/aniolectivo", require("./routes/anios-lectivos"));
app.use("/api/profesor", require("./routes/profesor"));
app.use("/api/reportes", require("./routes/reportes"));

// =======================
//  ROOT / HEALTHCHECK
// =======================
app.get("/", (req, res) =>
  res.send("API de Gestión de Calificaciones en funcionamiento!")
);

// =======================
//  MANEJO GLOBAL DE ERRORES
// =======================
app.use(errorHandler);

// =======================
//  ARRANQUE DEL SERVIDOR
// =======================
const PUERTO = process.env.PUERTO || 5000;

const startServer = async () => {
  try {
    await conectarDB();
    app.listen(PUERTO, "0.0.0.0", () => {
      console.log(`✅ Servidor ejecutándose en http://0.0.0.0:${PUERTO}`);
    });
  } catch (err) {
    console.error("❌ Error iniciando servidor:", err.message);
    process.exit(1);
  }
};

startServer();
