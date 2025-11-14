// controllers/controladorUsuario.js

const Usuario = require('../models/Usuario');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { request, response } = require('express');
const XLSX = require('xlsx');

// =======================================================
// Helpers y constantes
// =======================================================

const ROLES_VALIDOS = new Set(['profesor', 'admin', 'estudiante']);

const emailValido = (s) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
    String(s || '').toLowerCase()
  );

const isCedula = (s) => /^\d{8,13}$/.test(String(s || '').trim());

// =======================================================
// PERFIL DEL USUARIO LOGUEADO
// GET /api/usuarios/me
// =======================================================

exports.getPerfil = asyncHandler(
  async (req = request, res = response, next) => {
    const usuarioId = req.usuario?.id || req.user?.id;

    const usuario = await Usuario.findById(usuarioId).select('-clave');

    if (!usuario) {
      return next(new ErrorResponse('Usuario logueado no encontrado', 404));
    }

    res.status(200).json({ ok: true, usuario });
  }
);

// =======================================================
// OBTENER USUARIOS POR ROL PROFESOR
// GET /api/usuarios/profesores
// =======================================================

exports.getUsuariosPorRolProfesor = asyncHandler(
  async (req = request, res = response) => {
    const profesores = await Usuario.find({ rol: 'profesor' }).select(
      'nombre correo cedula rol'
    );

    res.status(200).json({
      ok: true,
      total: profesores.length,
      usuarios: profesores,
    });
  }
);

// =======================================================
// OBTENER TODOS LOS USUARIOS
// GET /api/usuarios
// =======================================================

exports.getUsuarios = asyncHandler(
  async (req = request, res = response) => {
    const usuarios = await Usuario.find();

    res.status(200).json({
      ok: true,
      total: usuarios.length,
      usuarios,
    });
  }
);

// =======================================================
// OBTENER UN USUARIO POR ID
// GET /api/usuarios/:id
// =======================================================

exports.getUsuario = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const usuario = await Usuario.findById(id);

  if (!usuario) {
    return next(
      new ErrorResponse(`Usuario no encontrado con id ${id}`, 404)
    );
  }

  res.status(200).json({ ok: true, usuario });
});

// =======================================================
// CREAR USUARIO
// POST /api/usuarios
// =======================================================

exports.crearUsuario = asyncHandler(async (req, res, next) => {
  // Evitamos que el cliente pueda forzar estos campos
  const {
    _id,
    fechaCreacion,
    resetPasswordToken,
    resetPasswordExpire,
    ...body
  } = req.body;

  const nombre = String(body.nombre || '').trim();
  const cedula = String(body.cedula || '').trim();
  const correo = String(body.correo || body.email || '')
    .trim()
    .toLowerCase();
  const rolRaw = String(body.rol || 'profesor').toLowerCase();
  const rol = ROLES_VALIDOS.has(rolRaw) ? rolRaw : 'profesor';
  const clave = String(body.clave || '').trim();

  // Validaciones básicas
  if (!nombre) {
    return next(new ErrorResponse('El nombre es obligatorio', 400));
  }

  if (!isCedula(cedula)) {
    return next(
      new ErrorResponse('Cédula inválida (debe tener 8–13 dígitos)', 400)
    );
  }

  if (!emailValido(correo)) {
    return next(new ErrorResponse('Correo inválido', 400));
  }

  if (!clave || clave.length < 6) {
    return next(
      new ErrorResponse(
        'La clave debe tener al menos 6 caracteres',
        400
      )
    );
  }

  // Comprobar duplicados
  const clashCedula = await Usuario.findOne({ cedula }).lean();
  if (clashCedula) {
    return next(new ErrorResponse('La cédula ya está registrada', 400));
  }

  const clashCorreo = await Usuario.findOne({ correo }).lean();
  if (clashCorreo) {
    return next(new ErrorResponse('El correo ya está registrado', 400));
  }

  const usuario = new Usuario({
    nombre,
    cedula,
    correo,
    clave,
    rol,
  });

  await usuario.save();

  res.status(201).json({ ok: true, usuario });
});

// =======================================================
// ACTUALIZAR USUARIO
// PUT /api/usuarios/:id
// =======================================================

exports.actualizarUsuario = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const {
    _id,
    fechaCreacion,
    resetPasswordToken,
    resetPasswordExpire,
    ...body
  } = req.body;

  const usuario = await Usuario.findById(id);

  if (!usuario) {
    return next(
      new ErrorResponse(`Usuario no encontrado con id ${id}`, 404)
    );
  }

  const nextNombre = body.nombre?.trim();
  const nextCedula = body.cedula?.trim();
  const nextCorreo = body.correo?.trim()?.toLowerCase();
  const nextRolRaw = body.rol?.toLowerCase();
  const nextRol =
    nextRolRaw && ROLES_VALIDOS.has(nextRolRaw) ? nextRolRaw : undefined;
  const nextClave = body.clave?.trim();

  // Validar y actualizar cédula
  if (nextCedula !== undefined) {
    if (!isCedula(nextCedula)) {
      return next(
        new ErrorResponse('Cédula inválida (debe tener 8–13 dígitos)', 400)
      );
    }

    const clashCedula = await Usuario.findOne({
      cedula: nextCedula,
      _id: { $ne: id },
    }).lean();

    if (clashCedula) {
      return next(new ErrorResponse('La cédula ya está registrada', 400));
    }

    usuario.cedula = nextCedula;
  }

  // Validar y actualizar correo
  if (nextCorreo !== undefined) {
    if (!emailValido(nextCorreo)) {
      return next(new ErrorResponse('Correo inválido', 400));
    }

    const clashCorreo = await Usuario.findOne({
      correo: nextCorreo,
      _id: { $ne: id },
    }).lean();

    if (clashCorreo) {
      return next(new ErrorResponse('El correo ya está registrado', 400));
    }

    usuario.correo = nextCorreo;
  }

  // Otros campos
  if (nextNombre !== undefined) usuario.nombre = nextNombre;
  if (nextRol !== undefined) usuario.rol = nextRol;

  // Actualizar clave si viene y es suficientemente larga
  if (nextClave && nextClave.length >= 6) {
    usuario.clave = nextClave; // el pre('save') se encargará de hashearla
  }

  await usuario.save();

  res.status(200).json({ ok: true, usuario });
});

// =======================================================
// ELIMINAR USUARIO
// DELETE /api/usuarios/:id
// =======================================================

exports.eliminarUsuario = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const usuario = await Usuario.findByIdAndDelete(id);

  if (!usuario) {
    return next(
      new ErrorResponse(`Usuario no encontrado con id ${id}`, 404)
    );
  }

  res.status(200).json({
    ok: true,
    msg: 'Usuario eliminado correctamente',
  });
});

// =======================================================
// IMPORTAR USUARIOS DESDE EXCEL
// POST /api/usuarios/import-excel
// (usa multer memoryStorage en uploadExcel)
// =======================================================

exports.importUsuariosExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: 'Falta archivo (field: file)',
      });
    }

    // Modo simulación (no guarda en DB) -> /import-excel?dryRun=true
    const dryRun = String(req.query.dryRun || 'false') === 'true';

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames?.[0];

    if (!sheetName) {
      return res.status(400).json({
        ok: false,
        message: 'El archivo Excel no contiene hojas',
      });
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
    });

    const summary = {
      total: rows.length,
      created: 0,
      skipped: 0,
      errors: 0,
    };

    const detail = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowNumber = i + 2; // Asumiendo que fila 1 es encabezado

      // Normalizar nombres de columnas a minúsculas
      const norm = {};
      for (const key of Object.keys(raw)) {
        norm[String(key).trim().toLowerCase()] = raw[key];
      }

      const nombre = String(norm.nombre || norm.nombres || '').trim();
      const cedula = String(norm.cedula || norm.ci || norm.dni || '').trim();
      const correo = String(norm.correo || norm.email || '')
        .trim()
        .toLowerCase();
      const clave = String(norm.clave || norm.password || '').trim();
      const rolRaw = String(norm.rol || 'profesor').trim().toLowerCase();
      const rol = ROLES_VALIDOS.has(rolRaw) ? rolRaw : 'profesor';

      // Validaciones por fila
      if (!nombre || !isCedula(cedula) || !emailValido(correo)) {
        summary.errors++;
        detail.push({
          row: rowNumber,
          status: 'error',
          error: 'Campos inválidos o incompletos (nombre/cedula/correo)',
          cedula,
          correo,
        });
        continue;
      }

      const byCedula = await Usuario.findOne({ cedula }).lean();
      if (byCedula) {
        summary.skipped++;
        detail.push({
          row: rowNumber,
          status: 'skipped',
          cedula,
          correo,
          reason: 'Cédula ya existe',
        });
        continue;
      }

      const byCorreo = await Usuario.findOne({ correo }).lean();
      if (byCorreo) {
        summary.skipped++;
        detail.push({
          row: rowNumber,
          status: 'skipped',
          cedula,
          correo,
          reason: 'Correo ya existe',
        });
        continue;
      }

      if (!clave || clave.length < 6) {
        summary.errors++;
        detail.push({
          row: rowNumber,
          status: 'error',
          cedula,
          correo,
          error: 'Falta clave o es muy corta (mínimo 6 caracteres)',
        });
        continue;
      }

      if (!dryRun) {
        const user = new Usuario({
          nombre,
          cedula,
          correo,
          clave,
          rol,
        });
        await user.save();
      }

      summary.created++;
      detail.push({
        row: rowNumber,
        status: 'created',
        cedula,
        correo,
      });
    }

    res.json({ ok: true, summary, rows: detail, dryRun });
  } catch (err) {
    // Error de índice único
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || 'campo único';
      return res.status(400).json({
        ok: false,
        msg: `Duplicado: ${key}`,
      });
    }

    console.error('Error importando usuarios:', err);
    res.status(500).json({
      ok: false,
      message: 'Error importando usuarios',
      error: err.message,
    });
  }
};
