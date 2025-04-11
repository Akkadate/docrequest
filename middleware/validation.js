/**
 * middleware/validation.js
 * มิดเดิลแวร์สำหรับตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
 */

const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

// เช็คความถูกต้องของข้อมูลและส่งผลลัพธ์
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  // บันทึกข้อผิดพลาด
  logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
  
  // ถ้าเป็น API ให้ส่งผลลัพธ์เป็น JSON
  if (req.originalUrl.includes('/api/')) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // มิฉะนั้นให้แสดงข้อความข้อผิดพลาดและกลับไปหน้าเดิม
  req.flash('error_msg', errors.array()[0].msg);
  return res.redirect('back');
};

// กฎสำหรับตรวจสอบการเข้าสู่ระบบ
const loginValidation = [
  body('studentId')
    .notEmpty().withMessage('กรุณากรอกรหัสนักศึกษา')
    .isLength({ min: 7, max: 10 }).withMessage('รหัสนักศึกษาไม่ถูกต้อง'),
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
];

// กฎสำหรับตรวจสอบการเข้าสู่ระบบเจ้าหน้าที่
const staffLoginValidation = [
  body('username')
    .notEmpty().withMessage('กรุณากรอกชื่อผู้ใช้')
    .isLength({ min: 4, max: 20 }).withMessage('ชื่อผู้ใช้ต้องมีความยาว 4-20 ตัวอักษร'),
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
];

// กฎสำหรับตรวจสอบการลงทะเบียนนักศึกษา
const registerValidation = [
  body('studentId')
    .notEmpty().withMessage('กรุณากรอกรหัสนักศึกษา')
    .isLength({ min: 7, max: 10 }).withMessage('รหัสนักศึกษาไม่ถูกต้อง'),
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
    .isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  body('confirmPassword')
    .notEmpty().withMessage('กรุณายืนยันรหัสผ่าน')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('รหัสผ่านไม่ตรงกัน');
      }
      return true;
    }),
  body('firstName')
    .notEmpty().withMessage('กรุณากรอกชื่อจริง'),
  body('lastName')
    .notEmpty().withMessage('กรุณากรอกนามสกุล'),
  body('email')
    .notEmpty().withMessage('กรุณากรอกอีเมล')
    .isEmail().withMessage('อีเมลไม่ถูกต้อง'),
  body('phone')
    .notEmpty().withMessage('กรุณากรอกเบอร์โทรศัพท์')
    .matches(/^[0-9]{9,10}$/).withMessage('เบอร์โทรศัพท์ไม่ถูกต้อง')
];

// กฎสำหรับตรวจสอบการแก้ไขโปรไฟล์
const profileValidation = [
  body('firstName')
    .notEmpty().withMessage('กรุณากรอกชื่อจริง'),
  body('lastName')
    .notEmpty().withMessage('กรุณากรอกนามสกุล'),
  body('email')
    .notEmpty().withMessage('กรุณากรอกอีเมล')
    .isEmail().withMessage('อีเมลไม่ถูกต้อง'),
  body('phone')
    .notEmpty().withMessage('กรุณากรอกเบอร์โทรศัพท์')
    .matches(/^[0-9]{9,10}$/).withMessage('เบอร์โทรศัพท์ไม่ถูกต้อง')
];

// กฎสำหรับตรวจสอบการเปลี่ยนรหัสผ่าน
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่านปัจจุบัน'),
  body('newPassword')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่านใหม่')
    .isLength({ min: 6 }).withMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  body('confirmPassword')
    .notEmpty().withMessage('กรุณายืนยันรหัสผ่านใหม่')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('รหัสผ่านยืนยันไม่ตรงกัน');
      }
      return true;
    })
];

// กฎสำหรับตรวจสอบการขอเอกสาร
const requestDocumentValidation = [
  body('documentType')
    .notEmpty().withMessage('กรุณาเลือกประเภทเอกสาร'),
  body('copies')
    .notEmpty().withMessage('กรุณาระบุจำนวนฉบับ')
    .isInt({ min: 1, max: 10 }).withMessage('จำนวนฉบับต้องเป็นตัวเลขระหว่าง 1-10'),
  body('purpose')
    .notEmpty().withMessage('กรุณาระบุวัตถุประสงค์'),
  body('deliveryMethod')
    .notEmpty().withMessage('กรุณาเลือกวิธีรับเอกสาร')
    .isIn(['pickup', 'postal', 'digital']).withMessage('วิธีรับเอกสารไม่ถูกต้อง'),
  body('addressLine1')
    .if(body('deliveryMethod').equals('postal'))
    .notEmpty().withMessage('กรุณากรอกที่อยู่'),
  body('district')
    .if(body('deliveryMethod').equals('postal'))
    .notEmpty().withMessage('กรุณากรอกอำเภอ/เขต'),
  body('province')
    .if(body('deliveryMethod').equals('postal'))
    .notEmpty().withMessage('กรุณากรอกจังหวัด'),
  body('postalCode')
    .if(body('deliveryMethod').equals('postal'))
    .notEmpty().withMessage('กรุณากรอกรหัสไปรษณีย์')
    .matches(/^[0-9]{5}$/).withMessage('รหัสไปรษณีย์ไม่ถูกต้อง')
];

// กฎสำหรับตรวจสอบการชำระเงิน
const paymentValidation = [
  body('paymentMethod')
    .notEmpty().withMessage('กรุณาเลือกวิธีการชำระเงิน')
    .isIn(['qr_payment', 'bank_transfer']).withMessage('วิธีการชำระเงินไม่ถูกต้อง'),
  body('paymentReference')
    .notEmpty().withMessage('กรุณาระบุหมายเลขอ้างอิงการชำระเงิน'),
  body('paymentDate')
    .notEmpty().withMessage('กรุณาระบุวันที่ชำระเงิน')
    .isDate().withMessage('วันที่ชำ
