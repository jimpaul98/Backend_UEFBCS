// config/db.js

const mongoose = require('mongoose');

const conectarDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI no está definido en las variables de entorno');
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Error de conexión a la base de datos: ${err.message}`);
    process.exit(1);
  }
};

module.exports = conectarDB;
