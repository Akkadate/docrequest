const db = require('../config/database');
const { logger } = require('../utils/logger');
const { generateRequestRef } = require('../utils/helpers');

class Request {
  /**
   * สร้างคำขอเอกสารใหม่
   * @param {Object} requestData - ข้อมูลคำขอ
   * @returns {Promise<Object>} คำขอที่สร้าง
   */
  static async create(requestData) {
    try {
      // สร้างเลขที่คำขออ้างอิง
      const reference = generateRequestRef();
      
      const result = await db.query(
        `INSERT INTO document_requests (
          student_id, document_type, copies, purpose, 
          delivery_method, delivery_address, shipping_fee,
          document_fee, total_fee, payment_status, status,
          tracking_number, reference, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()) 
        RETURNING *`,
        [
          requestData.studentId,
          requestData.documentType,
          requestData.copies,
          requestData.purpose,
          requestData.deliveryMethod,
          requestData.deliveryAddress || null,
          requestData.shippingFee || 0,
          requestData.documentFee || 0,
          requestData.totalFee || 0,
          requestData.paymentStatus || 'pending',
          requestData.status || 'pending',
          requestData.trackingNumber || null,
          reference
        ]
      );
      
      // บันทึกประวัติสถานะ
      await db.query(
        `INSERT INTO request_status_history (
          request_id, status, notes, created_by, created_at
        ) 
        VALUES ($1, $2, $3, $4, NOW())`,
        [
          result.rows[0].id,
          'pending',
          'คำขอถูกสร้างขึ้น',
          requestData.studentId
        ]
      );
      
      // บันทึกเอกสารแนบ (ถ้ามี)
      if (requestData.attachments && requestData.attachments.length > 0) {
        for (const attachment of requestData.attachments) {
          await db.query(
            `INSERT INTO request_attachments (
              request_id, file_name, file_path, file_type, 
              original_name, created_at
            ) 
            VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              result.rows[0].id,
              attachment.fileName,
              attachment.filePath,
              attachment.fileType,
              attachment.originalName
            ]
          );
        }
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating document request: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาคำขอตาม ID
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<Object|null>} ข้อมูลคำขอ
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT r.*, 
          s.student_id AS student_number, 
          s.first_name, s.last_name, s.email, s.phone 
        FROM document_requests r
        JOIN students s ON r.student_id = s.id
        WHERE r.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const request = result.rows[0];
      
      // ดึงเอกสารแนบ
      const attachments = await db.query(
        'SELECT * FROM request_attachments WHERE request_id = $1',
        [id]
      );
      
      // ดึงประวัติสถานะ
      const statusHistory = await db.query(
        `SELECT h.*, 
          CASE 
            WHEN h.created_by_staff = true THEN st.first_name || ' ' || st.last_name
            ELSE s.first_name || ' ' || s.last_name
          END AS created_by_name
        FROM request_status_history h
        LEFT JOIN students s ON h.created_by = s.id AND h.created_by_staff = false
        LEFT JOIN staff st ON h.created_by = st.id AND h.created_by_staff = true
        WHERE h.request_id = $1
        ORDER BY h.created_at DESC`,
        [id]
      );
      
      return {
        ...request,
        attachments: attachments.rows,
        statusHistory: statusHistory.rows
      };
    } catch (error) {
      logger.error(`Error finding request by ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาคำขอตามเลขที่อ้างอิง
   * @param {string} reference - เลขที่อ้างอิง
   * @returns {Promise<Object|null>} ข้อมูลคำขอ
   */
  static async findByReference(reference) {
    try {
      const result = await db.query(
        `SELECT r.*, 
          s.student_id AS student_number, 
          s.first_name, s.last_name, s.email, s.phone 
        FROM document_requests r
        JOIN students s ON r.student_id = s.id
        WHERE r.reference = $1`,
        [reference]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const request = result.rows[0];
      
      // ดึงเอกสารแนบ
      const attachments = await db.query(
        'SELECT * FROM request_attachments WHERE request_id = $1',
        [request.id]
      );
      
      // ดึงประวัติสถานะ
      const statusHistory = await db.query(
        `SELECT h.*, 
          CASE 
            WHEN h.created_by_staff = true THEN st.first_name || ' ' || st.last_name
            ELSE s.first_name || ' ' || s.last_name
          END AS created_by_name
        FROM request_status_history h
        LEFT JOIN students s ON h.created_by = s.id AND h.created_by_staff = false
        LEFT JOIN staff st ON h.created_by = st.id AND h.created_by_staff = true
        WHERE h.request_id = $1
        ORDER BY h.created_at DESC`,
        [request.id]
      );
      
      return {
        ...request,
        attachments: attachments.rows,
        statusHistory: statusHistory.rows
      };
    } catch (error) {
      logger.error(`Error finding request by reference: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาคำขอทั้งหมดของนักศึกษา
   * @param {number} studentId - ID ของนักศึกษา
   * @returns {Promise<Array>} รายการคำขอ
   */
  static async findByStudentId(studentId) {
    try {
      const result = await db.query(
        `SELECT r.*, 
          s.student_id AS student_number, 
          s.first_name, s.last_name
        FROM document_requests r
        JOIN students s ON r.student_id = s.id
        WHERE r.student_id = $1
        ORDER BY r.created_at DESC`,
        [studentId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding requests by student ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทสถานะคำขอ
   * @param {number} id - ID ของคำขอ
   * @param {string} status - สถานะใหม่
   * @param {string} notes - หมายเหตุ
   * @param {number} staffId - ID ของเจ้าหน้าที่
   * @returns {Promise<Object>} คำขอที่อัพเดทแล้ว
   */
  static async updateStatus(id, status, notes, staffId) {
    try {
      // อัพเดทสถานะในตาราง document_requests
      const result = await db.query(
        `UPDATE document_requests 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING *`,
        [status, id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('ไม่พบคำขอที่ต้องการอัพเดท');
      }
      
      // บันทึกประวัติสถานะ
      await db.query(
        `INSERT INTO request_status_history (
          request_id, status, notes, created_by, created_by_staff, created_at
        ) 
        VALUES ($1, $2, $3, $4, true, NOW())`,
        [id, status, notes, staffId]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating request status: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทข้อมูลการชำระเงิน
   * @param {number} id - ID ของคำขอ
   * @param {Object} paymentData - ข้อมูลการชำระเงิน
   * @returns {Promise<Object>} คำขอที่อัพเดทแล้ว
   */
  static async updatePayment(id, paymentData) {
    try {
      const result = await db.query(
        `UPDATE document_requests 
        SET payment_method = $1, payment_reference = $2, 
            payment_date = $3, payment_status = $4, 
            updated_at = NOW() 
        WHERE id = $5 
        RETURNING *`,
        [
          paymentData.paymentMethod,
          paymentData.paymentReference,
          paymentData.paymentDate,
          paymentData.paymentStatus,
          id
        ]
      );
      
      if (result.rows.length === 0) {
        throw new Error('ไม่พบคำขอที่ต้องการอัพเดท');
      }
      
      // บันทึกประวัติการชำระเงิน
      await db.query(
        `INSERT INTO payment_history (
          request_id, amount, payment_method, payment_reference, 
          payment_date, payment_status, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          id,
          paymentData.amount,
          paymentData.paymentMethod,
          paymentData.paymentReference,
          paymentData.paymentDate,
          paymentData.paymentStatus
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating payment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทข้อมูลการจัดส่ง
   * @param {number} id - ID ของคำขอ
   * @param {Object} deliveryData - ข้อมูลการจัดส่ง
   * @returns {Promise<Object>} คำขอที่อัพเดทแล้ว
   */
  static async updateDelivery(id, deliveryData) {
    try {
      const result = await db.query(
        `UPDATE document_requests 
        SET delivery_date = $1, tracking_number = $2, 
            updated_at = NOW() 
        WHERE id = $3 
        RETURNING *`,
        [
          deliveryData.deliveryDate,
          deliveryData.trackingNumber,
          id
        ]
      );
      
      if (result.rows.length === 0) {
        throw new Error('ไม่พบคำขอที่ต้องการอัพเดท');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating delivery information: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาคำขอทั้งหมดตามเงื่อนไข
   * @param {Object} filters - เงื่อนไขการค้นหา
   * @returns {Promise<Array>} รายการคำขอ
   */
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT r.*, 
          s.student_id AS student_number, 
          s.first_name, s.last_name
        FROM document_requests r
        JOIN students s ON r.student_id = s.id
      `;
      
      const queryParams = [];
      const whereClauses = [];
      let paramIndex = 1;
      
      // เพิ่มเงื่อนไขการค้นหา
      if (filters.status) {
        whereClauses.push(`r.status = $${paramIndex++}`);
        queryParams.push(filters.status);
      }
      
      if (filters.documentType) {
        whereClauses.push(`r.document_type = $${paramIndex++}`);
        queryParams.push(filters.documentType);
      }
      
      if (filters.paymentStatus) {
        whereClauses.push(`r.payment_status = $${paramIndex++}`);
        queryParams.push(filters.paymentStatus);
      }
      
      if (filters.startDate) {
        // แก้ไขจุดที่มีปัญหา: แปลงวันที่ให้อยู่ในรูปแบบที่ PostgreSQL เข้าใจ
        let startDate;
        if (typeof filters.startDate === 'number') {
          // ถ้าเป็น timestamp ให้แปลงเป็น Date
          startDate = new Date(filters.startDate);
        } else if (filters.startDate instanceof Date) {
          startDate = filters.startDate;
        } else {
          // ถ้าเป็นรูปแบบอื่นๆ ให้พยายามแปลงเป็น Date
          startDate = new Date(filters.startDate);
        }
        
        // แปลงเป็น YYYY-MM-DD สำหรับใช้กับ PostgreSQL
        const formattedStartDate = startDate.toISOString().split('T')[0];
        
        whereClauses.push(`DATE(r.created_at) >= $${paramIndex++}`);
        queryParams.push(formattedStartDate);
      }
      
      if (filters.endDate) {
        // แก้ไขจุดที่มีปัญหา: แปลงวันที่ให้อยู่ในรูปแบบที่ PostgreSQL เข้าใจ
        let endDate;
        if (typeof filters.endDate === 'number') {
          // ถ้าเป็น timestamp ให้แปลงเป็น Date
          endDate = new Date(filters.endDate);
        } else if (filters.endDate instanceof Date) {
          endDate = filters.endDate;
        } else {
          // ถ้าเป็นรูปแบบอื่นๆ ให้พยายามแปลงเป็น Date
          endDate = new Date(filters.endDate);
        }
        
        // แปลงเป็น YYYY-MM-DD สำหรับใช้กับ PostgreSQL
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        whereClauses.push(`DATE(r.created_at) <= $${paramIndex++}`);
        queryParams.push(formattedEndDate);
      }
      
      if (filters.searchTerm) {
        whereClauses.push(`(
          r.reference ILIKE $${paramIndex} OR
          s.student_id ILIKE $${paramIndex} OR
          s.first_name ILIKE $${paramIndex} OR
          s.last_name ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }
      
      // เพิ่ม WHERE clause ถ้ามีเงื่อนไข
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      
      // เพิ่มการเรียงลำดับ
      query += ' ORDER BY r.created_at DESC';
      
      // เพิ่มการแบ่งหน้า
      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(filters.limit);
        
        if (filters.offset) {
          query += ` OFFSET $${paramIndex++}`;
          queryParams.push(filters.offset);
        }
      }
      
      const result = await db.query(query, queryParams);
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding requests: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * นับจำนวนคำขอตามเงื่อนไข
   * @param {Object} filters - เงื่อนไขการค้นหา
   * @returns {Promise<number>} จำนวนคำขอ
   */
  static async count(filters = {}) {
    try {
      let query = `
        SELECT COUNT(*) 
        FROM document_requests r
        JOIN students s ON r.student_id = s.id
      `;
      
      const queryParams = [];
      const whereClauses = [];
      let paramIndex = 1;
      
      // เพิ่มเงื่อนไขการค้นหา
      if (filters.status) {
        whereClauses.push(`r.status = $${paramIndex++}`);
        queryParams.push(filters.status);
      }
      
      if (filters.documentType) {
        whereClauses.push(`r.document_type = $${paramIndex++}`);
        queryParams.push(filters.documentType);
      }
      
      if (filters.paymentStatus) {
        whereClauses.push(`r.payment_status = $${paramIndex++}`);
        queryParams.push(filters.paymentStatus);
      }
      
      if (filters.startDate) {
        // แก้ไขจุดที่มีปัญหา: แปลงวันที่ให้อยู่ในรูปแบบที่ PostgreSQL เข้าใจ
        let startDate;
        if (typeof filters.startDate === 'number') {
          // ถ้าเป็น timestamp ให้แปลงเป็น Date
          startDate = new Date(filters.startDate);
        } else if (filters.startDate instanceof Date) {
          startDate = filters.startDate;
        } else {
          // ถ้าเป็นรูปแบบอื่นๆ ให้พยายามแปลงเป็น Date
          startDate = new Date(filters.startDate);
        }
        
        // แปลงเป็น YYYY-MM-DD สำหรับใช้กับ PostgreSQL
        const formattedStartDate = startDate.toISOString().split('T')[0];
        
        whereClauses.push(`DATE(r.created_at) >= $${paramIndex++}`);
        queryParams.push(formattedStartDate);
      }
      
      if (filters.endDate) {
        // แก้ไขจุดที่มีปัญหา: แปลงวันที่ให้อยู่ในรูปแบบที่ PostgreSQL เข้าใจ
        let endDate;
        if (typeof filters.endDate === 'number') {
          // ถ้าเป็น timestamp ให้แปลงเป็น Date
          endDate = new Date(filters.endDate);
        } else if (filters.endDate instanceof Date) {
          endDate = filters.endDate;
        } else {
          // ถ้าเป็นรูปแบบอื่นๆ ให้พยายามแปลงเป็น Date
          endDate = new Date(filters.endDate);
        }
        
        // แปลงเป็น YYYY-MM-DD สำหรับใช้กับ PostgreSQL
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        whereClauses.push(`DATE(r.created_at) <= $${paramIndex++}`);
        queryParams.push(formattedEndDate);
      }
      
      if (filters.searchTerm) {
        whereClauses.push(`(
          r.reference ILIKE $${paramIndex} OR
          s.student_id ILIKE $${paramIndex} OR
          s.first_name ILIKE $${paramIndex} OR
          s.last_name ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }
      
      // เพิ่ม WHERE clause ถ้ามีเงื่อนไข
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      
      const result = await db.query(query, queryParams);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Error counting requests: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * นับจำนวนคำขอในวันนี้
   * @returns {Promise<number>} จำนวนคำขอในวันนี้
   */
  static async countToday() {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM document_requests 
        WHERE DATE(created_at) = CURRENT_DATE
      `;
      
      const result = await db.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Error counting today's requests: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ยกเลิกคำขอ
   * @param {number} id - ID ของคำขอ
   * @param {string} reason - เหตุผลในการยกเลิก
   * @param {number} userId - ID ของผู้ยกเลิก
   * @param {boolean} isStaff - เป็นเจ้าหน้าที่หรือไม่
   * @returns {Promise<boolean>} ผลการยกเลิก
   */
  static async cancel(id, reason, userId, isStaff = false) {
    try {
      // อัพเดทสถานะในตาราง document_requests
      const result = await db.query(
        `UPDATE document_requests 
        SET status = 'cancelled', updated_at = NOW() 
        WHERE id = $1 
        RETURNING *`,
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('ไม่พบคำขอที่ต้องการยกเลิก');
      }
      
      // บันทึกประวัติสถานะ
      await db.query(
        `INSERT INTO request_status_history (
          request_id, status, notes, created_by, created_by_staff, created_at
        ) 
        VALUES ($1, 'cancelled', $2, $3, $4, NOW())`,
        [id, reason, userId, isStaff]
      );
      
      return true;
    } catch (error) {
      logger.error(`Error cancelling request: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Request;
