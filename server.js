require("dotenv").config();
const express  = require("express");
const session  = require("express-session");
const mongoose = require("mongoose");
const path     = require("path");

const app     = express();
const PUERTO  = process.env.PORT || 3000;
const PRIVATE = path.join(__dirname, "private");

const ADMIN_USUARIO = process.env.ADMIN_USER     || "admin";
const ADMIN_CLAVE   = process.env.ADMIN_PASS     || "jx2026";
const MONGODB_URI   = process.env.MONGODB_URI;

// ── Conexión MongoDB ──
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB conectado"))
    .catch(err => { console.error("❌ MongoDB error:", err); process.exit(1); });
} else {
  console.warn("⚠️  MONGODB_URI no definida — agrega tu URI en el archivo .env");
}

// ── Esquema ──
const RegistroSchema = new mongoose.Schema({
  nombre:    { type: String, required: true },
  apellido:  { type: String, required: true },
  correo:    { type: String, required: true },
  telefono:  { type: String, required: true },
  documento: { type: String, required: true, unique: true },
  edad:      { type: Number, required: true },
  genero:    { type: String, default: "" },
  fecha:     { type: String },
}, { versionKey: false });

const Registro = mongoose.model("Registro", RegistroSchema);

// ── Middlewares ──
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "secreto-cambiar",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 2 }
}));
app.use(express.static(path.join(__dirname, "public")));

// ── Auth ──
function soloAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ mensaje: "No autorizado" });
}
function soloAdminHTML(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.redirect("/jx-backend");
}

// ─────────────────────────────────────────
//  RUTAS ADMIN
// ─────────────────────────────────────────

app.get("/jx-backend", (req, res) => {
  if (req.session?.isAdmin) return res.redirect("/jx-backend/panel");
  res.sendFile(path.join(PRIVATE, "login.html"));
});

app.get("/jx-backend/panel", soloAdminHTML, (req, res) => {
  res.sendFile(path.join(PRIVATE, "panel.html"));
});

// ─────────────────────────────────────────
//  API PÚBLICA
// ─────────────────────────────────────────

app.post("/api/registros", async (req, res) => {
  try {
    const { nombre, apellido, correo, telefono, documento, edad, genero } = req.body;

    if (!nombre || !apellido || !correo || !telefono || !documento || !edad || !genero) {
      return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }

    // Verificar duplicado por documento O correo
    const existente = await Registro.findOne({
      $or: [{ documento }, { correo }]
    });

    if (existente) {
      return res.status(409).json({
        mensaje: "Usted ya se encuentra registrado en nuestra base de datos.",
        duplicado: true
      });
    }

    const nuevo = new Registro({
      nombre, apellido, correo, telefono, documento,
      edad: Number(edad),
      genero,
      fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    });

    await nuevo.save();
    console.log("📥 Nuevo registro:", nombre, apellido);
    res.status(201).json({ mensaje: "Registro guardado correctamente" });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ mensaje: "Usted ya se encuentra registrado en nuestra base de datos.", duplicado: true });
    }
    console.error(err);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// ─────────────────────────────────────────
//  API PROTEGIDA
// ─────────────────────────────────────────

app.get("/api/registros", soloAdmin, async (req, res) => {
  try {
    const registros = await Registro.find().sort({ _id: 1 });
    res.json(registros);
  } catch {
    res.status(500).json({ mensaje: "Error al obtener registros" });
  }
});

app.delete("/api/registros/:id", soloAdmin, async (req, res) => {
  try {
    const eliminado = await Registro.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ mensaje: "Registro no encontrado" });
    console.log(`🗑️  Eliminado: ${eliminado.nombre} ${eliminado.apellido}`);
    res.json({ mensaje: "Registro eliminado correctamente" });
  } catch {
    res.status(500).json({ mensaje: "Error al eliminar" });
  }
});

app.post("/api/login", (req, res) => {
  const { usuario, clave } = req.body;
  if (usuario === ADMIN_USUARIO && clave === ADMIN_CLAVE) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── Iniciar ──
app.listen(PUERTO, () => {
  console.log(`✅  Servidor en   http://localhost:${PUERTO}`);
  console.log(`🔐  Backend JX:   http://localhost:${PUERTO}/jx-backend`);
});
