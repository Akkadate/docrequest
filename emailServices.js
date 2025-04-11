const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// สร้าง transporter สำหรับการส่งอีเมล
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ทดสอบการเชื่อมต่อ
const verifyConnection = async () => {
  try {
    await transporter.verify();
    logger.info('Email service is ready to send emails');
    return true;
  } catch (error) {
    logger.error(`Email service connection error: ${error.message}`);
    return false;
  }
};

// ฟังก์ชันส่งอีเมลแจ้งเตือนการสร้างคำขอใหม่
const sendRequestConfirmation = async (studentEmail, requestData) => {
  try {
    const mailOptions = {
      from: `"ระบบขอเอกสารออนไลน์" <${process.env.EMAIL_FROM}>`,
      to: studentEmail,
      subject: `ยืนยันการขอเอกสาร #${requestData.reference}`,
      html: `
        <div style="font-family: 'Sarabun', 'THSarabun', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3f51b5;">ยืนยันการขอเอกสาร</h2>
          <p>เรียน นักศึกษา,</p>
          <p>ระบบได้รับคำขอเอกสารของคุณเรียบร้อยแล้ว โดยมีรายละเอียดดังนี้:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>เลขที่คำขอ:</strong> ${requestData.reference}</p>
            <p><strong>ประเภทเอกสาร:</strong> ${requestData.documentType}</p>
            <p><strong>จำนวน:</strong> ${requestData.copies} ฉบับ</p>
            <p><strong>วิธีรับเอกสาร:</strong> ${requestData.deliveryMethod}</p>
            <p><strong>วันที่ขอ:</strong> ${requestData.requestDate}</p>
            <p><strong>ระยะเวลาดำเนินการโดยประมาณ:</strong> ${requestData.estimatedDays} วันทำการ</p>
          </div>
          
          <p>คุณสามารถติดตามสถานะคำขอได้ที่ <a href="${process.env.SITE_URL}/student/track-status?ref=${requestData.reference}" style="color: #3f51b5;">ระบบติดตามคำขอเอกสาร</a></p>
          
          <p>หากมีข้อสงสัย กรุณาติดต่อสำนักทะเบียนและประมวลผลการศึกษา</p>
          <p>โทร: 02-XXX-XXXX</p>
          <p>อีเมล: registrar@nordbkk.ac.th</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
            <p>อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            <p>&copy; ${new Date().getFullYear()} มหาวิทยาลัยนอร์กรุงเทพ สงวนลิขสิทธิ์</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email confirmation sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending confirmation email: ${error.message}`);
    return false;
  }
};

// ฟังก์ชันส่งอีเมลแจ้งเตือนการเปลี่ยนสถานะ
const sendStatusUpdate = async (studentEmail, requestData) => {
  try {
    const mailOptions = {
      from: `"ระบบขอเอกสารออนไลน์" <${process.env.EMAIL_FROM}>`,
      to: studentEmail,
      subject: `อัพเดทสถานะคำขอ #${requestData.reference}`,
      html: `
        <div style="font-family: 'Sarabun', 'THSarabun', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3f51b5;">อัพเดทสถานะคำขอเอกสาร</h2>
          <p>เรียน นักศึกษา,</p>
          <p>คำขอเอกสารของคุณมีการเปลี่ยนแปลงสถานะ โดยมีรายละเอียดดังนี้:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>เลขที่คำขอ:</strong> ${requestData.reference}</p>
            <p><strong>ประเภทเอกสาร:</strong> ${requestData.documentType}</p>
            <p><strong>สถานะเดิม:</strong> ${requestData.oldStatus}</p>
            <p><strong>สถานะใหม่:</strong> ${requestData.newStatus}</p>
            <p><strong>วันที่อัพเดท:</strong> ${requestData.updateDate}</p>
            ${requestData.message ? `<p><strong>ข้อความเพิ่มเติม:</strong> ${requestData.message}</p>` : ''}
          </div>
          
          <p>คุณสามารถติดตามสถานะคำขอได้ที่ <a href="${process.env.SITE_URL}/student/track-status?ref=${requestData.reference}" style="color: #3f51b5;">ระบบติดตามคำขอเอกสาร</a></p>
          
          <p>หากมีข้อสงสัย กรุณาติดต่อสำนักทะเบียนและประมวลผลการศึกษา</p>
          <p>โทร: 02-XXX-XXXX</p>
          <p>อีเมล: registrar@nordbkk.ac.th</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
            <p>อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            <p>&copy; ${new Date().getFullYear()} มหาวิทยาลัยนอร์กรุงเทพ สงวนลิขสิทธิ์</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Status update email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending status update email: ${error.message}`);
    return false;
  }
};

// ฟังก์ชันส่งอีเมลแจ้งเตือนการมีคำขอใหม่ให้กับเจ้าหน้าที่
const sendNewRequestNotification = async (staffEmails, requestData) => {
  try {
    const mailOptions = {
      from: `"ระบบขอเอกสารออนไลน์" <${process.env.EMAIL_FROM}>`,
      to: staffEmails,
      subject: `[แจ้งเตือน] มีคำขอเอกสารใหม่ #${requestData.reference}`,
      html: `
        <div style="font-family: 'Sarabun', 'THSarabun', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3f51b5;">แ
