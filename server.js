// server.js
process.env.DOTENV_CONFIG_SILENT = "true";
require("dotenv/config");
const express = require("express");
const cors = require("cors");
const conectarDB = require("./config/db");
const errorHandler = require("./middleware/error");

const app = express();

// =======================
//  CORS CONFIG
// =======================
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:4200";

const corsOptions = {
  origin: FRONTEND_ORIGIN,
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
    app.listen(PUERTO, () => {
      console.log(`✅ Servidor ejecutándose en el puerto ${PUERTO}`);
    });
  } catch (err) {
    console.error("❌ Error iniciando servidor:", err.message);
    process.exit(1);
  }
};

startServer();
