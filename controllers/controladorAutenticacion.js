// controllers/controladorAutenticacion.js

const Usuario = require('../models/Usuario');
const ErrorResponse = require('../utils/errorResponse');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ===========================
//  UTILIDADES
// ===========================

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Enviar respuesta con token JWT
const sendTokenResponse = (usuario, statusCode, res) => {
  const token = usuario.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    datos: {
      id: usuario._id,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
  });
};

// Enviar correo
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(message);
};

// ===========================
//  ENDPOINTS
// ===========================

// @desc    Registrar usuario
// @route   POST /api/autenticacion/registrar
exports.registrarUsuario = async (req, res, next) => {
  const { nombre, correo, clave, rol } = req.body;

  try {
    const usuario = await Usuario.create({
      nombre,
      correo,
      clave,
      rol: rol || 'estudiante',
    });

    sendTokenResponse(usuario, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Iniciar Sesión
// @route   POST /api/autenticacion/iniciarSesion
exports.iniciarSesion = async (req, res, next) => {
  const { correo, clave } = req.body;

  if (!correo || !clave) {
    return next(
      new ErrorResponse(
        'Por favor, proporciona un correo y una contraseña',
        400
      )
    );
  }

  try {
    const usuario = await Usuario.findOne({ correo }).select('+clave');

    if (!usuario) {
      return next(new ErrorResponse('Credenciales inválidas', 401));
    }

    const isMatch = await usuario.getPasswordMatch(clave);

    if (!isMatch) {
      return next(new ErrorResponse('Credenciales inválidas', 401));
    }

    sendTokenResponse(usuario, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Enviar correo de recuperación de contraseña
// @route   POST /api/autenticacion/recuperarContrasena
exports.recuperarContrasena = async (req, res, next) => {
  const { correo } = req.body;

  try {
    const usuario = await Usuario.findOne({ correo });

    if (!usuario) {
      console.log('DIAGNÓSTICO: Usuario NO encontrado.');
      // No filtramos si el correo existe o no
      return res.status(200).json({
        success: true,
        data: 'Instrucciones enviadas al correo si existe.',
      });
    }

    const resetToken = usuario.getResetPasswordToken();
    await usuario.save({ validateBeforeSave: false });

    const resetUrl = `${FRONTEND_URL}/restablecer-contrasena/${resetToken}`;

    const message = `
      <h1>Solicitud de Restablecimiento de Contraseña</h1>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
      <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
      <p>Este enlace expirará en 10 minutos. Si no solicitaste este cambio, ignora este correo.</p>
    `;

    await sendEmail({
      email: usuario.correo,
      subject: 'Restablecimiento de Contraseña (Sistema de Calificaciones)',
      message,
    });

    res.status(200).json({
      success: true,
      data: 'Instrucciones enviadas al correo.',
    });
  } catch (error) {
    console.error('Error al enviar correo:', error);

    // Limpiar token si el envío falla
    if (usuario) {
      usuario.resetPasswordToken = undefined;
      usuario.resetPasswordExpire = undefined;
      await usuario.save({ validateBeforeSave: false });
    }

    return next(
      new ErrorResponse(
        'Error al intentar enviar el correo. Verifica las credenciales en .env',
        500
      )
    );
  }
};

// @desc    Restablecer contraseña
// @route   PUT /api/autenticacion/restablecerContrasena/:resetToken
exports.restablecerContrasena = async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  try {
    const usuario = await Usuario.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // Token no expirado
    });

    if (!usuario) {
      return next(new ErrorResponse('Token inválido o expirado.', 400));
    }

    usuario.clave = req.body.clave;
    usuario.resetPasswordToken = undefined;
    usuario.resetPasswordExpire = undefined;

    await usuario.save();

    sendTokenResponse(usuario, 200, res);
  } catch (err) {
    next(err);
  }
};
