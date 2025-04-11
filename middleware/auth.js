// Middleware สำหรับตรวจสอบการเข้าสู่ระบบ
const { logger } = require('../utils/logger');

module.exports = {
  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    
    req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน');
    logger.info(`ผู้ใช้พยายามเข้าถึงหน้าที่ต้องเข้าสู่ระบบ: ${req.originalUrl}`);
    res.redirect('/login');
  },
  
  // ตรวจสอบว่าผู้ใช้ยังไม่ได้เข้าสู่ระบบ
  forwardAuthenticated: (req, res, next) => {
    if (!req.isAuthenticated()) {
      return next();
    }
    
    // ถ้าเป็นเจ้าหน้าที่ให้ไปที่หน้าแดชบอร์ด
    if (req.user.isStaff) {
      res.redirect('/admin/dashboard');
    } else {
      // ถ้าเป็นนักศึกษาให้ไปที่หน้าหลัก
      res.redirect('/student/main-menu');
    }
  },
  
  // ตรวจสอบว่าผู้ใช้เป็นเจ้าหน้าที่
  ensureStaff: (req, res, next) => {
    if (req.isAuthenticated() && req.user.isStaff) {
      return next();
    }
    
    logger.warn(`ผู้ใช้พยายามเข้าถึงหน้าเฉพาะเจ้าหน้าที่: ${req.originalUrl}`);
    req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
    res.redirect('/');
  },
  
  // ตรวจสอบว่าผู้ใช้เป็นนักศึกษา
  ensureStudent: (req, res, next) => {
    if (req.isAuthenticated() && !req.user.isStaff) {
      return next();
    }
    
    logger.warn(`ผู้ใช้พยายามเข้าถึงหน้าเฉพาะนักศึกษา: ${req.originalUrl}`);
    req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
    res.redirect('/');
  }
};
