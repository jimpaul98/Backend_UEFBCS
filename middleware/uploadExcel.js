// middleware/uploadExcel.js

const multer = require('multer');
const path = require('path');

// Usamos memoria (buffer) para que el controlador lea el Excel con XLSX
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const allowed = ['.xls', '.xlsx'];

  if (!allowed.includes(ext)) {
    return cb(
      new Error('Solo se permiten archivos Excel (.xls, .xlsx)'),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;
