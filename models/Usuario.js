// models/Usuario.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    cedula: {
      type: String,
      required: [true, 'La cédula es obligatoria'],
      unique: true,
      trim: true,
      minlength: [8, 'La cédula debe tener al menos 8 dígitos'],
      maxlength: [13, 'La cédula debe tener como máximo 13 dígitos'],
    },
    correo: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Correo inválido',
      ],
    },
    clave: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false,
    },
    rol: {
      type: String,
      enum: ['admin', 'profesor', 'estudiante'],
      default: 'profesor',
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
  }
);

// 🔴 Ya no definimos índices adicionales aquí

// Encriptar contraseña antes de guardar
UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('clave')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.clave = await bcrypt.hash(this.clave, salt);
  next();
});

// Firmar JWT
UsuarioSchema.methods.getSignedJwtToken = function () {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET no está definido en las variables de entorno'
    );
  }

  return jwt.sign(
    {
      id: this._id,
      rol: this.rol,
      correo: this.correo,
      cedula: this.cedula,
      nombre: this.nombre,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '1h',
    }
  );
};

// Comparar contraseñas
UsuarioSchema.methods.getPasswordMatch = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.clave);
};

// Generar token de reseteo de contraseña
UsuarioSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('Usuario', UsuarioSchema);
