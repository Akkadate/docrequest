const app = require('./app');
const dotenv = require('dotenv');
const { logger } = require('./utils/logger');

// โหลดการตั้งค่าจากไฟล์ .env
dotenv.config();

// กำหนดพอร์ต
const PORT = process.env.PORT || 4100;

// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
  logger.info(`เซิร์ฟเวอร์เริ่มทำงานที่พอร์ต ${PORT} ในโหมด ${process.env.NODE_ENV}`);
  console.log(`เซิร์ฟเวอร์เริ่มทำงานที่พอร์ต ${PORT} ในโหมด ${process.env.NODE_ENV}`);
  console.log(`เข้าใช้งานได้ที่: http://localhost:${PORT}`);
});
