const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const db = require('../config/database');
const { logger } = require('../utils/logger');
const { forwardAuthenticated } = require('../middleware/auth');

// Add this to your routes/student.js file---------------------------------
const { ensureAuthenticated, ensureStudent } = require('../middleware/auth');
const studentController = require('../controllers/studentController');
// -----------------------------------------
// Main menu route
router.get('/main-menu', ensureAuthenticated, ensureStudent, studentController.getMainMenu);

router.get('/profile', ensureAuthenticated, ensureStudent, studentController.getProfile);
//router.post('/profile', ensureAuthenticated, ensureStudent, validateProfile, studentController.updateProfile);
router.get('/select-document', ensureAuthenticated, ensureStudent, studentController.getSelectDocument);
router.get('/request-form/:type', ensureAuthenticated, ensureStudent, studentController.getRequestForm);
//router.post('/submit-request', ensureAuthenticated, ensureStudent, upload.array('attachments'), validateDocumentRequest, studentController.submitRequest);
router.get('/document-history', ensureAuthenticated, ensureStudent, studentController.getDocumentHistory);
router.get('/track-status', ensureAuthenticated, ensureStudent, studentController.getTrackStatus);
router.get('/payment/:reference', ensureAuthenticated, ensureStudent, studentController.getPaymentPage);
//router.post('/payment/:reference', ensureAuthenticated, ensureStudent, upload.single('paymentSlip'), validatePayment, studentController.submitPayment);
//router.post('/cancel-request/:id', ensureAuthenticated, ensureStudent, validateCancellation, studentController.cancelRequest);
router.get('/duplicate-request/:id', ensureAuthenticated, ensureStudent, studentController.duplicateRequest);
//-------------------------------------------------------------------------

// หน้าเข้าสู่ระบบนักศึกษา
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('login', {
    title: 'เข้าสู่ระบบนักศึกษา',
    layout: 'layouts/auth'
  });
});

// หน้าเข้าสู่ระบบเจ้าหน้าที่
router.get('/admin/login', forwardAuthenticated, (req, res) => {
  res.render('admin/login', {
    title: 'เข้าสู่ระบบเจ้าหน้าที่',
    layout: 'layouts/auth'
  });
});

// การเข้าสู่ระบบนักศึกษา
router.post('/login', [
  // ตรวจสอบข้อมูลที่ส่งมา
  check('studentId', 'กรุณากรอกรหัสนักศึกษา').notEmpty(),
  check('password', 'กรุณากรอกรหัสผ่าน').notEmpty()
], (req, res, next) => {
  // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('login', {
      title: 'เข้าสู่ระบบนักศึกษา',
      layout: 'layouts/auth',
      errors: errors.array(),
      studentId: req.body.studentId
    });
  }

  // ทำการเข้าสู่ระบบด้วย Passport
  passport.authenticate('local', {
    successRedirect: '/student/main-menu',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// การเข้าสู่ระบบเจ้าหน้าที่
router.post('/admin/login', [
  // ตรวจสอบข้อมูลที่ส่งมา
  check('username', 'กรุณากรอกชื่อผู้ใช้').notEmpty(),
  check('password', 'กรุณากรอกรหัสผ่าน').notEmpty()
], (req, res, next) => {
  // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/login', {
      title: 'เข้าสู่ระบบเจ้าหน้าที่',
      layout: 'layouts/auth',
      errors: errors.array(),
      username: req.body.username
    });
  }

  // ทำการเข้าสู่ระบบด้วย Passport (ใช้ strategy 'staff-local')
  passport.authenticate('staff-local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/admin/login',
    failureFlash: true
  })(req, res, next);
});

// การออกจากระบบ
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      logger.error(`Logout error: ${err.message}`);
      return next(err);
    }
    req.flash('success_msg', 'คุณได้ออกจากระบบเรียบร้อยแล้ว');
    res.redirect('/login');
  });
});

// หน้าลงทะเบียนนักศึกษา (ใช้เฉพาะในสภาพแวดล้อมการพัฒนา)
router.get('/register', forwardAuthenticated, (req, res) => {
  res.render('register', {
    title: 'ลงทะเบียนนักศึกษา',
    layout: 'layouts/auth'
  });
});

// ลงทะเบียนนักศึกษา (ใช้เฉพาะในสภาพแวดล้อมการพัฒนา)
router.post('/register', [
  // ตรวจสอบข้อมูลที่ส่งมา
  check('studentId', 'กรุณากรอกรหัสนักศึกษา').notEmpty(),
  check('password', 'กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร').isLength({ min: 6 }),
  check('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('รหัสผ่านไม่ตรงกัน');
    }
    return true;
  }),
  check('firstName', 'กรุณากรอกชื่อจริง').notEmpty(),
  check('lastName', 'กรุณากรอกนามสกุล').notEmpty(),
  check('email', 'กรุณากรอกอีเมลที่ถูกต้อง').isEmail(),
  check('phone', 'กรุณากรอกเบอร์โทรศัพท์').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('register', {
        title: 'ลงทะเบียนนักศึกษา',
        layout: 'layouts/auth',
        errors: errors.array(),
        student: req.body
      });
    }

    const { studentId, password, firstName, lastName, faculty, major, email, phone, address } = req.body;

    // ตรวจสอบว่ารหัสนักศึกษานี้มีในระบบแล้วหรือไม่
    const checkResult = await db.query('SELECT * FROM students WHERE student_id = $1', [studentId]);
    
    if (checkResult.rows.length > 0) {
      return res.render('register', {
        title: 'ลงทะเบียนนักศึกษา',
        layout: 'layouts/auth',
        errors: [{ msg: 'รหัสนักศึกษานี้มีในระบบแล้ว' }],
        student: req.body
      });
    }

    // เข้ารหัสรหัสผ่าน
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // บันทึกข้อมูลนักศึกษาใหม่
    await db.query(
      `INSERT INTO students (student_id, password, first_name, last_name, faculty, major, email, phone, address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [studentId, hashedPassword, firstName, lastName, faculty, major, email, phone, address]
    );

    req.flash('success_msg', 'ลงทะเบียนสำเร็จ คุณสามารถเข้าสู่ระบบได้แล้ว');
    logger.info(`New student registered: ${studentId}`);
    res.redirect('/login');
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    res.redirect('/register');
  }
});

module.exports = router;
