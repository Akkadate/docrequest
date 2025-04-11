/**
 * models/Document.js
 * โมเดลสำหรับจัดการข้อมูลเอกสาร
 */

const db = require('../config/database');
const { logger } = require('../utils/logger');

class Document {
  /**
   * ค้นหาประเภทเอกสารตาม ID
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<Object|null>} ข้อมูลประเภทเอกสาร
   */
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM document_types WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding document type by ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาประเภทเอกสารตามชื่อ
   * @param {string} code - รหัสประเภทเอกสาร
   * @returns {Promise<Object|null>} ข้อมูลประเภทเอกสาร
   */
  static async findByCode(code) {
    try {
      const result = await db.query(
        'SELECT * FROM document_types WHERE code = $1',
        [code]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding document type by code: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลประเภทเอกสารทั้งหมด
   * @returns {Promise<Array>} ข้อมูลประเภทเอกสารทั้งหมด
   */
  static async findAllTypes() {
    try {
      const result = await db.query(
        'SELECT * FROM document_types ORDER BY name_th'
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding all document types: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาไฟล์แนบตาม ID
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<Object|null>} ข้อมูลไฟล์แนบ
   */
  static async findAttachmentById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM request_attachments WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding attachment by ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาไฟล์แนบตามคำขอ
   * @param {number} requestId - ID ของคำขอ
   * @returns {Promise<Array>} ข้อมูลไฟล์แนบ
   */
  static async findAttachmentsByRequestId(requestId) {
    try {
      const result = await db.query(
        'SELECT * FROM request_attachments WHERE request_id = $1 ORDER BY created_at',
        [requestId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`Error finding attachments by request ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * เพิ่มไฟล์แนบ
   * @param {Object} attachmentData - ข้อมูลไฟล์แนบ
   * @returns {Promise<Object>} ข้อมูลไฟล์แนบที่เพิ่ม
   */
  static async addAttachment(attachmentData) {
    try {
      const result = await db.query(
        `INSERT INTO request_attachments (
          request_id, file_name, file_path, file_type, 
          original_name, attachment_type, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
        RETURNING *`,
        [
          attachmentData.requestId,
          attachmentData.fileName,
          attachmentData.filePath,
          attachmentData.fileType,
          attachmentData.originalName,
          attachmentData.attachmentType || 'document'
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error adding attachment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ลบไฟล์แนบ
   * @param {number} id - ID ในฐานข้อมูล
   * @returns {Promise<boolean>} ผลการลบไฟล์แนบ
   */
  static async deleteAttachment(id) {
    try {
      // ค้นหาข้อมูลไฟล์แนบก่อนลบเพื่อใช้ลบไฟล์จริง
      const attachment = await this.findAttachmentById(id);
      
      if (!attachment) {
        return false;
      }
      
      // ลบข้อมูลจากฐานข้อมูล
      const result = await db.query(
        'DELETE FROM request_attachments WHERE id = $1 RETURNING id',
        [id]
      );
      
      // ถ้าลบข้อมูลสำเร็จให้ลบไฟล์จริง
      if (result.rows.length > 0) {
        try {
          const fs = require('fs');
          if (fs.existsSync(attachment.file_path)) {
            fs.unlinkSync(attachment.file_path);
          }
        } catch (fileError) {
          logger.error(`Error deleting file: ${fileError.message}`);
          // ไม่ throw error เพราะยังถือว่าลบข้อมูลในฐานข้อมูลสำเร็จ
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error deleting attachment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * สร้างเอกสารดิจิทัล
   * @param {Object} documentData - ข้อมูลเอกสาร
   * @returns {Promise<Object>} ข้อมูลเอกสารที่สร้าง
   */
  static async createDigitalDocument(documentData) {
    try {
      const result = await db.query(
        `INSERT INTO digital_documents (
          request_id, file_name, file_path, file_type, 
          original_name, document_type, created_by, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING *`,
        [
          documentData.requestId,
          documentData.fileName,
          documentData.filePath,
          documentData.fileType,
          documentData.originalName,
          documentData.documentType,
          documentData.createdBy
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating digital document: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาเอกสารดิจิทัลตามคำขอ
   * @param {number} requestId - ID ของคำขอ
   * @returns {Promise<Object|null>} ข้อมูลเอกสารดิจิทัล
   */
  static async findDigitalDocumentByRequestId(requestId) {
    try {
      const result = await db.query(
        'SELECT * FROM digital_documents WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1',
        [requestId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding digital document: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * สร้างประเภทเอกสารใหม่ (สำหรับผู้ดูแลระบบ)
   * @param {Object} typeData - ข้อมูลประเภทเอกสาร
   * @returns {Promise<Object>} ข้อมูลประเภทเอกสารที่สร้าง
   */
  static async createDocumentType(typeData) {
    try {
      const result = await db.query(
        `INSERT INTO document_types (
          code, name_th, name_en, fee, processing_days, 
          requires_attachment, is_active, created_by, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
        RETURNING *`,
        [
          typeData.code,
          typeData.nameTh,
          typeData.nameEn,
          typeData.fee,
          typeData.processingDays,
          typeData.requiresAttachment || false,
          typeData.isActive || true,
          typeData.createdBy
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating document type: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทประเภทเอกสาร (สำหรับผู้ดูแลระบบ)
   * @param {number} id - ID ในฐานข้อมูล
   * @param {Object} typeData - ข้อมูลประเภทเอกสารที่ต้องการอัพเดท
   * @returns {Promise<Object>} ข้อมูลประเภทเอกสารที่อัพเดท
   */
  static async updateDocumentType(id, typeData) {
    try {
      // สร้างค่า columns และ parameters สำหรับ SQL query
      const updateColumns = [];
      const queryParameters = [];
      let paramIndex = 1;
      
      // เพิ่มคอลัมน์ที่ต้องการอัพเดท
      if (typeData.nameTh) {
        updateColumns.push(`name_th = ${paramIndex++}`);
        queryParameters.push(typeData.nameTh);
      }
      
      if (typeData.nameEn) {
        updateColumns.push(`name_en = ${paramIndex++}`);
        queryParameters.push(typeData.nameEn);
      }
      
      if (typeData.fee !== undefined) {
        updateColumns.push(`fee = ${paramIndex++}`);
        queryParameters.push(typeData.fee);
      }
      
      if (typeData.processingDays !== undefined) {
        updateColumns.push(`processing_days = ${paramIndex++}`);
        queryParameters.push(typeData.processingDays);
      }
      
      if (typeData.requiresAttachment !== undefined) {
        updateColumns.push(`requires_attachment = ${paramIndex++}`);
        queryParameters.push(typeData.requiresAttachment);
      }
      
      if (typeData.isActive !== undefined) {
        updateColumns.push(`is_active = ${paramIndex++}`);
        queryParameters.push(typeData.isActive);
      }
      
      updateColumns.push(`updated_at = NOW()`);
      
      // เพิ่ม ID เป็นพารามิเตอร์สุดท้าย
      queryParameters.push(id);
      
      const result = await db.query(
        `UPDATE document_types SET ${updateColumns.join(', ')} 
         WHERE id = ${paramIndex} 
         RETURNING *`,
        queryParameters
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating document type: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * เปิด/ปิดการใช้งานประเภทเอกสาร
   * @param {number} id - ID ในฐานข้อมูล
   * @param {boolean} isActive - สถานะการใช้งาน
   * @returns {Promise<boolean>} ผลการอัพเดท
   */
  static async toggleDocumentTypeActive(id, isActive) {
    try {
      const result = await db.query(
        `UPDATE document_types SET is_active = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id`,
        [isActive, id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error toggling document type active: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ค้นหาเทมเพลตเอกสาร
   * @param {string} documentType - ประเภทเอกสาร
   * @returns {Promise<Object|null>} ข้อมูลเทมเพลตเอกสาร
   */
  static async findTemplateByType(documentType) {
    try {
      const result = await db.query(
        'SELECT * FROM document_templates WHERE document_type = $1 AND is_active = true',
        [documentType]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error finding document template: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * สร้างเทมเพลตเอกสาร
   * @param {Object} templateData - ข้อมูลเทมเพลตเอกสาร
   * @returns {Promise<Object>} ข้อมูลเทมเพลตเอกสารที่สร้าง
   */
  static async createTemplate(templateData) {
    try {
      const result = await db.query(
        `INSERT INTO document_templates (
          document_type, template_file, template_name, 
          is_active, created_by, created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, NOW()) 
        RETURNING *`,
        [
          templateData.documentType,
          templateData.templateFile,
          templateData.templateName,
          templateData.isActive || true,
          templateData.createdBy
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating document template: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * อัพเดทเทมเพลตเอกสาร
   * @param {number} id - ID ในฐานข้อมูล
   * @param {Object} templateData - ข้อมูลเทมเพลตเอกสารที่ต้องการอัพเดท
   * @returns {Promise<Object>} ข้อมูลเทมเพลตเอกสารที่อัพเดท
   */
  static async updateTemplate(id, templateData) {
    try {
      // สร้างค่า columns และ parameters สำหรับ SQL query
      const updateColumns = [];
      const queryParameters = [];
      let paramIndex = 1;
      
      // เพิ่มคอลัมน์ที่ต้องการอัพเดท
      if (templateData.templateFile) {
        updateColumns.push(`template_file = ${paramIndex++}`);
        queryParameters.push(templateData.templateFile);
      }
      
      if (templateData.templateName) {
        updateColumns.push(`template_name = ${paramIndex++}`);
        queryParameters.push(templateData.templateName);
      }
      
      if (templateData.isActive !== undefined) {
        updateColumns.push(`is_active = ${paramIndex++}`);
        queryParameters.push(templateData.isActive);
      }
      
      updateColumns.push(`updated_at = NOW()`);
      
      // เพิ่ม ID เป็นพารามิเตอร์สุดท้าย
      queryParameters.push(id);
      
      const result = await db.query(
        `UPDATE document_templates SET ${updateColumns.join(', ')} 
         WHERE id = ${paramIndex} 
         RETURNING *`,
        queryParameters
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating document template: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Document;
