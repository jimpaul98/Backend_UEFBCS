// controllers/controladorAnioLectivo.js
const mongoose = require('mongoose');
const AnioLectivo = require('../models/AnioLectivo');
const ErrorResponse = require('../utils/errorResponse');
const Calificacion = require('../models/Calificacion'); // ⬅ NUEVO: para calcular nota final


exports.listar = async (req, res, next) => {
  try {
    // Si tu modelo tiene "activo", mostramos solo activos; si no, mostramos todo.
    const filter = {};
    if (AnioLectivo.schema.path('activo')) filter.activo = true;

    const rows = await AnioLectivo.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ===================== OBTENER UNO =====================
exports.obtenerUno = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const doc = await AnioLectivo.findById(id).lean();
    if (!doc) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }
    res.json({ ok: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// ===================== OBTENER ACTUAL =====================
exports.obtenerActual = async (req, res, next) => {
  try {
    const filter = { actual: true };
    if (AnioLectivo.schema.path('activo')) filter.activo = true;

    const doc = await AnioLectivo.findOne(filter).lean();
    res.json({ ok: true, data: doc || null });
  } catch (err) {
    next(err);
  }
};

// ===================== CREAR =====================
exports.crear = async (req, res, next) => {
  try {
    const payload = {
      nombre: req.body?.nombre,
      fechaInicio: req.body?.fechaInicio,
      fechaFin: req.body?.fechaFin,
      actual: !!req.body?.actual,
    };

    // Validaciones básicas
    if (!payload.nombre) return next(new ErrorResponse('El nombre es obligatorio', 400));
    if (!payload.fechaInicio) return next(new ErrorResponse('La fecha de inicio es obligatoria', 400));
    if (!payload.fechaFin) return next(new ErrorResponse('La fecha de fin es obligatoria', 400));

    // Si se crea "actual: true", desmarcar otros
    if (payload.actual) {
      await AnioLectivo.updateMany({ actual: true }, { $set: { actual: false } });
    }

    const created = await AnioLectivo.create(payload);
    res.status(201).json({ ok: true, data: created });
  } catch (err) {
    // Posibles errores por índice único (nombre)
    if (err?.code === 11000) {
      return next(new ErrorResponse('Ya existe un año lectivo con ese nombre', 409));
    }
    next(err);
  }
};

// ===================== ACTUALIZAR =====================
exports.actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const body = {
      nombre: req.body?.nombre,
      fechaInicio: req.body?.fechaInicio,
      fechaFin: req.body?.fechaFin,
    };

    // Limpia undefineds
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    const updated = await AnioLectivo.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }

    res.json({ ok: true, data: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return next(new ErrorResponse('Ya existe un año lectivo con ese nombre', 409));
    }
    next(err);
  }
};

// ===================== MARCAR COMO ACTUAL (sin transacción) =====================
exports.marcarComoActual = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const target = await AnioLectivo.findById(id);
    if (!target) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }

    // Idempotencia: si ya es actual, responde OK
    if (target.actual === true) {
      return res.json({ ok: true, data: target });
    }

    // 1) Desmarcar todos los "actual"
    await AnioLectivo.updateMany({ actual: true }, { $set: { actual: false } });

    // 2) Marcar el seleccionado
    target.actual = true;
    await target.save();

    return res.json({ ok: true, data: target });
  } catch (err) {
    next(err);
  }
};

// ===================== ELIMINAR (soft si hay "activo"; hard si no existe ese campo) =====================
exports.eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse('ID inválido', 400));
    }

    const doc = await AnioLectivo.findById(id);
    if (!doc) {
      return next(new ErrorResponse('Año lectivo no encontrado', 404));
    }

    if (AnioLectivo.schema.path('activo')) {
      // Soft delete
      if (doc.activo === false) {
        return res.json({ ok: true, data: doc }); // ya estaba inactivo
      }
      doc.activo = false;
      await doc.save();
      return res.json({ ok: true, data: doc });
    } else {
      // Eliminación definitiva
      await AnioLectivo.deleteOne({ _id: id });
      return res.json({ ok: true, data: { _id: id } });
    }
  } catch (err) {
    next(err);
  }
};

// ===================== NOTA FINAL DEL ESTUDIANTE (NUEVO) =====================
// GET /api/aniolectivo/:anioId/curso/:cursoId/estudiante/:estId/nota-final
// Calcula la nota final del estudiante en ese año lectivo y curso
exports.obtenerNotaFinalEstudiante = async (req, res, next) => {
  try {
    const { anioId, cursoId } = req.params;
    const estudianteId = req.params.estId || req.params.estudianteId; // soporta ambos nombres

    // Validar IDs
    if (!mongoose.Types.ObjectId.isValid(anioId)) {
      return next(new ErrorResponse('anioId inválido', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(cursoId)) {
      return next(new ErrorResponse('cursoId inválido', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(estudianteId)) {
      return next(new ErrorResponse('estudianteId inválido', 400));
    }

    // Buscar todas las calificaciones del estudiante en ese año y curso
    const calificaciones = await Calificacion.find({
      anioLectivoId: anioId,
      cursoId: cursoId,
      estudianteId: estudianteId,
    }).lean();

    if (!calificaciones || calificaciones.length === 0) {
      return next(new ErrorResponse('No hay calificaciones registradas para ese estudiante', 404));
    }

    // Inicializar resumen por trimestre
    const trimestres = { T1: null, T2: null, T3: null };
    let suma = 0;
    let conteo = 0;

    for (const c of calificaciones) {
      // Asumimos que el campo trimestre es algo como 'T1', 'T2', 'T3'
      if (c.trimestre && trimestres.hasOwnProperty(c.trimestre)) {
        trimestres[c.trimestre] = c.promedioTrimestral;
      }
      if (c.promedioTrimestral != null) {
        suma += c.promedioTrimestral;
        conteo++;
      }
    }

    const notaFinal = conteo > 0 ? Number((suma / conteo).toFixed(2)) : null;

    return res.json({
      ok: true,
      data: {
        anioLectivoId: anioId,
        cursoId,
        estudianteId,
        notaFinal,
        detalle: trimestres,
      },
    });
  } catch (err) {
    next(err);
  }
};
