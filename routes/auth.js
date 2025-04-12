const express = require('express');
const router = express.Router();
const passport = require('passport');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { forwardAuthenticated, ensureAuthenticated } = require('../middleware/auth');
const { validateLogin, validateAdminLogin, validateRegister, validatePasswordChange } = require('../middleware/validation');

// หน้าเข้าสู่ระบบนักศึกษา
//router.get('/login', forwardAuthenticated, authController.getLoginPage);
router.get('/auth/login', forwardAuthenticated, authController.getLoginPage);

// หน้าเข้าสู่ระบบเจ้าหน้าที่
router.get('/admin/login', forwardAuthenticated, authController.getAdminLoginPage);

// หน้าลงทะเบียนนักศึกษา (ใช้ในสภาพแวดล้อมการพัฒนา)
router.get('/register', forwardAuthenticated, authController.getRegisterPage);

// ดำเนินการเข้าสู่ระบบนักศึกษา
router.post('/login', validateLogin, authController.postLogin);

// ดำเนินการเข้าสู่ระบบเจ้าหน้าที่
router.post('/admin/login', validateAdminLogin, authController.postAdminLogin);

// ดำเนินการลงทะเบียนนักศึกษา
router.post('/register', validateRegister, authController.postRegister);

// ออกจากระบบ
router.get('/logout', authController.logout);

// เปลี่ยนรหัสผ่าน
router.post('/change-password', ensureAuthenticated, validatePasswordChange, authController.changePassword);

// รีเซ็ตรหัสผ่านนักศึกษา (สำหรับเจ้าหน้าที่)
router.post('/admin/reset-student-password/:id', ensureAuthenticated, authController.resetStudentPassword);

module.exports = router;
