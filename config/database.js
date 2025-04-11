const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// สร้างการเชื่อมต่อกับฐานข้อมูล PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ทดสอบการเชื่อมต่อ
pool.connect((err, client, release) => {
  if (err) {
    console.error('การเชื่อมต่อกับฐานข้อมูลล้มเหลว:', err.stack);
  } else {
    console.log('เชื่อมต่อกับฐานข้อมูลสำเร็จ');
    release();
  }
});

// สร้างฟังก์ชันสำหรับดำเนินการกับฐานข้อมูล
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  pool
};
