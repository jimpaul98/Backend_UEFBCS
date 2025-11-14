// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const asyncHandler = require('./asyncHandler');

// ===============================
//  Verificar JWT
// ===============================
exports.authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado. Falta token.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(decoded.id)
      .select('_id nombre rol cedula correo')
      .lean();

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado.',
      });
    }

    // Guardamos en req.usuario y req.user (compatibilidad)
    req.usuario = {
      id: usuario._id,
      rol: usuario.rol,
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      email: usuario.correo,
    };

    req.user = req.usuario;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado.',
    });
  }
});

// ===============================
//  Verificar Rol
// ===============================
exports.checkRole = (roles) => (req, res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) {
    return res.status(403).json({
      success: false,
      error: `Acceso denegado. Rol (${req.usuario?.rol || 'No logueado'}) sin permisos.`,
    });
  }
  next();
};
