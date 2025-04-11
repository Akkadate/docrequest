/**
 * controllers/documentController.js
 * คอนโทรลเลอร์สำหรับจัดการเกี่ยวกับเอกสารและไฟล์
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../config/database');
const Document = require('../models/Document');
const Request = require('../models/Request');
const { calculateFees, translateStatus, translateDocumentType, translateDeliveryMethod } = require('../utils/helpers');
const { logger } = require('../utils/logger');

/**
 * ดาวน์โหลดไฟล์แนบ
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const attachmentId = req.params.id;
    
    // ดึงข้อมูลไฟล์แนบ
    const attachmentQuery = await db.query(
      'SELECT * FROM request_attachments WHERE id = $1',
      [attachmentId]
    );
    
    if (attachmentQuery.rows.length === 0) {
      req.flash('error_msg', 'ไม่พบไฟล์แนบที่ต้องการ');
      return res.redirect('back');
    }
    
    const attachment = attachmentQuery.rows[0];
    
    // ดึงข้อมูลคำขอ
    const requestQuery = await db.query(
      'SELECT * FROM document_requests WHERE id = $1',
      [attachment.request_id]
    );
    
    if (requestQuery.rows.length === 0) {
      req.flash('error_msg', 'ไม่พบคำขอที่เกี่ยวข้องกับไฟล์แนบนี้');
      return res.redirect('back');
    }
    
    const request = requestQuery.rows[0];
    
    // ตรวจสอบสิทธิ์การเข้าถึง (นักศึกษาหรือเจ้าหน้าที่)
    if (!req.user.isStaff && req.user.id !== request.student_id) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงไฟล์นี้');
      return res.redirect('back');
    }
    
    // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
    const filePath = attachment.file_path;
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      req.flash('error_msg', 'ไม่พบไฟล์ในระบบ');
      return res.redirect('back');
    }
    
    // ดาวน์โหลดไฟล์
    const fileName = attachment.original_name || attachment.file_name;
    res.download(filePath, fileName);
  } catch (error) {
    logger.error(`Error downloading attachment: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    res.redirect('back');
  }
};

/**
 * ดูเอกสารดิจิทัล
 */
exports.viewDocument = async (req, res) => {
  try {
    const attachmentId = req.params.id;
    
    // ดึงข้อมูลไฟล์แนบ
    const attachmentQuery = await db.query(
      'SELECT * FROM request_attachments WHERE id = $1',
      [attachmentId]
    );
    
    if (attachmentQuery.rows.length === 0) {
      req.flash('error_msg', 'ไม่พบไฟล์แนบที่ต้องการ');
      return res.redirect('back');
    }
    
    const attachment = attachmentQuery.rows[0];
    
    // ดึงข้อมูลคำขอ
    const requestQuery = await db.query(
      'SELECT * FROM document_requests WHERE id = $1',
      [attachment.request_id]
    );
    
    if (requestQuery.rows.length === 0) {
      req.flash('error_msg', 'ไม่พบคำขอที่เกี่ยวข้องกับไฟล์แนบนี้');
      return res.redirect('back');
    }
    
    const request = requestQuery.rows[0];
    
    // ตรวจสอบสิทธิ์การเข้าถึง (นักศึกษาหรือเจ้าหน้าที่)
    if (!req.user.isStaff && req.user.id !== request.student_id) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงไฟล์นี้');
      return res.redirect('back');
    }
    
    // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
    const filePath = attachment.file_path;
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      req.flash('error_msg', 'ไม่พบไฟล์ในระบบ');
      return res.redirect('back');
    }
    
    // แสดงไฟล์ (เฉพาะ PDF)
    if (attachment.file_type === 'application/pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name || attachment.file_name}"`);
      fs.createReadStream(filePath).pipe(res);
    } else {
      // ถ้าไม่ใช่ PDF ให้ดาวน์โหลดแทน
      res.download(filePath, attachment.original_name || attachment.file_name);
    }
  } catch (error) {
    logger.error(`Error viewing document: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการดูเอกสาร');
    res.redirect('back');
  }
};

/**
 * คำนวณค่าธรรมเนียม
 */
exports.calculateFees = (req, res) => {
  try {
    const { documentType, copies, deliveryMethod } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!documentType || !copies || !deliveryMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณาระบุข้อมูลให้ครบถ้วน' 
      });
    }
    
    // คำนวณค่าธรรมเนียม
    const fees = calculateFees(documentType, parseInt(copies), deliveryMethod);
    
    res.json({
      success: true,
      fees
    });
  } catch (error) {
    logger.error(`Error calculating fees: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการคำนวณค่าธรรมเนียม' 
    });
  }
};

/**
 * สร้าง QR Code สำหรับการชำระเงิน
 */
exports.generatePaymentQR = async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // ดึงข้อมูลคำขอ
    const request = await Request.findById(requestId);
    
    if (!request) {
      req.flash('error_msg', 'ไม่พบคำขอที่ต้องการชำระเงิน');
      return res.redirect('back');
    }
    
    // ตรวจสอบสิทธิ์การเข้าถึง (นักศึกษาหรือเจ้าหน้าที่)
    if (!req.user.isStaff && req.user.id !== request.student_id) {
      req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
      return res.redirect('back');
    }
    
    // ตรวจสอบว่าต้องชำระเงินหรือไม่
    if (request.payment_status !== 'pending') {
      req.flash('error_msg', 'คำขอนี้ไม่อยู่ในสถานะที่ต้องชำระเงิน');
      return res.redirect('back');
    }
    
    // สร้างข้อมูลสำหรับ QR Code
    const qrData = JSON.stringify({
      reference: request.reference,
      amount: request.total_fee,
      description: `ค่าธรรมเนียมเอกสาร ${request.reference}`
    });
    
    // สร้าง QR Code เป็นรูปภาพ
    const qrImage = await QRCode.toDataURL(qrData);
    
    res.render('payment-qr', {
      title: 'QR Code ชำระเงิน - ระบบขอเอกสารออนไลน์',
      user: req.user,
      request,
      qrImage
    });
  } catch (error) {
    logger.error(`Error generating payment QR: ${error.message}`);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการสร้าง QR Code');
    res.redirect('back');
  }
};

/**
 * ตรวจสอบสถานะคำขอ (API)
 */
exports.checkRequestStatus = async (req, res) => {
  try {
    const reference = req.params.reference;
    
    // ค้นหาคำขอตามเลขที่อ้างอิง
    const request = await Request.findByReference(reference);
    
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบคำขอตามเลขที่อ้างอิงที่ระบุ' 
      });
    }
    
    // แปลงข้อมูลสถานะเป็นภาษาไทย
    const statusInfo = {
      reference: request.reference,
      status: request.status,
      statusThai: translateStatus(request.status),
      createdAt: request.created_at,
      documentType: translateDocumentType(request.document_type),
      deliveryMethod: translateDeliveryMethod(request.delivery_method)
    };
    
    res.json({
      success: true,
      statusInfo
    });
  } catch (error) {
    logger.error(`Error checking request status: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะคำขอ' 
    });
  }
};
