// routes/usuarios.js

const express = require('express');
const router = express.Router();

const { validarCampos } = require('../middleware/validar-campos');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

const {
  getUsuarios,
  getUsuario,
  getUsuariosPorRolProfesor,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  getPerfil,
  importUsuariosExcel,
} = require('../controllers/controladorUsuario');

// ---------------------------------------------------
// PERFIL DEL USUARIO LOGUEADO
// GET /api/usuarios/me
// ---------------------------------------------------
router.get('/me', [authMiddleware], getPerfil);

// ---------------------------------------------------
// PROFESORES
// /api/usuarios/profesores
// ---------------------------------------------------
router.get(
  '/profesores',
  [authMiddleware, checkRole(['admin', 'profesor']), validarCampos],
  getUsuariosPorRolProfesor
);

// ---------------------------------------------------
// CRUD GENERAL
// /api/usuarios
// ---------------------------------------------------
router
  .route('/')
  .get(authMiddleware, checkRole(['admin', 'profesor']), getUsuarios)
  .post(authMiddleware, checkRole(['admin']), crearUsuario);

router
  .route('/:id')
  .get(authMiddleware, checkRole(['admin']), getUsuario)
  .put(authMiddleware, checkRole(['admin']), actualizarUsuario)
  .delete(authMiddleware, checkRole(['admin']), eliminarUsuario);

// ---------------------------------------------------
// IMPORTAR USUARIOS DESDE EXCEL
// Protegido solo para admin
// ---------------------------------------------------
const upload = require('../middleware/uploadExcel');

router.post(
  '/import-excel',
  authMiddleware,
  checkRole(['admin']),
  upload.single('file'),
  importUsuariosExcel
);

module.exports = router;
