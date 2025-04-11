const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

class Student {
  /**
   * ค้นหานักศึกษาตามรหัสนักศึกษา
   * @param {string} studentId - รหัสนักศึกษา
   * @returns {Promise<Object|null>} ข้อมูลนักศึกษา
   */
  static async findByStudentId(studentId) {
    try {
      const result = await db.query(
        'SELECT * FROM students WHERE student_id = $1',
        [studentId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding student by ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหานักศึกษาตาม ID
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<Object|null>} ข้อมูลนักศึกษา
   */
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM students WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding student by database ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * เพิ่มนักศึกษาใหม่
   * @param {Object} studentData - ข้อมูลนักศึกษา
   * @returns {Promise<Object>} ข้อมูลนักศึกษาที่เพิ่ม
   */
  static async create(studentData) {
    try {
      // เข้ารหัสรหัสผ่าน
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(studentData.password, salt);
      
      const result = await db.query(
        `INSERT INTO students (student_id, password, first_name, last_name, 
          faculty, major, email, phone, address, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
         RETURNING *`,
        [
          studentData.studentId,
          hashedPassword,
          studentData.firstName,
          studentData.lastName,
          studentData.faculty,
          studentData.major,
          studentData.email,
          studentData.phone,
          studentData.address
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating student: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทข้อมูลนักศึกษา
   * @param {number} id - ID ในฐานข้อมูล
   * @param {Object} studentData - ข้อมูลนักศึกษาที่ต้องการอัพเดท
   * @returns {Promise<Object>} ข้อมูลนักศึกษาที่อัพเดท
   */
  static async update(id, studentData) {
    try {
      // ตรวจสอบว่ามีรหัสผ่านที่ต้องอัพเดทหรือไม่
      let hashedPassword = null;
      if (studentData.password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(studentData.password, salt);
      }
      
      // สร้างค่า columns และ parameters สำหรับ SQL query
      const updateColumns = [];
      const queryParameters = [];
      let paramIndex = 1;
      
      // เพิ่มคอลัมน์ที่ต้องการอัพเดท
      if (studentData.firstName) {
        updateColumns.push(`first_name = $${paramIndex++}`);
        queryParameters.push(studentData.firstName);
      }
      
      if (studentData.lastName) {
        updateColumns.push(`last_name = $${paramIndex++}`);
        queryParameters.push(studentData.lastName);
      }
      
      if (studentData.faculty) {
        updateColumns.push(`faculty = $${paramIndex++}`);
        queryParameters.push(studentData.faculty);
      }
      
      if (studentData.major) {
        updateColumns.push(`major = $${paramIndex++}`);
        queryParameters.push(studentData.major);
      }
      
      if (studentData.email) {
        updateColumns.push(`email = $${paramIndex++}`);
        queryParameters.push(studentData.email);
      }
      
      if (studentData.phone) {
        updateColumns.push(`phone = $${paramIndex++}`);
        queryParameters.push(studentData.phone);
      }
      
      if (studentData.address) {
        updateColumns.push(`address = $${paramIndex++}`);
        queryParameters.push(studentData.address);
      }
      
      if (hashedPassword) {
        updateColumns.push(`password = $${paramIndex++}`);
        queryParameters.push(hashedPassword);
      }
      
      updateColumns.push(`updated_at = NOW()`);
      
      // เพิ่ม ID เป็นพารามิเตอร์สุดท้าย
      queryParameters.push(id);
      
      const result = await db.query(
        `UPDATE students SET ${updateColumns.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        queryParameters
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating student: ${error.message}`);
      throw error;
    }
  }
  
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
   * @returns {Promise<boolean>} ผลการเปลี่ยนรหัสผ่าน
   */
  static async changePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const result = await db.query(
        `UPDATE students SET password = $1, updated_at = NOW() 
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
   * ลบข้อมูลนักศึกษา
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<boolean>} ผลการลบข้อมูล
   */
  static async delete(id) {
    try {
      const result = await db.query(
        'DELETE FROM students WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error deleting student: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลนักศึกษาทั้งหมด
   * @returns {Promise<Array>} ข้อมูลนักศึกษาทั้งหมด
   */
  static async findAll() {
    try {
      const result = await db.query(
        'SELECT id, student_id, first_name, last_name, faculty, major, email, phone, created_at, updated_at FROM students'
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding all students: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Student;
