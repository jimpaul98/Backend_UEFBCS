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
//  CORS CONFIG (ADAPTADO PARA RENDER)
// =======================

// Lista blanca dinámica
const allowedOrigins = [
  process.env.FRONTEND_URL  
];

const corsOptions = {
  origin: function (origin, callback) {
    // 1. Permitir peticiones sin origen (como Postman, Mobile Apps o cURL)
    if (!origin) return callback(null, true);

    // 2. Comprobar si el origen está en la lista blanca
    if (allowedOrigins.indexOf(origin) !== -1 || !process.env.FRONTEND_URL) {
      // !process.env.FRONTEND_URL permite todo si olvidaste configurar la variable (modo seguro para evitar bloqueos iniciales)
      callback(null, true);
    } else {
      console.log("❌ Bloqueado por CORS:", origin);
      callback(new Error("Acceso denegado por CORS"));
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
// CAMBIO IMPORTANTE: Render usa la variable PORT, no PUERTO
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await conectarDB();
    // En la nube no hace falta especificar "0.0.0.0", pero no hace daño dejarlo.
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error iniciando servidor:", err.message);
    process.exit(1);
  }
};

startServer();