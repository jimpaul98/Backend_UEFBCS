// routes/cursos.js
const express = require('express');
const router = express.Router();

const {
  getAllCursos,
  getOneById,
  createCurso,
  updateCurso,
  deleteCurso,
  limpiarEstudiantesCurso,  
} = require('../controllers/controladorCurso');

const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// Listar cursos
router.get(
  '/',
  authMiddleware,
  checkRole(['admin', 'profesor']),
  getAllCursos
);

// Obtener curso por ID
router.get(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'profesor']),
  getOneById
);

// Crear curso
router.post(
  '/',
  authMiddleware,
  checkRole(['admin']),
  createCurso
);

// Actualizar curso
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin']),
  updateCurso
);

// Eliminar curso
router.delete(
  '/:id',
  authMiddleware,
  checkRole(['admin']),
  deleteCurso
);

// ✅ NUEVA RUTA: limpiar estudiantes del curso (para nuevo año lectivo)
router.put(
  '/:id/limpiar-estudiantes',
  authMiddleware,
  checkRole(['admin']),
  limpiarEstudiantesCurso
);

module.exports = router;
