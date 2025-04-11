/**
 * models/User.js
 * โมเดลสำหรับผู้ใช้งานทั่วไป (สำหรับใช้ร่วมกันระหว่างนักศึกษาและเจ้าหน้าที่)
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

class User {
  /**
   * ตรวจสอบความถูกต้องของรหัสผ่าน
   * @param {string} enteredPassword - รหัสผ่านที่ป้อน
   * @param {string} storedPassword - รหัสผ่านที่เก็บในฐานข้อมูล
   * @returns {Promise<boolean>} ผลการตรวจสอบ
   */
  static async validatePassword(enteredPassword, storedPassword) {
    try {
      return await bcrypt.compare(enteredPassword, storedPassword);
    } catch (error) {
      logger.error(`Error validating password: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * เปลี่ยนรหัสผ่าน
   * @param {number} id - ID ในฐานข้อมูล
   * @param {string} newPassword - รหัสผ่านใหม่
   * @param {boolean} isStaff - เป็นเจ้าหน้าที่หรือไม่
   * @returns {Promise<boolean>} ผลการเปลี่ยนรหัสผ่าน
   */
  static async changePassword(id, newPassword, isStaff = true) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const table = isStaff ? 'staff' : 'students';
      
      const result = await db.query(
        `UPDATE ${table} SET password = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id`,
        [hashedPassword, id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error changing password: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาเจ้าหน้าที่ตาม ID
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<Object|null>} ข้อมูลเจ้าหน้าที่
   */
  static async findStaffById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM staff WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? { ...result.rows[0], isStaff: true } : null;
    } catch (error) {
      logger.error(`Error finding staff by ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาเจ้าหน้าที่ตามชื่อผู้ใช้
   * @param {string} username - ชื่อผู้ใช้
   * @returns {Promise<Object|null>} ข้อมูลเจ้าหน้าที่
   */
  static async findStaffByUsername(username) {
    try {
      const result = await db.query(
        'SELECT * FROM staff WHERE username = $1',
        [username]
      );
      
      return result.rows.length > 0 ? { ...result.rows[0], isStaff: true } : null;
    } catch (error) {
      logger.error(`Error finding staff by username: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * สร้างบัญชีเจ้าหน้าที่ใหม่
   * @param {Object} userData - ข้อมูลเจ้าหน้าที่
   * @returns {Promise<Object>} ข้อมูลเจ้าหน้าที่ที่สร้าง
   */
  static async createStaff(userData) {
    try {
      // เข้ารหัสรหัสผ่าน
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const result = await db.query(
        `INSERT INTO staff (username, password, first_name, last_name, 
          email, role, department, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
         RETURNING *`,
        [
          userData.username,
          hashedPassword,
          userData.firstName,
          userData.lastName,
          userData.email,
          userData.role || 'staff',
          userData.department
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating staff: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทข้อมูลเจ้าหน้าที่
   * @param {number} id - ID ในฐานข้อมูล
   * @param {Object} userData - ข้อมูลเจ้าหน้าที่ที่ต้องการอัพเดท
   * @returns {Promise<Object>} ข้อมูลเจ้าหน้าที่ที่อัพเดท
   */
  static async updateStaff(id, userData) {
    try {
      // สร้างค่า columns และ parameters สำหรับ SQL query
      const updateColumns = [];
      const queryParameters = [];
      let paramIndex = 1;
      
      // เพิ่มคอลัมน์ที่ต้องการอัพเดท
      if (userData.firstName) {
        updateColumns.push(`first_name = $${paramIndex++}`);
        queryParameters.push(userData.firstName);
      }
      
      if (userData.lastName) {
        updateColumns.push(`last_name = $${paramIndex++}`);
        queryParameters.push(userData.lastName);
      }
      
      if (userData.email) {
        updateColumns.push(`email = $${paramIndex++}`);
        queryParameters.push(userData.email);
      }
      
      if (userData.role) {
        updateColumns.push(`role = $${paramIndex++}`);
        queryParameters.push(userData.role);
      }
      
      if (userData.department) {
        updateColumns.push(`department = $${paramIndex++}`);
        queryParameters.push(userData.department);
      }
      
      updateColumns.push(`updated_at = NOW()`);
      
      // เพิ่ม ID เป็นพารามิเตอร์สุดท้าย
      queryParameters.push(id);
      
      const result = await db.query(
        `UPDATE staff SET ${updateColumns.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        queryParameters
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating staff: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ลบบัญชีเจ้าหน้าที่
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<boolean>} ผลการลบบัญชี
   */
  static async deleteStaff(id) {
    try {
      const result = await db.query(
        'DELETE FROM staff WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting staff: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลเจ้าหน้าที่ทั้งหมด
   * @returns {Promise<Array>} ข้อมูลเจ้าหน้าที่ทั้งหมด
   */
  static async findAllStaff() {
    try {
      const result = await db.query(
        'SELECT id, username, first_name, last_name, email, role, department, created_at, updated_at FROM staff'
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding all staff: ${error.message}`);
      throw error;
    }
  }
}

module.exports = User;
