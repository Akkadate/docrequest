const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

// ตรวจสอบและสร้างโฟลเดอร์ถ้ายังไม่มี
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// สร้างการเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // สร้างโฟลเดอร์ตามวันที่
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const uploadPath = path.join(uploadDir, `${year}${month}`);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // สร้างชื่อไฟล์ด้วย uuid และนามสกุลดั้งเดิม
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    cb(null, fileName);
  }
});

// ฟิลเตอร์ประเภทไฟล์
const fileFilter = (req, file, cb) => {
  // อนุญาตเฉพาะไฟล์ PDF, JPG, JPEG, PNG
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต เฉพาะ PDF, JPG, JPEG, PNG เท่านั้น'), false);
  }
};

// สร้าง Multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // จำกัดขนาด 5MB
  },
});

// Middleware จัดการข้อผิดพลาดของ Multer
const handleUploadErrors = (req, res, next) => {
  return (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      // ข้อผิดพลาดของ Multer
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error_msg', 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)');
      } else {
        req.flash('error_msg', `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}`);
      }
      logger.error(`Multer error: ${err.code} - ${err.message}`);
    } else if (err) {
      // ข้อผิดพลาดอื่นๆ
      req.flash('error_msg', err.message);
      logger.error(`Upload error: ${err.message}`);
    }
    
    // กลับไปหน้าเดิม
    return res.redirect('back');
  };
};

module.exports = {
  upload,
  handleUploadErrors
};
