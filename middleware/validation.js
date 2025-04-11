const { check } = require('express-validator');

// ตรวจสอบการเข้าสู่ระบบนักศึกษา
exports.validateLogin = [
  check('studentId', 'กรุณากรอกรหัสนักศึกษา').notEmpty(),
  check('password', 'กรุณากรอกรหัสผ่าน').notEmpty()
];

// ตรวจสอบการเข้าสู่ระบบเจ้าหน้าที่
exports.validateAdminLogin = [
  check('username', 'กรุณากรอกชื่อผู้ใช้').notEmpty(),
  check('password', 'กรุณากรอกรหัสผ่าน').notEmpty()
];

// ตรวจสอบการลงทะเบียนนักศึกษา
exports.validateRegister = [
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
];

// ตรวจสอบแบบฟอร์มขอเอกสาร
exports.validateDocumentRequest = [
  check('documentType', 'กรุณาเลือกประเภทเอกสาร').notEmpty(),
  check('copies', 'กรุณาระบุจำนวนฉบับ').isInt({ min: 1 }),
  check('purpose', 'กรุณาระบุวัตถุประสงค์').notEmpty(),
  check('deliveryMethod', 'กรุณาเลือกวิธีรับเอกสาร').notEmpty()
];

// ตรวจสอบข้อมูลที่อยู่จัดส่ง
exports.validateDeliveryAddress = [
  check('addressLine1', 'กรุณากรอกที่อยู่').notEmpty(),
  check('district', 'กรุณากรอกเขต/อำเภอ').notEmpty(),
  check('province', 'กรุณากรอกจังหวัด').notEmpty(),
  check('postalCode', 'กรุณากรอกรหัสไปรษณีย์').notEmpty().isLength({ min: 5, max: 5 })
];

// ตรวจสอบข้อมูลการชำระเงิน
exports.validatePayment = [
  check('paymentMethod', 'กรุณาเลือกวิธีการชำระเงิน').notEmpty(),
  check('paymentReference', 'กรุณากรอกเลขที่อ้างอิงการชำระเงิน').notEmpty(),
  check('paymentDate', 'กรุณาเลือกวันที่ชำระเงิน').notEmpty(),
  check('paymentAmount', 'กรุณากรอกจำนวนเงิน').isFloat({ min: 0.01 })
];

// ตรวจสอบการอัพเดทสถานะคำขอ
exports.validateStatusUpdate = [
  check('status', 'กรุณาเลือกสถานะ').notEmpty(),
  check('notes', 'กรุณากรอกหมายเหตุ').notEmpty()
];

// ตรวจสอบการบันทึกการมารับเอกสาร
exports.validatePickup = [
  check('receiverName', 'กรุณากรอกชื่อผู้รับ').notEmpty(),
  check('receiverIdCard', 'กรุณากรอกเลขบัตรประชาชนผู้รับ').notEmpty().isLength({ min: 13, max: 13 })
];

// ตรวจสอบการส่งเอกสารทางไปรษณีย์
exports.validateShipping = [
  check('trackingNumber', 'กรุณากรอกหมายเลขพัสดุ').notEmpty(),
  check('deliveryDate', 'กรุณาเลือกวันที่จัดส่ง').notEmpty()
];

// ตรวจสอบการแก้ไขโปรไฟล์
exports.validateProfile = [
  check('firstName', 'กรุณากรอกชื่อจริง').notEmpty(),
  check('lastName', 'กรุณากรอกนามสกุล').notEmpty(),
  check('email', 'กรุณากรอกอีเมลที่ถูกต้อง').isEmail(),
  check('phone', 'กรุณากรอกเบอร์โทรศัพท์').notEmpty()
];

// ตรวจสอบการเปลี่ยนรหัสผ่าน
exports.validatePasswordChange = [
  check('currentPassword', 'กรุณากรอกรหัสผ่านปัจจุบัน').notEmpty(),
  check('newPassword', 'กรุณากรอกรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร').isLength({ min: 6 }),
  check('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('รหัสผ่านใหม่ไม่ตรงกัน');
    }
    return true;
  })
];

// ตรวจสอบการยกเลิกคำขอ
exports.validateCancellation = [
  check('reason', 'กรุณาระบุเหตุผลในการยกเลิก').notEmpty()
];
