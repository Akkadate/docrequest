const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./database');
const { logger } = require('../utils/logger');

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'studentId' }, async (studentId, password, done) => {
      try {
        // ค้นหานักศึกษาในฐานข้อมูล
        const result = await db.query(
          'SELECT * FROM students WHERE student_id = $1',
          [studentId]
        );

        if (result.rows.length === 0) {
          return done(null, false, { message: 'รหัสนักศึกษาไม่ถูกต้อง' });
        }

        const student = result.rows[0];

        // ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, student.password);

        if (isMatch) {
          return done(null, student);
        } else {
          return done(null, false, { message: 'รหัสผ่านไม่ถูกต้อง' });
        }
      } catch (err) {
        logger.error('Passport authentication error:', err);
        return done(err);
      }
    })
  );

  // สร้าง Strategy สำหรับเจ้าหน้าที่
  passport.use(
    'staff-local',
    new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
      try {
        // ค้นหาเจ้าหน้าที่ในฐานข้อมูล
        const result = await db.query(
          'SELECT * FROM staff WHERE username = $1',
          [username]
        );

        if (result.rows.length === 0) {
          return done(null, false, { message: 'ชื่อผู้ใช้ไม่ถูกต้อง' });
        }

        const staff = result.rows[0];

        // ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, staff.password);

        if (isMatch) {
          return done(null, { ...staff, isStaff: true });
        } else {
          return done(null, false, { message: 'รหัสผ่านไม่ถูกต้อง' });
        }
      } catch (err) {
        logger.error('Staff authentication error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, { id: user.id, isStaff: user.isStaff || false });
  });

  passport.deserializeUser(async (data, done) => {
    try {
      if (data.isStaff) {
        const result = await db.query('SELECT * FROM staff WHERE id = $1', [data.id]);
        if (result.rows.length > 0) {
          done(null, { ...result.rows[0], isStaff: true });
        } else {
          done(new Error('ไม่พบข้อมูลเจ้าหน้าที่'));
        }
      } else {
        const result = await db.query('SELECT * FROM students WHERE id = $1', [data.id]);
        if (result.rows.length > 0) {
          done(null, result.rows[0]);
        } else {
          done(new Error('ไม่พบข้อมูลนักศึกษา'));
        }
      }
    } catch (err) {
      logger.error('Deserialize user error:', err);
      done(err);
    }
  });
};
