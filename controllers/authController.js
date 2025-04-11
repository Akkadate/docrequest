/**
 * controllers/authController.js
 * คอนโทรลเลอร์สำหรับจัดการการเข้าสู่ระบบและการรับรองตัวตน
 */

const passport = require('passport');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const User = require('../models/User');
const { logger } = require('../utils/logger');

/**
 * แสดงหน้าเข้าสู่ระบบนักศึกษา
 */
exports.getLoginPage = (req, res) => {
  res.render('login', {
    title: 'เข้าสู่ระบบนักศึกษา',
    layout: 'layouts/auth'
  });
};

/**
 * แสดงหน้าเข้าสู่ระบบเจ้าหน้าที่
 */
exports.getAdminLoginPage = (req, res) => {
  res.render('admin/login', {
    title: 'เข้าสู่ระบบเจ้าหน้าที่',
    layout: 'layouts/auth'
  });
};

/**
 * ดำเนินการเข้าสู่ระบบนักศึกษา
 */
exports.postLogin = (req, res, next) => {
  // ตรวจสอบความถูกต้องของข้อมูลจากแบบฟอร์ม
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('login', {
      title: 'เข้าสู่ระบบนักศึกษา',
      layout: 'layouts/auth',
      errors: errors.array(),
      studentId: req.body.studentId
    });
  }

  // ดำเนินการเข้าสู่ระบบด้วย Passport
  passport.authenticate('local', {
    successRedirect: '/student/main-menu',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
};

/**
 * ดำเนินการเข้าสู่ระบบเจ้าหน้าที่
 */
exports.postAdminLogin = (req, res, next) => {
  // ตรวจสอบความถูกต้องของข้อมูลจากแบบฟอร์ม
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/login', {
      title: 'เข้าสู่ระบบเจ้าหน้าที่',
      layout: 'layouts/auth',
      errors: errors.array(),
      username: req.body.username
    });
  }

  // ดำเนินการเข้าสู่ระบบด้วย Passport (ใช้ strategy 'staff-local')
  passport.authenticate('staff-local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/admin/login',
    failureFlash: true
  })(req, res, next);
};

/**
 * ออกจากระบบ
 */
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      logger.error(`Logout error: ${err.message}`);
      return next(err);
    }
    req.flash('success_msg', 'คุณได้ออกจากระบบเรียบร้อยแล้ว');
    res.redirect('/login');
  });
};

/**
 * แสดงหน้าลงทะเบียนนักศึกษา
 */
exports.getRegisterPage = (req, res) => {
  res.render('register', {
    title: 'ลงทะเบียนนักศึกษา',
    layout: 'layouts/auth'
  });
};

/**
 * ดำเนินการลงทะเบียนนักศึกษา
 */
exports.postRegister = async (req, res) => {
  try {
    // ตรวจสอบความถูกต้องของข้อมูลจากแบบฟอร์ม
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
    const existingStudent = await Student.findByStudentId(studentId);
    
    if (existingStudent) {
      return res.render('register', {
        title: 'ลงทะเบียนนักศึกษา',
        layout: 'layouts/auth',
        errors: [{ msg: 'รหัสนักศึกษานี้มีในระบบแล้ว' }],
        student: req.body
      });
    }

    // สร้างบัญชีนักศึกษาใหม่
    await Student.create({
      studentId,
      password,
      firstName,
      lastName,
      faculty,
      major,
      email,
      phone,
      address
    });

    req.flash('success_msg', 'ลงทะเบียนสำเร็จ คุณสามารถเข้าสู่ระบบได้แล้ว');
    logger.info(`New student registered: ${studentId}`);
    res.redirect('/login');
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    res.redirect('/register');
  }
};

/**
 * เปลี่ยนรหัสผ่านผู้ใช้
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const isStaff = req.user.isStaff || false;
    
    // ตรวจสอบรหัสผ่านปัจจุบัน
    let isValidPassword;
    
    if (isStaff) {
      isValidPassword = await User.validatePassword(currentPassword, req.user.password);
    } else {
      isValidPassword = await Student.validatePassword(currentPassword, req.user.password);
    }
    
    if (!isValidPassword) {
      req.flash('error_msg', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      return res.redirect(isStaff ? '/admin/profile' : '/student/profile');
    }
    
    // เปลี่ยนรหัสผ่าน
    if (isStaff) {
      await User.changePassword(userId, newPassword);
    } else {
      await Student.changePassword(userId, newPassword);
    }
    
    req.flash('success_msg', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    res.redirect(isStaff ? '/admin/profile' : '/student/profile');
  } catch (error) {
    logger.error(`Error changing password: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    res.redirect(req.user.isStaff ? '/admin/profile' : '/student/profile');
  }
};

/**
 * รีเซ็ตรหัสผ่านของนักศึกษา (สำหรับเจ้าหน้าที่)
 */
exports.resetStudentPassword = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // ตรวจสอบว่าผู้ใช้เป็นเจ้าหน้าที่
    if (!req.user.isStaff) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์ในการทำรายการนี้');
      return res.redirect('/student/main-menu');
    }
    
    // ค้นหาข้อมูลนักศึกษา
    const student = await Student.findById(studentId);
    
    if (!student) {
      req.flash('error_msg', 'ไม่พบข้อมูลนักศึกษา');
      return res.redirect('/admin/students');
    }
    
    // รีเซ็ตรหัสผ่านเป็นรหัสนักศึกษา
    await Student.changePassword(studentId, student.student_id);
    
    req.flash('success_msg', 'รีเซ็ตรหัสผ่านนักศึกษาเรียบร้อยแล้ว');
    res.redirect(`/admin/student/${studentId}`);
  } catch (error) {
    logger.error(`Error resetting student password: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่านนักศึกษา');
    res.redirect(`/admin/student/${req.params.id}`);
  }
};
