// routes/estudiantes.js

const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middleware/validar-campos');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadExcel');

const {
  obtenerEstudiantes,
  crearEstudiante,
  actualizarEstudiante,
  eliminarEstudiante,
  importarEstudiantesExcel,
} = require('../controllers/controladorEstudiante');

const router = Router();

// Todas las rutas de estudiantes requieren login (admin o profesor)
router.use(authMiddleware, checkRole(['admin', 'profesor']));

// GET - Obtener todos los estudiantes
router.get('/', obtenerEstudiantes);

// POST - Crear nuevo estudiante
router.post(
  '/',
  [
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('email', 'El correo no es válido').isEmail(),
    validarCampos,
  ],
  crearEstudiante
);

// PUT - Actualizar estudiante
router.put(
  '/:id',
  [check('id', 'No es un ID válido').isMongoId(), validarCampos],
  actualizarEstudiante
);

// DELETE - Eliminar estudiante (lógica)
router.delete(
  '/:id',
  [check('id', 'No es un ID válido').isMongoId(), validarCampos],
  eliminarEstudiante
);

// IMPORTAR EXCEL (solo admin y profesor, ya está protegido por router.use)
router.post('/import-excel', upload.single('file'), importarEstudiantesExcel);

module.exports = router;
