const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureStaff } = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { check, validationResult } = require('express-validator');
const Request = require('../models/Request');
const Student = require('../models/Student');
const db = require('../config/database');
const { 
  translateStatus, 
  translateDocumentType, 
  translateDeliveryMethod, 
  formatThaiDate 
} = require('../utils/helpers');
const { 
  sendStatusUpdate,
  sendDigitalDocument
} = require('../utils/emailService');
const { logger } = require('../utils/logger');

// หน้าแดชบอร์ดเจ้าหน้าที่
router.get('/dashboard', ensureAuthenticated, ensureStaff, async (req, res) => {
  try {
    // ดึงจำนวนคำขอตามสถานะ
    const pendingCount = await Request.count({ status: 'pending' });
    const processingCount = await Request.count({ status: 'processing' });
    const readyCount = await Request.count({ status: 'ready_for_pickup' });
    const verificationCount = await Request.count({ status: 'awaiting_verification' });
    const todayCount = await Request.count({ 
      startDate: new Date().setHours(0, 0, 0, 0) 
    });
    
    // ดึงคำขอล่าสุด 10 รายการ
    const latestRequests = await Request.findAll({ limit: 10 });
    
    // แปลงข้อมูลสถานะเป็นภาษาไทย
    const formattedRequests = latestRequests.map(request => ({
      ...request,
      documentTypeThai: translateDocumentType(request.document_type),
      statusThai: translateStatus(request.status),
      createdAtThai: formatThaiDate(request.created_at)
    }));
    
    res.render('admin/dashboard', {
      title: 'แดชบอร์ดเจ้าหน้าที่ - ระบบขอเอกสารออนไลน์',
      user: req.user,
      counts: {
        pending: pendingCount,
        processing: processingCount,
        ready: readyCount,
        verification: verificationCount,
        today: todayCount
      },
      latestRequests: formattedRequests
    });
  } catch (error) {
    logger.error(`Error loading admin dashboard: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด');
    res.redirect('/admin');
  }
});

// หน้าจัดการคำขอทั้งหมด
router.get('/requests', ensureAuthenticated, ensureStaff, async (req, res) => {
  try {
    // รับพารามิเตอร์การค้นหาและการแบ่งหน้า
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    // สร้าง filters สำหรับค้นหา
    const filters = {
      limit,
      offset,
      status: req.query.status,
      documentType: req.query.documentType,
      paymentStatus: req.query.paymentStatus,
      searchTerm: req.query.search
    };
    
    // ดึงคำขอทั้งหมดตามเงื่อนไข
    const requests = await Request.findAll(filters);
    const totalCount = await Request.count(filters);
    
    // คำนวณข้อมูลการแบ่งหน้า
    const totalPages = Math.ceil(totalCount / limit);
    
    // แปลงข้อมูลสถานะเป็นภาษาไทย
    const formattedRequests = requests.map(request => ({
      ...request,
      documentTypeThai: translateDocumentType(request.document_type),
      statusThai: translateStatus(request.status),
      createdAtThai: formatThaiDate(request.created_at)
    }));
    
    res.render('admin/requests', {
      title: 'จัดการคำขอทั้งหมด - ระบบขอเอกสารออนไลน์',
      user: req.user,
      requests: formattedRequests,
      pagination: {
        page,
        totalPages,
        totalCount
      },
      filters: {
        status: req.query.status || '',
        documentType: req.query.documentType || '',
        paymentStatus: req.query.paymentStatus || '',
        search: req.query.search || ''
      }
    });
  } catch (error) {
    logger.error(`Error loading admin requests: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดรายการคำขอ');
    res.redirect('/admin/dashboard');
  }
});

// หน้ารายละเอียดคำขอ
router.get('/request/:id', ensureAuthenticated, ensureStaff, async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // ค้นหาคำขอตาม ID
    const request = await Request.findById(requestId);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอที่ต้องการดู');
      return res.redirect('/admin/requests');
    }
    
    // แปลงข้อมูลสถานะเป็นภาษาไทย
    const formattedRequest = {
      ...request,
      documentTypeThai: translateDocumentType(request.document_type),
      statusThai: translateStatus(request.status),
      createdAtThai: formatThaiDate(request.created_at),
      deliveryMethodThai: translateDeliveryMethod(request.delivery_method)
    };
    
    // แปลงประวัติสถานะเป็นภาษาไทย
    const formattedHistory = request.statusHistory.map(item => ({
      ...item,
      statusThai: translateStatus(item.status),
      createdAtThai: formatThaiDate(item.created_at)
    }));
    
    res.render('admin/request-details', {
      title: `รายละเอียดคำขอ #${request.reference} - ระบบขอเอกสารออนไลน์`,
      user: req.user,
      request: formattedRequest,
      history: formattedHistory
    });
  } catch (error) {
    logger.error(`Error loading request details: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดรายละเอียดคำขอ');
    res.redirect('/admin/requests');
  }
});

// อัพเดทสถานะคำขอ
router.post('/update-status/:id', ensureAuthenticated, ensureStaff, [
  check('status', 'กรุณาเลือกสถานะ').notEmpty(),
  check('notes', 'กรุณากรอกหมายเหตุ').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/admin/request/${req.params.id}`);
    }

    const requestId = req.params.id;
    const { verificationResult, verificationNotes } = req.body;
    
    // กำหนดสถานะการชำระเงินและสถานะคำขอตามผลการตรวจสอบ
    let paymentStatus = '';
    let requestStatus = '';
    let statusNotes = '';
    
    if (verificationResult === 'approved') {
      paymentStatus = 'paid';
      requestStatus = 'processing';
      statusNotes = 'การชำระเงินถูกต้อง กำลังดำเนินการจัดทำเอกสาร';
    } else {
      paymentStatus = 'rejected';
      requestStatus = 'awaiting_payment';
      statusNotes = `การชำระเงินไม่ถูกต้อง กรุณาชำระใหม่ (${verificationNotes})`;
    }
    
    // อัพเดทข้อมูลการชำระเงิน
    const paymentData = {
      paymentStatus,
      paymentDate: new Date()
    };
    
    await Request.updatePayment(requestId, paymentData);
    
    // อัพเดทสถานะคำขอ
    await Request.updateStatus(requestId, requestStatus, statusNotes, req.user.id);
    
    // ค้นหาคำขอที่อัพเดทแล้วเพื่อดึงข้อมูลเพิ่มเติม
    const request = await Request.findById(requestId);
    
    // ดึงข้อมูลนักศึกษา
    const student = await Student.findById(request.student_id);
    
    // ส่งอีเมลแจ้งเตือนการอัพเดทสถานะ
    const statusUpdateData = {
      reference: request.reference,
      documentType: translateDocumentType(request.document_type),
      oldStatus: 'รอการตรวจสอบการชำระเงิน',
      newStatus: translateStatus(requestStatus),
      updateDate: formatThaiDate(new Date()),
      message: statusNotes
    };
    
    await sendStatusUpdate(student.email, statusUpdateData);
    
    req.flash('success_msg', `${verificationResult === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}การชำระเงินเรียบร้อยแล้ว`);
    res.redirect(`/admin/request/${requestId}`);
  } catch (error) {
    logger.error(`Error verifying payment: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการตรวจสอบการชำระเงิน');
    res.redirect(`/admin/request/${req.params.id}`);
  }
});

// อัพเดทข้อมูลการจัดส่ง
router.post('/update-delivery/:id', ensureAuthenticated, ensureStaff, [
  check('trackingNumber', 'กรุณากรอกหมายเลขพัสดุ').notEmpty(),
  check('deliveryDate', 'กรุณาเลือกวันที่จัดส่ง').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/admin/request/${req.params.id}`);
    }

    const requestId = req.params.id;
    const { trackingNumber, deliveryDate, deliveryNotes } = req.body;
    
    // อัพเดทข้อมูลการจัดส่ง
    const deliveryData = {
      trackingNumber,
      deliveryDate: new Date(deliveryDate)
    };
    
    await Request.updateDelivery(requestId, deliveryData);
    
    // อัพเดทสถานะคำขอเป็น 'shipped'
    const notes = `จัดส่งเอกสารแล้ว หมายเลขพัสดุ: ${trackingNumber} ${deliveryNotes ? '(' + deliveryNotes + ')' : ''}`;
    await Request.updateStatus(requestId, 'shipped', notes, req.user.id);
    
    // ค้นหาคำขอที่อัพเดทแล้วเพื่อดึงข้อมูลเพิ่มเติม
    const request = await Request.findById(requestId);
    
    // ดึงข้อมูลนักศึกษา
    const student = await Student.findById(request.student_id);
    
    // ส่งอีเมลแจ้งเตือนการอัพเดทสถานะ
    const statusUpdateData = {
      reference: request.reference,
      documentType: translateDocumentType(request.document_type),
      oldStatus: translateStatus(request.statusHistory[1]?.status || 'pending'),
      newStatus: 'จัดส่งแล้ว',
      updateDate: formatThaiDate(new Date()),
      message: notes
    };
    
    await sendStatusUpdate(student.email, statusUpdateData);
    
    req.flash('success_msg', 'อัพเดทข้อมูลการจัดส่งเรียบร้อยแล้ว');
    res.redirect(`/admin/request/${requestId}`);
  } catch (error) {
    logger.error(`Error updating delivery information: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลการจัดส่ง');
    res.redirect(`/admin/request/${req.params.id}`);
  }
});

// บันทึกการมารับเอกสาร
router.post('/mark-picked-up/:id', ensureAuthenticated, ensureStaff, [
  check('receiverName', 'กรุณากรอกชื่อผู้รับ').notEmpty(),
  check('receiverIdCard', 'กรุณากรอกเลขบัตรประชาชนผู้รับ').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/admin/request/${req.params.id}`);
    }

    const requestId = req.params.id;
    const { receiverName, receiverIdCard, pickupNotes } = req.body;
    
    // อัพเดทสถานะคำขอเป็น 'completed'
    const notes = `รับเอกสารแล้ว โดย: ${receiverName} (เลขบัตร: ${receiverIdCard}) ${pickupNotes ? '(' + pickupNotes + ')' : ''}`;
    await Request.updateStatus(requestId, 'completed', notes, req.user.id);
    
    // อัพเดทวันที่เสร็จสิ้น
    await db.query(
      'UPDATE document_requests SET completed_at = NOW() WHERE id = $1',
      [requestId]
    );
    
    // ค้นหาคำขอที่อัพเดทแล้วเพื่อดึงข้อมูลเพิ่มเติม
    const request = await Request.findById(requestId);
    
    // ดึงข้อมูลนักศึกษา
    const student = await Student.findById(request.student_id);
    
    // ส่งอีเมลแจ้งเตือนการอัพเดทสถานะ
    const statusUpdateData = {
      reference: request.reference,
      documentType: translateDocumentType(request.document_type),
      oldStatus: 'พร้อมให้รับเอกสาร',
      newStatus: 'เสร็จสิ้น',
      updateDate: formatThaiDate(new Date()),
      message: notes
    };
    
    await sendStatusUpdate(student.email, statusUpdateData);
    
    req.flash('success_msg', 'บันทึกการรับเอกสารเรียบร้อยแล้ว');
    res.redirect(`/admin/request/${requestId}`);
  } catch (error) {
    logger.error(`Error marking document as picked up: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการบันทึกการรับเอกสาร');
    res.redirect(`/admin/request/${req.params.id}`);
  }
});

// อัพโหลดและส่งเอกสารดิจิทัล
router.post('/send-digital/:id', ensureAuthenticated, ensureStaff, upload.single('digitalDocument'), [
  check('emailNotes', 'กรุณากรอกข้อความในอีเมล').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/admin/request/${req.params.id}`);
    }

    // ตรวจสอบว่ามีการอัปโหลดไฟล์หรือไม่
    if (!req.file) {
      req.flash('error_msg', 'กรุณาอัปโหลดไฟล์เอกสาร');
      return res.redirect(`/admin/request/${req.params.id}`);
    }

    const requestId = req.params.id;
    const { emailNotes } = req.body;
    
    // ค้นหาคำขอตาม ID
    const request = await Request.findById(requestId);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอที่ต้องการส่ง');
      return res.redirect('/admin/requests');
    }
    
    // ดึงข้อมูลนักศึกษา
    const student = await Student.findById(request.student_id);
    
    // บันทึกไฟล์เอกสารดิจิทัล
    const attachmentData = {
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      originalName: req.file.originalname
    };
    
    // บันทึกไฟล์เอกสารลงในฐานข้อมูล
    await db.query(
      `INSERT INTO request_attachments (
        request_id, file_name, file_path, file_type, 
        original_name, attachment_type, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, 'digital_document', NOW())`,
      [
        requestId,
        attachmentData.fileName,
        attachmentData.filePath,
        attachmentData.fileType,
        attachmentData.originalName
      ]
    );
    
    // ส่งอีเมลพร้อมเอกสารดิจิทัล
    const requestData = {
      reference: request.reference,
      documentType: translateDocumentType(request.document_type),
      copies: request.copies,
      completedDate: formatThaiDate(new Date())
    };
    
    await sendDigitalDocument(student.email, requestData, req.file.path);
    
    // อัพเดทสถานะคำขอเป็น 'completed'
    const notes = `ส่งเอกสารดิจิทัลทางอีเมลแล้ว: ${emailNotes}`;
    await Request.updateStatus(requestId, 'completed', notes, req.user.id);
    
    // อัพเดทวันที่เสร็จสิ้น
    await db.query(
      'UPDATE document_requests SET completed_at = NOW() WHERE id = $1',
      [requestId]
    );
    
    req.flash('success_msg', 'ส่งเอกสารดิจิทัลเรียบร้อยแล้ว');
    res.redirect(`/admin/request/${requestId}`);
  } catch (error) {
    logger.error(`Error sending digital document: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการส่งเอกสารดิจิทัล');
    res.redirect(`/admin/request/${req.params.id}`);
  }
}, handleUploadErrors);

// รายงานสรุป
router.get('/reports', ensureAuthenticated, ensureStaff, async (req, res) => {
  try {
    // รับพารามิเตอร์การค้นหา
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(1)); // วันแรกของเดือนปัจจุบัน
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date(); // วันปัจจุบัน
    
    // ดึงจำนวนคำขอตามประเภทเอกสาร
    const documentTypeQuery = await db.query(
      `SELECT document_type, COUNT(*) as count 
       FROM document_requests 
       WHERE created_at >= $1 AND created_at <= $2 
       GROUP BY document_type`,
      [startDate, endDate]
    );
    
    // ดึงจำนวนคำขอตามสถานะ
    const statusQuery = await db.query(
      `SELECT status, COUNT(*) as count 
       FROM document_requests 
       WHERE created_at >= $1 AND created_at <= $2 
       GROUP BY status`,
      [startDate, endDate]
    );
    
    // ดึงจำนวนคำขอตามวิธีรับเอกสาร
    const deliveryMethodQuery = await db.query(
      `SELECT delivery_method, COUNT(*) as count 
       FROM document_requests 
       WHERE created_at >= $1 AND created_at <= $2 
       GROUP BY delivery_method`,
      [startDate, endDate]
    );
    
    // ดึงระยะเวลาเฉลี่ยในการดำเนินการ (วัน)
    const processingTimeQuery = await db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) as avg_days 
       FROM document_requests 
       WHERE created_at >= $1 AND created_at <= $2 
       AND completed_at IS NOT NULL`,
      [startDate, endDate]
    );
    
    // ดึงรายได้รวม
    const revenueQuery = await db.query(
      `SELECT SUM(total_fee) as total 
       FROM document_requests 
       WHERE created_at >= $1 AND created_at <= $2 
       AND payment_status = 'paid'`,
      [startDate, endDate]
    );
    
    // ดึงจำนวนคำขอตามวัน
    const dailyCountQuery = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM document_requests 
       WHERE created_at >= $1 AND created_at <= $2 
       GROUP BY DATE(created_at) 
       ORDER BY date`,
      [startDate, endDate]
    );
    
    // แปลงข้อมูลสำหรับแสดงในรายงาน
    const documentTypeStats = documentTypeQuery.rows.map(row => ({
      type: translateDocumentType(row.document_type),
      count: parseInt(row.count)
    }));
    
    const statusStats = statusQuery.rows.map(row => ({
      status: translateStatus(row.status),
      count: parseInt(row.count)
    }));
    
    const deliveryMethodStats = deliveryMethodQuery.rows.map(row => ({
      method: translateDeliveryMethod(row.delivery_method),
      count: parseInt(row.count)
    }));
    
    const avgProcessingDays = processingTimeQuery.rows[0].avg_days ? parseFloat(processingTimeQuery.rows[0].avg_days).toFixed(2) : 'N/A';
    const totalRevenue = revenueQuery.rows[0].total ? parseFloat(revenueQuery.rows[0].total).toFixed(2) : '0.00';
    
    const dailyStats = dailyCountQuery.rows.map(row => ({
      date: formatThaiDate(row.date),
      count: parseInt(row.count)
    }));
    
    res.render('admin/reports', {
      title: 'รายงานสรุป - ระบบขอเอกสารออนไลน์',
      user: req.user,
      filters: {
        startDate: req.query.startDate || startDate.toISOString().split('T')[0],
        endDate: req.query.endDate || endDate.toISOString().split('T')[0]
      },
      stats: {
        documentType: documentTypeStats,
        status: statusStats,
        deliveryMethod: deliveryMethodStats,
        avgProcessingDays,
        totalRevenue,
        dailyStats
      }
    });
  } catch (error) {
    logger.error(`Error generating reports: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการสร้างรายงาน');
    res.redirect('/admin/dashboard');
  }
});

// จัดการนักศึกษา
router.get('/students', ensureAuthenticated, ensureStaff, async (req, res) => {
  try {
    // รับพารามิเตอร์การค้นหา
    const search = req.query.search || '';
    
    // ดึงข้อมูลนักศึกษา
    let query = `
      SELECT * FROM students
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (search) {
      query += ` AND (
        student_id ILIKE $1 OR
        first_name ILIKE $1 OR
        last_name ILIKE $1 OR
        email ILIKE $1
      )`;
      queryParams.push(`%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, queryParams);
    
    res.render('admin/students', {
      title: 'จัดการนักศึกษา - ระบบขอเอกสารออนไลน์',
      user: req.user,
      students: result.rows,
      search
    });
  } catch (error) {
    logger.error(`Error loading students: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดข้อมูลนักศึกษา');
    res.redirect('/admin/dashboard');
  }
});

// ดูข้อมูลนักศึกษา
router.get('/student/:id', ensureAuthenticated, ensureStaff, async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // ดึงข้อมูลนักศึกษา
    const student = await Student.findById(studentId);
    
    if (!student) {
      req.flash('error_msg', 'ไม่พบข้อมูลนักศึกษา');
      return res.redirect('/admin/students');
    }
    
    // ดึงประวัติคำขอของนักศึกษา
    const requests = await Request.findByStudentId(studentId);
    
    // แปลงข้อมูลสถานะเป็นภาษาไทย
    const formattedRequests = requests.map(request => ({
      ...request,
      documentTypeThai: translateDocumentType(request.document_type),
      statusThai: translateStatus(request.status),
      createdAtThai: formatThaiDate(request.created_at)
    }));
    
    res.render('admin/student-details', {
      title: `ข้อมูลนักศึกษา ${student.first_name} ${student.last_name} - ระบบขอเอกสารออนไลน์`,
      user: req.user,
      student,
      requests: formattedRequests
    });
  } catch (error) {
    logger.error(`Error loading student details: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดข้อมูลนักศึกษา');
    res.redirect('/admin/students');
  }
});

// แก้ไขข้อมูลนักศึกษา (สำหรับเจ้าหน้าที่)
router.post('/student/:id', ensureAuthenticated, ensureStaff, [
  // ตรวจสอบข้อมูลที่ส่งมา
  check('firstName', 'กรุณากรอกชื่อจริง').notEmpty(),
  check('lastName', 'กรุณากรอกนามสกุล').notEmpty(),
  check('email', 'กรุณากรอกอีเมลที่ถูกต้อง').isEmail(),
  check('phone', 'กรุณากรอกเบอร์โทรศัพท์').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/admin/student/${req.params.id}`);
    }

    const studentId = req.params.id;
    const { firstName, lastName, faculty, major, email, phone, address } = req.body;
    
    // อัพเดทข้อมูลนักศึกษา
    await Student.update(studentId, {
      firstName,
      lastName,
      faculty,
      major,
      email,
      phone,
      address
    });
    
    req.flash('success_msg', 'อัพเดทข้อมูลนักศึกษาเรียบร้อยแล้ว');
    res.redirect(`/admin/student/${studentId}`);
  } catch (error) {
    logger.error(`Error updating student: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลนักศึกษา');
    res.redirect(`/admin/student/${req.params.id}`);
  }
});

// รีเซ็ตรหัสผ่านนักศึกษา
router.post('/reset-student-password/:id', ensureAuthenticated, ensureStaff, async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // รีเซ็ตรหัสผ่านเป็นรหัสนักศึกษา
    const student = await Student.findById(studentId);
    
    if (!student) {
      req.flash('error_msg', 'ไม่พบข้อมูลนักศึกษา');
      return res.redirect('/admin/students');
    }
    
    // เปลี่ยนรหัสผ่านเป็นรหัสนักศึกษา
    await Student.changePassword(studentId, student.student_id);
    
    req.flash('success_msg', 'รีเซ็ตรหัสผ่านนักศึกษาเรียบร้อยแล้ว');
    res.redirect(`/admin/student/${studentId}`);
  } catch (error) {
    logger.error(`Error resetting student password: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่านนักศึกษา');
    res.redirect(`/admin/student/${req.params.id}`);
  }
});

module.exports = router;
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/admin/request/${req.params.id}`);
    }

    const requestId = req.params.id;
    const { status, notes } = req.body;
    
    // อัพเดทสถานะคำขอ
    const updatedRequest = await Request.updateStatus(requestId, status, notes, req.user.id);
    
    // ค้นหาคำขอที่อัพเดทแล้วเพื่อดึงข้อมูลเพิ่มเติม
    const request = await Request.findById(requestId);
    
    // ดึงข้อมูลนักศึกษา
    const student = await Student.findById(request.student_id);
    
    // ส่งอีเมลแจ้งเตือนการเปลี่ยนสถานะ
    const statusUpdateData = {
      reference: request.reference,
      documentType: translateDocumentType(request.document_type),
      oldStatus: translateStatus(request.statusHistory[1]?.status || 'pending'),
      newStatus: translateStatus(status),
      updateDate: formatThaiDate(new Date()),
      message: notes
    };
    
    await sendStatusUpdate(student.email, statusUpdateData);
    
    req.flash('success_msg', 'อัพเดทสถานะคำขอเรียบร้อยแล้ว');
    res.redirect(`/admin/request/${requestId}`);
  } catch (error) {
    logger.error(`Error updating request status: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการอัพเดทสถานะคำขอ');
    res.redirect(`/admin/request/${req.params.id}`);
  }
});

// ปฏิเสธคำขอ
router.post('/reject-request/:id', ensureAuthenticated, ensureStaff, [
  check('rejectReason', 'กรุณาระบุเหตุผลในการปฏิเสธ').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect(`/admin/request/${req.params.id}`);
    }

    const requestId = req.params.id;
    const { rejectReason } = req.body;
    
    // อัพเดทสถานะคำขอเป็น 'rejected'
    await Request.updateStatus(requestId, 'rejected', rejectReason, req.user.id);
    
    // ค้นหาคำขอที่อัพเดทแล้วเพื่อดึงข้อมูลเพิ่มเติม
    const request = await Request.findById(requestId);
    
    // ดึงข้อมูลนักศึกษา
    const student = await Student.findById(request.student_id);
    
    // ส่งอีเมลแจ้งเตือนการปฏิเสธคำขอ
    const statusUpdateData = {
      reference: request.reference,
      documentType: translateDocumentType(request.document_type),
      oldStatus: translateStatus(request.statusHistory[1]?.status || 'pending'),
      newStatus: 'ถูกปฏิเสธ',
      updateDate: formatThaiDate(new Date()),
      message: rejectReason
    };
    
    await sendStatusUpdate(student.email, statusUpdateData);
    
    req.flash('success_msg', 'ปฏิเสธคำขอเรียบร้อยแล้ว');
    res.redirect(`/admin/request/${requestId}`);
  } catch (error) {
    logger.error(`Error rejecting request: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
    res.redirect(`/admin/request/${req.params.id}`);
  }
});

// อัพเดทข้อมูลการชำระเงิน
router.post('/verify-payment/:id', ensureAuthenticated, ensureStaff, [
  check('verificationResult', 'กรุณาเลือกผลการตรวจสอบ').notEmpty()
], async (req, res) => {
  try {
    // ตรวจสอบว่ามีข้อผิดพลาดจากการตรวจสอบข้อมูลหรือไม่
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
