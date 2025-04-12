/**
 * controllers/studentController.js
 * คอนโทรลเลอร์สำหรับจัดการฟังก์ชันการทำงานฝั่งนักศึกษา
 */

const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const Request = require('../models/Request');
const Document = require('../models/Document');
const Payment = require('../models/Payment');
const db = require('../config/database');
const { 
  calculateFees, 
  translateDocumentType,
  translateDeliveryMethod,
  translateStatus,
  estimateProcessingTime,
  formatThaiDate
} = require('../utils/helpers');
const { 
  sendRequestConfirmation,
  sendStatusUpdate
} = require('../utils/emailService');
const { logger } = require('../utils/logger');

/**
 * แสดงหน้าเมนูหลักนักศึกษา

exports.getMainMenu = (req, res) => {
  res.render('main-menu', {
    title: 'เมนูหลัก - ระบบขอเอกสารออนไลน์',
    user: req.user
  });
};
 */

// In controllers/studentController.js
exports.getMainMenu = (req, res) => {
  res.render('main-menu', {
    title: 'เมนูหลัก - ระบบขอเอกสารออนไลน์',
    user: req.user,
    currentPath: '/student/main-menu'
  });
};

//--------------------------------- test


/**
 * แสดงหน้าเลือกประเภทเอกสาร----
 */
exports.getSelectDocument = (req, res) => {
  res.render('select-document', {
    title: 'เลือกประเภทเอกสาร - ระบบขอเอกสารออนไลน์',
    user: req.user,
    currentPath: '/student/select-document'
  });
};

/**
 * แสดงหน้าแบบฟอร์มขอเอกสาร
 */
exports.getRequestForm = (req, res) => {
  const documentType = req.params.type;
  const documentTypes = {
    transcript: 'ใบแสดงผลการเรียน (Transcript)',
    certificate: 'หนังสือรับรองการเป็นนักศึกษา',
    graduation: 'หนังสือรับรองสำเร็จการศึกษา',
    enrollment: 'คำร้องขอลงทะเบียน',
    general: 'คำร้องทั่วไป'
  };

  if (!documentTypes[documentType]) {
    req.flash('error_msg', 'ประเภทเอกสารไม่ถูกต้อง');
    return res.redirect('/student/select-document');
  }

  res.render('request-form', {
    title: `ขอ${documentTypes[documentType]} - ระบบขอเอกสารออนไลน์`,
    user: req.user,
    documentType: documentType,
    documentTypeThai: documentTypes[documentType],
    currentPath: '/student/request-form/:type'
  });
};

/**
 * บันทึกคำขอเอกสาร
 */
exports.submitRequest = async (req, res) => {
  try {
    // ตรวจสอบความถูกต้องของข้อมูลจากแบบฟอร์ม
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/student/request-form/${req.body.documentType}`);
    }

    const { documentType, copies, purpose, deliveryMethod } = req.body;
    
    // ตรวจสอบและเตรียมข้อมูลที่อยู่สำหรับจัดส่ง
    let deliveryAddress = null;
    if (deliveryMethod === 'postal') {
      // ตรวจสอบว่ากรอกที่อยู่ครบถ้วนหรือไม่
      const { addressLine1, addressLine2, district, province, postalCode } = req.body;
      if (!addressLine1 || !district || !province || !postalCode) {
        req.flash('error_msg', 'กรุณากรอกที่อยู่ให้ครบถ้วน');
        return res.redirect(`/student/request-form/${documentType}`);
      }
      
      // รวมที่อยู่เป็นข้อความเดียว
      deliveryAddress = `${addressLine1} ${addressLine2 || ''} ${district} ${province} ${postalCode}`;
    }
    
    // คำนวณค่าธรรมเนียม
    const fees = calculateFees(documentType, parseInt(copies), deliveryMethod);
    
    // เตรียมข้อมูลไฟล์แนบ (ถ้ามี)
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          fileName: file.filename,
          filePath: file.path,
          fileType: file.mimetype,
          originalName: file.originalname
        });
      }
    }
    
    // เตรียมข้อมูลสำหรับบันทึกคำขอ
    const requestData = {
      studentId: req.user.id,
      documentType,
      copies: parseInt(copies),
      purpose,
      deliveryMethod,
      deliveryAddress,
      shippingFee: fees.deliveryFee,
      documentFee: fees.totalDocumentFee,
      totalFee: fees.totalFee,
      paymentStatus: fees.totalFee > 0 ? 'pending' : 'not_required',
      status: 'pending',
      attachments
    };
    
    // บันทึกคำขอลงในฐานข้อมูล
    const newRequest = await Request.create(requestData);
    
    // ส่งอีเมลยืนยันการขอเอกสาร
    const estimatedTime = estimateProcessingTime(documentType);
    const confirmationData = {
      reference: newRequest.reference,
      documentType: translateDocumentType(documentType),
      copies: copies,
      deliveryMethod: translateDeliveryMethod(deliveryMethod),
      requestDate: formatThaiDate(new Date()),
      estimatedDays: estimatedTime.days
    };
    
    await sendRequestConfirmation(req.user.email, confirmationData);
    
    // แสดงหน้ายืนยันการส่งคำขอ
    res.render('request-success', {
      title: 'ส่งคำขอสำเร็จ - ระบบขอเอกสารออนไลน์',
      user: req.user,
      request: {
        ...newRequest,
        documentTypeThai: translateDocumentType(documentType),
        deliveryMethodThai: translateDeliveryMethod(deliveryMethod),
        statusThai: translateStatus(newRequest.status),
        estimatedDays: estimatedTime.days,
        estimatedDate: formatThaiDate(estimatedTime.date)
      },
      fees
    });
  } catch (error) {
    logger.error(`Error submitting request: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการส่งคำขอ กรุณาลองใหม่อีกครั้ง');
    res.redirect(`/student/request-form/${req.body.documentType}`);
  }
};

/**
 * แสดงประวัติการขอเอกสาร
 */
exports.getDocumentHistory = async (req, res) => {
  try {
    // ดึงประวัติคำขอของนักศึกษา
    const requests = await Request.findByStudentId(req.user.id);
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการแสดงผล
    const formattedRequests = requests.map(request => ({
      ...request,
      documentTypeThai: translateDocumentType(request.document_type),
      statusThai: translateStatus(request.status),
      createdAtThai: formatThaiDate(request.created_at)
    }));
    
    res.render('document-history', {
      title: 'ประวัติการขอเอกสาร - ระบบขอเอกสารออนไลน์',
      user: req.user,
      requests: formattedRequests,
      currentPath: '/student/document-history'
    });
  } catch (error) {
    logger.error(`Error fetching document history: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการดึงประวัติการขอเอกสาร');
    res.redirect('/student/main-menu');
  }
};

/**
 * แสดงหน้าติดตามสถานะคำขอ
 */
exports.getTrackStatus = async (req, res) => {
  try {
    const reference = req.query.ref;
    
    if (!reference) {
      return res.render('track-status', {
        title: 'ติดตามสถานะคำขอ - ระบบขอเอกสารออนไลน์',
        user: req.user,
        searchMode: true,
        currentPath: '/student/track-status'
      });
    }
    
    // ค้นหาคำขอตามเลขที่อ้างอิง
    const request = await Request.findByReference(reference);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอตามเลขที่อ้างอิงที่ระบุ');
      return res.render('track-status', {
        title: 'ติดตามสถานะคำขอ - ระบบขอเอกสารออนไลน์',
        user: req.user,
        searchMode: true,
        reference
      });
    }
    
    // ตรวจสอบว่าเป็นคำขอของนักศึกษาคนนี้หรือไม่
    if (request.student_id !== req.user.id) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์ดูคำขอนี้');
      return res.redirect('/student/track-status');
    }
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการแสดงผล
    const formattedRequest = {
      ...request,
      documentTypeThai: translateDocumentType(request.document_type),
      statusThai: translateStatus(request.status),
      createdAtThai: formatThaiDate(request.created_at),
      deliveryMethodThai: translateDeliveryMethod(request.delivery_method)
    };
    
    // แปลงประวัติสถานะ
    const formattedHistory = request.statusHistory.map(item => ({
      ...item,
      statusThai: translateStatus(item.status),
      createdAtThai: formatThaiDate(item.created_at)
    }));
    
    res.render('track-status', {
      title: 'ติดตามสถานะคำขอ - ระบบขอเอกสารออนไลน์',
      user: req.user,
      searchMode: false,
      request: formattedRequest,
      history: formattedHistory
    });
  } catch (error) {
    logger.error(`Error tracking request status: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการติดตามสถานะคำขอ');
    res.redirect('/student/main-menu');
  }
};

/**
 * แสดงหน้าชำระเงิน
 */
exports.getPaymentPage = async (req, res) => {
  try {
    const reference = req.params.reference;
    
    // ค้นหาคำขอตามเลขที่อ้างอิง
    const request = await Request.findByReference(reference);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอตามเลขที่อ้างอิงที่ระบุ');
      return res.redirect('/student/document-history');
    }
    
    // ตรวจสอบว่าเป็นคำขอของนักศึกษาคนนี้หรือไม่
    if (request.student_id !== req.user.id) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์ดูคำขอนี้');
      return res.redirect('/student/document-history');
    }
    
    // ตรวจสอบว่าต้องชำระเงินหรือไม่
    if (request.payment_status !== 'pending') {
      req.flash('error_msg', 'คำขอนี้ไม่อยู่ในสถานะที่ต้องชำระเงิน');
      return res.redirect(`/student/track-status?ref=${reference}`);
    }
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการแสดงผล
    const formattedRequest = {
      ...request,
      documentTypeThai: translateDocumentType(request.document_type),
      statusThai: translateStatus(request.status),
      createdAtThai: formatThaiDate(request.created_at)
    };
    
    res.render('payment', {
      title: 'ชำระเงิน - ระบบขอเอกสารออนไลน์',
      user: req.user,
      request: formattedRequest
    });
  } catch (error) {
    logger.error(`Error loading payment page: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดหน้าชำระเงิน');
    res.redirect('/student/document-history');
  }
};

/**
 * บันทึกการชำระเงิน
 */
exports.submitPayment = async (req, res) => {
  try {
    // ตรวจสอบความถูกต้องของข้อมูลจากแบบฟอร์ม
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/student/payment/${req.params.reference}`);
    }

    const reference = req.params.reference;
    const { paymentMethod, paymentReference, paymentDate, paymentAmount } = req.body;
    
    // ตรวจสอบว่ามีการอัปโหลดสลิปหรือไม่
    if (!req.file) {
      req.flash('error_msg', 'กรุณาอัปโหลดสลิปการโอนเงิน');
      return res.redirect(`/student/payment/${reference}`);
    }
    
    // ค้นหาคำขอตามเลขที่อ้างอิง
    const request = await Request.findByReference(reference);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอตามเลขที่อ้างอิงที่ระบุ');
      return res.redirect('/student/document-history');
    }
    
    // เตรียมข้อมูลการชำระเงิน
    const paymentData = {
      paymentMethod,
      paymentReference,
      paymentDate: new Date(paymentDate),
      paymentStatus: 'pending_verification',
      amount: request.total_fee
    };
    
    // บันทึกไฟล์แนบ (สลิปการโอนเงิน)
    const attachmentData = {
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      originalName: req.file.originalname
    };
    
    // บันทึกข้อมูลการชำระเงินลงในฐานข้อมูล
    await db.query(
      `INSERT INTO request_attachments (
        request_id, file_name, file_path, file_type, 
        original_name, attachment_type, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, 'payment_slip', NOW())`,
      [
        request.id,
        attachmentData.fileName,
        attachmentData.filePath,
        attachmentData.fileType,
        attachmentData.originalName
      ]
    );
    
    // บันทึกข้อมูลการชำระเงิน
    await Payment.create({
      requestId: request.id,
      amount: request.total_fee,
      paymentMethod,
      paymentReference,
      paymentDate: new Date(paymentDate),
      paymentStatus: 'pending_verification'
    });
    
    // อัพเดทสถานะการชำระเงิน
    await Request.updatePayment(request.id, paymentData);
    
    // อัพเดทสถานะคำขอ
    await Request.updateStatus(
      request.id, 
      'awaiting_verification', 
      'รอการตรวจสอบการชำระเงิน', 
      req.user.id
    );
    
    req.flash('success_msg', 'บันทึกข้อมูลการชำระเงินเรียบร้อยแล้ว');
    res.redirect(`/student/track-status?ref=${reference}`);
  } catch (error) {
    logger.error(`Error processing payment: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน');
    res.redirect(`/student/payment/${req.params.reference}`);
  }
};

/**
 * แสดงหน้าโปรไฟล์นักศึกษา
 */
exports.getProfile = (req, res) => {
  res.render('profile', {
    title: 'โปรไฟล์นักศึกษา - ระบบขอเอกสารออนไลน์',
    user: req.user,
     currentPath: '/student/profile'
  });
};

/**
 * แก้ไขโปรไฟล์นักศึกษา
 */
exports.updateProfile = async (req, res) => {
  try {
    // ตรวจสอบความถูกต้องของข้อมูลจากแบบฟอร์ม
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('profile', {
        title: 'โปรไฟล์นักศึกษา - ระบบขอเอกสารออนไลน์',
        user: req.user,
        errors: errors.array()
      });
    }

    const { firstName, lastName, faculty, major, email, phone, address } = req.body;
    
    // อัพเดทข้อมูลนักศึกษา
    await Student.update(req.user.id, {
      firstName,
      lastName,
      faculty,
      major,
      email,
      phone,
      address
    });
    
    req.flash('success_msg', 'อัพเดทข้อมูลโปรไฟล์เรียบร้อยแล้ว');
    res.redirect('/student/profile');
  } catch (error) {
    logger.error(`Error updating profile: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลโปรไฟล์');
    res.redirect('/student/profile');
  }
};

/**
 * ขอเอกสารซ้ำ (คัดลอกจากคำขอเดิม)
 */
exports.duplicateRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // ค้นหาคำขอตาม ID
    const request = await Request.findById(requestId);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอที่ต้องการคัดลอก');
      return res.redirect('/student/document-history');
    }
    
    // ตรวจสอบว่าเป็นคำขอของนักศึกษาคนนี้หรือไม่
    if (request.student_id !== req.user.id) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์คัดลอกคำขอนี้');
      return res.redirect('/student/document-history');
    }
    
    // ไปยังหน้าขอเอกสารพร้อมข้อมูลเดิม
    res.render('request-form', {
      title: `ขอ${translateDocumentType(request.document_type)} - ระบบขอเอกสารออนไลน์`,
      user: req.user,
      documentType: request.document_type,
      documentTypeThai: translateDocumentType(request.document_type),
      duplicatedRequest: {
        copies: request.copies,
        purpose: request.purpose,
        deliveryMethod: request.delivery_method,
        deliveryAddress: request.delivery_address
      }
    });
  } catch (error) {
    logger.error(`Error duplicating request: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการคัดลอกคำขอ');
    res.redirect('/student/document-history');
  }
};

/**
 * ยกเลิกคำขอ
 */
exports.cancelRequest = async (req, res) => {
  try {
    // ตรวจสอบความถูกต้องของข้อมูลจากแบบฟอร์ม
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/student/track-status?ref=${req.query.ref}`);
    }

    const requestId = req.params.id;
    const { reason } = req.body;
    const reference = req.query.ref;
    
    // ค้นหาคำขอตาม ID
    const request = await Request.findById(requestId);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอที่ต้องการยกเลิก');
      return res.redirect('/student/document-history');
    }
    
    // ตรวจสอบว่าเป็นคำขอของนักศึกษาคนนี้หรือไม่
    if (request.student_id !== req.user.id) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์ยกเลิกคำขอนี้');
      return res.redirect('/student/document-history');
    }
    
    // ตรวจสอบว่าสามารถยกเลิกได้หรือไม่
    const cancelableStatuses = ['pending', 'awaiting_verification', 'awaiting_payment'];
    if (!cancelableStatuses.includes(request.status)) {
      req.flash('error_msg', 'ไม่สามารถยกเลิกคำขอที่อยู่ในสถานะนี้ได้');
      return res.redirect(`/student/track-status?ref=${reference}`);
    }
    
    // ยกเลิกคำขอ
    await Request.cancel(requestId, reason, req.user.id, false);
    
    req.flash('success_msg', 'ยกเลิกคำขอเรียบร้อยแล้ว');
    res.redirect(`/student/track-status?ref=${reference}`);
  } catch (error) {
    logger.error(`Error cancelling request: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการยกเลิกคำขอ');
    res.redirect(`/student/track-status?ref=${req.query.ref}`);
  }
};
