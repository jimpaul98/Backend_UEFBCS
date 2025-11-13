// routes/anios-lectivos.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/controladorAnioLectivo');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// ===================== Lecturas =====================
router.get('/', authMiddleware, checkRole(['admin']), ctrl.listar);
router.get('/actual', authMiddleware, checkRole(['admin', 'profesor']), ctrl.obtenerActual);
router.get('/:id', authMiddleware, checkRole(['admin']), ctrl.obtenerUno);

// 👇 RUTA AÑADIDA
router.get(
  '/:anioId/curso/:cursoId/estudiante/:estId/nota-final',
  authMiddleware,
  checkRole(['admin', 'profesor']),
  ctrl.obtenerNotaFinalEstudiante
);
// 👆 RUTA AÑADIDA

// ===================== Crear / Actualizar =====================
router.post('/', authMiddleware, checkRole(['admin']), ctrl.crear);
router.put('/:id', authMiddleware, checkRole(['admin']), ctrl.actualizar);

// ===================== Marcar como actual =====================
// Mantén PATCH como endpoint "semántico" correcto…
router.patch('/:id/actual', authMiddleware, checkRole(['admin']), ctrl.marcarComoActual);
// …y añade alias PUT para tu frontend (según la llamada que estás haciendo)
router.put('/:id/actual', authMiddleware, checkRole(['admin']), ctrl.marcarComoActual);

// ===================== Eliminar (soft o hard) =====================
router.delete('/:id', authMiddleware, checkRole(['admin']), ctrl.eliminar);

module.exports = router;