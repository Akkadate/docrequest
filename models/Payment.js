/**
 * models/Payment.js
 * โมเดลสำหรับจัดการข้อมูลการชำระเงิน
 */

const db = require('../config/database');
const { logger } = require('../utils/logger');

class Payment {
  /**
   * สร้างการชำระเงินใหม่
   * @param {Object} paymentData - ข้อมูลการชำระเงิน
   * @returns {Promise<Object>} ข้อมูลการชำระเงินที่สร้าง
   */
  static async create(paymentData) {
    try {
      const result = await db.query(
        `INSERT INTO payment_history (
          request_id, amount, payment_method, payment_reference, 
          payment_date, payment_status, transaction_id, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING *`,
        [
          paymentData.requestId,
          paymentData.amount,
          paymentData.paymentMethod,
          paymentData.paymentReference,
          paymentData.paymentDate,
          paymentData.paymentStatus,
          paymentData.transactionId || null
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating payment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาการชำระเงินตาม ID
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<Object|null>} ข้อมูลการชำระเงิน
   */
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM payment_history WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding payment by ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาการชำระเงินตามคำขอ
   * @param {number} requestId - ID ของคำขอ
   * @returns {Promise<Array>} ข้อมูลการชำระเงินทั้งหมดของคำขอ
   */
  static async findByRequestId(requestId) {
    try {
      const result = await db.query(
        'SELECT * FROM payment_history WHERE request_id = $1 ORDER BY payment_date DESC',
        [requestId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding payments by request ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาการชำระเงินล่าสุดของคำขอ
   * @param {number} requestId - ID ของคำขอ
   * @returns {Promise<Object|null>} ข้อมูลการชำระเงินล่าสุด
   */
  static async findLatestByRequestId(requestId) {
    try {
      const result = await db.query(
        'SELECT * FROM payment_history WHERE request_id = $1 ORDER BY payment_date DESC LIMIT 1',
        [requestId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding latest payment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทสถานะการชำระเงิน
   * @param {number} requestId - ID ของคำขอ
   * @param {string} status - สถานะการชำระเงินใหม่
   * @param {string} notes - หมายเหตุ
   * @param {number} staffId - ID ของเจ้าหน้าที่ที่อัพเดท
   * @returns {Promise<boolean>} ผลการอัพเดท
   */
  static async updateStatus(requestId, status, notes, staffId) {
    try {
      // หาการชำระเงินล่าสุด
      const latestPayment = await this.findLatestByRequestId(requestId);
      
      if (!latestPayment) {
        throw new Error('ไม่พบข้อมูลการชำระเงิน');
      }
      
      // อัพเดทสถานะการชำระเงิน
      const paymentResult = await db.query(
        `UPDATE payment_history 
         SET payment_status = $1, updated_at = NOW(), updated_by = $2 
         WHERE id = $3 
         RETURNING *`,
        [status, staffId, latestPayment.id]
      );
      
      // บันทึกประวัติการอัพเดทสถานะการชำระเงิน
      await db.query(
        `INSERT INTO payment_status_history (
          payment_id, status, notes, created_by, created_at
        ) 
        VALUES ($1, $2, $3, $4, NOW())`,
        [latestPayment.id, status, notes, staffId]
      );
      
      return paymentResult.rows.length > 0;
    } catch (error) {
      logger.error(`Error updating payment status: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาประวัติการเปลี่ยนสถานะการชำระเงิน
   * @param {number} paymentId - ID ของการชำระเงิน
   * @returns {Promise<Array>} ประวัติการเปลี่ยนสถานะการชำระเงิน
   */
  static async findStatusHistory(paymentId) {
    try {
      const result = await db.query(
        `SELECT h.*, 
          s.first_name || ' ' || s.last_name AS created_by_name
        FROM payment_status_history h
        LEFT JOIN staff s ON h.created_by = s.id
        WHERE h.payment_id = $1
        ORDER BY h.created_at DESC`,
        [paymentId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding payment status history: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * คำนวณยอดรวมการชำระเงินทั้งหมด
   * @param {Object} [filters={}] - เงื่อนไขการค้นหา
   * @returns {Promise<number>} ยอดรวม
   */
  static async calculateTotalAmount(filters = {}) {
    try {
      let query = `
        SELECT SUM(amount) AS total 
        FROM payment_history 
        WHERE payment_status = 'paid'
      `;
      
      const queryParams = [];
      const conditions = [];
      let paramIndex = 1;
      
      // เพิ่มเงื่อนไขการค้นหา
      if (filters.startDate) {
        conditions.push(`payment_date >= $${paramIndex++}`);
        queryParams.push(filters.startDate);
      }
      
      if (filters.endDate) {
        conditions.push(`payment_date <= $${paramIndex++}`);
        queryParams.push(filters.endDate);
      }
      
      if (filters.paymentMethod) {
        conditions.push(`payment_method = $${paramIndex++}`);
        queryParams.push(filters.paymentMethod);
      }
      
      // เพิ่ม WHERE clause ถ้ามีเงื่อนไข
      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }
      
      const result = await db.query(query, queryParams);
      
      return parseFloat(result.rows[0].total || 0);
    } catch (error) {
      logger.error(`Error calculating total amount: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * สรุปการชำระเงินตามช่วงเวลา
   * @param {Date} startDate - วันที่เริ่มต้น
   * @param {Date} endDate - วันที่สิ้นสุด
   * @param {string} groupBy - จัดกลุ่มตาม (day, month, year)
   * @returns {Promise<Array>} ข้อมูลสรุปการชำระเงิน
   */
  static async getSummaryByDate(startDate, endDate, groupBy = 'day') {
    try {
      let dateFormat = '';
      
      switch (groupBy) {
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'year':
          dateFormat = 'YYYY';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }
      
      const result = await db.query(
        `SELECT 
          TO_CHAR(payment_date, $1) AS date,
          SUM(amount) AS total_amount,
          COUNT(*) AS payment_count
        FROM payment_history
        WHERE payment_status = 'paid'
          AND payment_date >= $2
          AND payment_date <= $3
        GROUP BY TO_CHAR(payment_date, $1)
        ORDER BY date`,
        [dateFormat, startDate, endDate]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting payment summary: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * สรุปการชำระเงินตามวิธีการชำระเงิน
   * @param {Date} startDate - วันที่เริ่มต้น
   * @param {Date} endDate - วันที่สิ้นสุด
   * @returns {Promise<Array>} ข้อมูลสรุปการชำระเงิน
   */
  static async getSummaryByMethod(startDate, endDate) {
    try {
      const result = await db.query(
        `SELECT 
          payment_method,
          SUM(amount) AS total_amount,
          COUNT(*) AS payment_count
        FROM payment_history
        WHERE payment_status = 'paid'
          AND payment_date >= $1
          AND payment_date <= $2
        GROUP BY payment_method
        ORDER BY total_amount DESC`,
        [startDate, endDate]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting payment method summary: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Payment;
