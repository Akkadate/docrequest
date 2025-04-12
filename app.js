const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const { logger } = require('./utils/logger');

// โหลดการตั้งค่าจากไฟล์ .env
dotenv.config();

// เริ่มต้นแอปพลิเคชัน Express
const app = express();

// การตั้งค่าความปลอดภัย
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'code.jquery.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'],
      connectSrc: ["'self'"]
    },
  },
}));


// ตั้งค่า CORS
app.use(cors());

// ตั้งค่า Passport
require('./config/passport')(passport);

// Middleware สำหรับ Body Parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// การตั้งค่า EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// ตั้งค่าโฟลเดอร์สาธารณะ
app.use(express.static(path.join(__dirname, 'public')));

// การตั้งค่า Express Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000, // 1 ชั่วโมง
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

// ตั้งค่า Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// ตั้งค่า Connect Flash
app.use(flash());

// Global Variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// เส้นทาง (Routes)
//app.use('/', require('./routes/auth'));
app.use('/auth', require('./routes/auth'));

app.use('/student', require('./routes/student'));
app.use('/admin', require('./routes/admin'));
app.use('/documents', require('./routes/documents'));

// หน้าแรก
app.get('/', (req, res) => {
  // ตรวจสอบว่าเข้าสู่ระบบแล้วหรือไม่
  if (req.isAuthenticated()) {
    if (req.user.isStaff) {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/student/main-menu');
    }
  }
  
  // ถ้ายังไม่ได้เข้าสู่ระบบ แสดงหน้า login
  res.render('login', {
    title: 'เข้าสู่ระบบ - ระบบขอเอกสารออนไลน์สำหรับนักศึกษา',
    layout: 'layouts/auth'
  });
});

// จัดการหน้า 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - ไม่พบหน้าที่คุณต้องการ',
    layout: 'layouts/error'
  });
});

// จัดการข้อผิดพลาด
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).render('error', {
    title: 'เกิดข้อผิดพลาด',
    message: process.env.NODE_ENV === 'development' ? err.message : 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
    layout: 'layouts/error'
  });
});

module.exports = app;
