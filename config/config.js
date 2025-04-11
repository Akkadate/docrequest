require('dotenv').config();

module.exports = {
  // ข้อมูลเกี่ยวกับแอปพลิเคชัน
  app: {
    name: 'ระบบขอเอกสารออนไลน์สำหรับนักศึกษา',
    port: process.env.PORT || 4100,
    env: process.env.NODE_ENV || 'development',
    url: process.env.APP_URL || 'http://localhost:4100'
  },
  
  // ข้อมูลเกี่ยวกับฐานข้อมูล
  database: {
    host: process.env.DB_HOST || 'remote.devapp.cc',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'student_docs',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Tct85329$'
  },
  
  // ข้อมูลเกี่ยวกับอีเมล
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'noreply@northbkk.ac.th',
    pass: process.env.EMAIL_PASS || 'your-email-password',
    from: process.env.EMAIL_FROM || 'สำนัก
