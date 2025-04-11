# แนวทางการนำระบบขอเอกสารออนไลน์สำหรับนักศึกษาไปใช้งานจริง

## 1. ขั้นตอนการติดตั้ง

### 1.1 ความต้องการของระบบ
- Node.js เวอร์ชัน 14.x หรือสูงกว่า
- PostgreSQL เวอร์ชัน 12.x หรือสูงกว่า
- NPM เวอร์ชัน 6.x หรือสูงกว่า
- เซิร์ฟเวอร์ Ubuntu 20.04 LTS หรือที่เทียบเท่า

### 1.2 การติดตั้งแพ็คเกจที่จำเป็น
```bash
npm install
```

### 1.3 การสร้างฐานข้อมูล
1. สร้างฐานข้อมูลใน PostgreSQL:
```sql
CREATE DATABASE student_docs;
```

2. รันสคริปต์สร้างโครงสร้างฐานข้อมูล:
```bash
psql -U postgras -d student_docs -h remote.devapp.cc -f config/schema.sql
```

### 1.4 การตั้งค่าไฟล์ .env
สร้างไฟล์ .env ในโฟลเดอร์หลักของโปรเจคและกำหนดค่าดังนี้:
```
NODE_ENV=production
PORT=4100
SITE_URL=https://docs.devapp.cc

DB_HOST=remote.devapp.cc
DB_USER=postgras
DB_PASSWORD=Tct85329$
DB_NAME=student_docs
DB_PORT=5432

SESSION_SECRET=your_secure_random_session_secret_key

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=notifications@nordbkk.ac.th
EMAIL_PASS=your_email_password
EMAIL_FROM=no-reply@nordbkk.ac.th

PROCESSING_TIME_TRANSCRIPT=2
PROCESSING_TIME_CERTIFICATE=3
PROCESSING_TIME_REQUEST=5
```

### 1.5 การติดตั้งบน Ubuntu กับ Nginx
1. ติดตั้ง Nginx:
```bash
sudo apt update
sudo apt install nginx
```

2. สร้างไฟล์คอนฟิกสำหรับ Nginx:
```bash
sudo nano /etc/nginx/sites-available/docs.devapp.cc
```

3. เพิ่มคอนฟิกดังนี้:
```nginx
server {
    listen 80;
    server_name docs.devapp.cc;

    location / {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. เปิดใช้งานไซต์และรีสตาร์ท Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/docs.devapp.cc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. ติดตั้ง Let's Encrypt สำหรับ HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d docs.devapp.cc
```

### 1.6 การตั้งค่า PM2 สำหรับจัดการแอปพลิเคชัน
1. ติดตั้ง PM2:
```bash
sudo npm install -g pm2
```

2. เริ่มต้นแอปพลิเคชันด้วย PM2:
```bash
pm2 start server.js --name student-docs
```

3. ตั้งค่าให้ PM2 เริ่มต้นอัตโนมัติเมื่อรีสตาร์ทเซิร์ฟเวอร์:
```bash
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup ubuntu -u ubuntu --hp /home/ubuntu
pm2 save
```

## 2. การปรับแต่งและเพิ่มคุณสมบัติ

### 2.1 การเชื่อมต่อกับระบบฐานข้อมูลนักศึกษาที่มีอยู่
ในสภาพแวดล้อมจริง คุณควรเชื่อมต่อกับฐานข้อมูล Tibero ของมหาวิทยาลัย:

1. ติดตั้ง ODBC Driver สำหรับ Tibero:
```bash
# คำสั่งติดตั้ง Tibero ODBC Driver จะแตกต่างกันไปตามระบบปฏิบัติการ
```

2. แก้ไขไฟล์ `config/database.js` เพื่อเพิ่มการเชื่อมต่อกับ Tibero:
```javascript
// เพิ่มโค้ดสำหรับการเชื่อมต่อกับ Tibero
const tibero = require('tibero-odbc');
// กำหนดค่าการเชื่อมต่อตามที่ได้รับจากฝ่าย IT ของมหาวิทยาลัย
```

### 2.2 การปรับแต่งระบบอีเมล
1. แก้ไขเทมเพลตอีเมลใน `utils/emailService.js`
2. ทดสอบการส่งอีเมลด้วยบัญชีอีเมลของมหาวิทยาลัย

### 2.3 การเพิ่มระบบแจ้งเตือน
1. ติดตั้ง Line Notify API สำหรับแจ้งเตือนเจ้าหน้าที่:
```bash
npm install line-notify-nodejs --save
```

2. สร้างไฟล์ `utils/lineNotify.js` เพื่อจัดการการแจ้งเตือนผ่าน Line:
```javascript
const LineNotify = require('line-notify-nodejs')('YOUR_LINE_NOTIFY_TOKEN');

module.exports = {
  sendNotification: (message) => {
    LineNotify.notify({
      message: message
    }).then(() => {
      console.log('Line Notify sent successfully');
    }).catch((err) => {
      console.error('Line Notify error:', err);
    });
  }
};
```

### 2.4 การเชื่อมต่อกับระบบชำระเงินอิเล็กทรอนิกส์
1. ติดตั้งแพ็คเกจสำหรับเชื่อมต่อกับ Payment Gateway:
```bash
npm install omise --save  # ตัวอย่างการใช้ Omise Payment Gateway
```

2. สร้างไฟล์ `utils/paymentGateway.js` สำหรับจัดการการชำระเงิน

## 3. การดูแลรักษาระบบ

### 3.1 การสำรองข้อมูล
ตั้งค่าการสำรองข้อมูลอัตโนมัติสำหรับฐานข้อมูล PostgreSQL:

1. สร้างสคริปต์สำรองข้อมูล `/home/ubuntu/backup_script.sh`:
```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/ubuntu/db_backups"
FILENAME="student_docs_${TIMESTAMP}.sql"

# สร้างโฟลเดอร์สำหรับเก็บไฟล์สำรองข้อมูล
mkdir -p $BACKUP_DIR

# สำรองข้อมูล
pg_dump -h remote.devapp.cc -U postgras -d student_docs > $BACKUP_DIR/$FILENAME

# บีบอัดไฟล์
gzip $BACKUP_DIR/$FILENAME

# เก็บไฟล์ไว้ 30 วัน
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +30 -delete
```

2. ตั้งค่าสิทธิ์และเพิ่มลงใน cron:
```bash
chmod +x /home/ubuntu/backup_script.sh
crontab -e
```

3. เพิ่มบรรทัดนี้เพื่อรันสคริปต์ทุกวันเวลา 02:00 น.:
```
0 2 * * * /home/ubuntu/backup_script.sh
```

### 3.2 การตรวจสอบล็อก
1. ตั้งค่าการหมุนเวียนล็อกด้วย logrotate:
```bash
sudo nano /etc/logrotate.d/student-docs
```

2. เพิ่มคอนฟิกดังนี้:
```
/home/ubuntu/student-document-system/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 ubuntu ubuntu
}
```

### 3.3 การอัพเดทระบบ
1. สร้างสคริปต์สำหรับอัพเดทระบบ `/home/ubuntu/update_app.sh`:
```bash
#!/bin/bash
cd /home/ubuntu/student-document-system

# สำรองไฟล์ที่สำคัญ
cp .env .env.backup
cp config/config.js config/config.js.backup

# ดึงโค้ดล่าสุดจาก Git
git pull

# ติดตั้งแพ็คเกจที่อัพเดท
npm install

# รีสตาร์ทแอปพลิเคชัน
pm2 restart student-docs
```

2. ตั้งค่าสิทธิ์:
```bash
chmod +x /home/ubuntu/update_app.sh
```

## 4. การปรับแต่งประสิทธิภาพ

### 4.1 การใช้ Redis สำหรับการแคช
1. ติดตั้ง Redis:
```bash
sudo apt install redis-server
```

2. ตั้งค่า Redis ให้เริ่มต้นอัตโนมัติ:
```bash
sudo systemctl enable redis-server
```

3. ติดตั้งแพ็คเกจ Redis สำหรับ Node.js:
```bash
npm install redis connect-redis --save
```

4. แก้ไขไฟล์ `app.js` เพื่อใช้ Redis กับ session:
```javascript
const redis = require('redis');
const connectRedis = require('connect-redis');
const RedisStore = connectRedis(session);

// สร้าง Redis client
const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379
});

// ตั้งค่า session ให้ใช้ Redis
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000, // 1 ชั่วโมง
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));
```

### 4.2 การปรับแต่งประสิทธิภาพ Nginx
แก้ไขไฟล์คอนฟิก Nginx เพื่อเพิ่มประสิทธิภาพ:
```nginx
server {
    listen 80;
    server_name docs.devapp.cc;

    # การเพิ่มประสิทธิภาพการเชื่อมต่อ
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # การแคชไฟล์สถิต
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # การส่งไฟล์แบบบีบอัด
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/x-javascript
        text/css
        text/javascript
        text/plain;
    
    location / {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.3 การปรับแต่ง Node.js
แก้ไขไฟล์ `server.js` เพื่อใช้ประโยชน์จากหลาย CPU:
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = require('./app');
const { logger } = require('./utils/logger');

// กำหนดพอร์ต
const PORT = process.env.PORT || 4100;

// ใช้ cluster เพื่อเพิ่มประสิทธิภาพในการใช้งานหลาย CPU
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  logger.info(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  app.listen(PORT, () => {
    logger.info(`Worker ${process.pid} started. Server running on port ${PORT}`);
    console.log(`Server running on port ${PORT}`);
  });
}
```

## 5. การทดสอบระบบ

### 5.1 การทดสอบหน่วย (Unit Testing)
1. ติดตั้งเครื่องมือสำหรับการทดสอบ:
```bash
npm install --save-dev jest supertest
```

2. สร้างโฟลเดอร์และไฟล์สำหรับการทดสอบ:
```bash
mkdir -p tests/unit tests/integration
```

3. สร้างไฟล์ `tests/unit/request.test.js` สำหรับทดสอบโมเดล Request:
```javascript
const Request = require('../../models/Request');
const db = require('../../config/database');

// Mock ฐานข้อมูล
jest.mock('../../config/database');

describe('Request Model', () => {
  test('should create a new request', async () => {
    // ข้อมูลจำลอง
    const mockRequestData = {
      studentId: 1,
      documentType: 'transcript',
      copies: 2,
      purpose: 'สมัครงาน',
      deliveryMethod: 'pickup'
    };
    
    // ผลลัพธ์ที่คาดหวัง
    const mockResult = {
      rows: [{
        id: 1,
        student_id: 1,
        document_type: 'transcript',
        copies: 2,
        purpose: 'สมัครงาน',
        delivery_method: 'pickup',
        reference: 'REQ21010001'
      }]
    };
    
    // Mock การเรียกใช้ query
    db.query.mockResolvedValueOnce(mockResult);
    db.query.mockResolvedValueOnce({ rows: [] }); // สำหรับการบันทึกประวัติสถานะ
    
    // ทดสอบฟังก์ชัน create
    const result = await Request.create(mockRequestData);
    
    // ตรวจสอบผลลัพธ์
    expect(result).toEqual(mockResult.rows[0]);
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
```

### 5.2 การทดสอบบูรณาการ (Integration Testing)
สร้างไฟล์ `tests/integration/auth.test.js` สำหรับทดสอบการเข้าสู่ระบบ:
```javascript
const request = require('supertest');
const app = require('../../app');
const db = require('../../config/database');

describe('Authentication Routes', () => {
  beforeAll(async () => {
    // เตรียมข้อมูลทดสอบ
    await db.query(`
      INSERT INTO students (student_id, password, first_name, last_name, email)
      VALUES ('testuser', '$2a$10$1234567890abcdefghijk.1234567890abcdefghijk', 'Test', 'User', 'test@example.com')
      ON CONFLICT (student_id) DO NOTHING
    `);
  });
  
  afterAll(async () => {
    // ทำความสะอาดข้อมูลทดสอบ
    await db.query(`
      DELETE FROM students WHERE student_id = 'testuser'
    `);
  });
  
  test('should login successfully with correct credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        studentId: 'testuser',
        password: 'password123'
      });
    
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/student/main-menu');
  });
  
  test('should fail login with incorrect credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        studentId: 'testuser',
        password: 'wrongpassword'
      });
    
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/login');
  });
});
```

### 5.3 การทดสอบการโหลด (Load Testing)
1. ติดตั้ง Artillery สำหรับทดสอบการโหลด:
```bash
npm install -g artillery
```

2. สร้างไฟล์ `tests/load/load-test.yml`:
```yaml
config:
  target: "https://docs.devapp.cc"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "ทดสอบการโหลดปกติ"
    - duration: 120
      arrivalRate: 10
      rampTo: 50
      name: "ทดสอบการโหลดสูง"
  defaults:
    headers:
      User-Agent: "Artillery Load Test"

scenarios:
  - name: "ทดสอบการเข้าสู่ระบบและดูหน้าหลัก"
    flow:
      - get:
          url: "/"
          capture:
            - selector: "input[name=_csrf]"
              attr: "value"
              as: "csrf"
      - post:
          url: "/login"
          headers:
            Content-Type: "application/x-www-form-urlencoded"
          form:
            _csrf: "{{ csrf }}"
            studentId: "6205001"
            password: "123456"
      - get:
          url: "/student/main-menu"
```

3. รันการทดสอบการโหลด:
```bash
artillery run tests/load/load-test.yml -o tests/load/results.json
```

4. สร้างรายงาน:
```bash
artillery report tests/load/results.json
```

## 6. การขยายระบบในอนาคต

### 6.1 การเพิ่มระบบวิเคราะห์ข้อมูล
1. ติดตั้ง Analytics library:
```bash
npm install chart.js --save
```

2. สร้างหน้าแดชบอร์ดวิเคราะห์ข้อมูลสำหรับผู้ดูแลระบบในไฟล์ `views/admin/analytics.ejs`
3. สร้าง API endpoints สำหรับดึงข้อมูลสถิติ

### 6.2 การเพิ่มระบบแจ้งเตือนผ่าน SMS
1. ติดตั้ง Twilio SDK:
```bash
npm install twilio --save
```

2. สร้างไฟล์ `utils/smsService.js` สำหรับการส่ง SMS

### 6.3 การพัฒนาแอปพลิเคชันมือถือ
1. พิจารณาการพัฒนาแอปพลิเคชันมือถือด้วย React Native
2. ออกแบบ REST API สำหรับเชื่อมต่อกับแอปพลิเคชันมือถือ

## 7. การดูแลรักษาความปลอดภัย

### 7.1 การสแกนช่องโหว่
1. ติดตั้ง Snyk CLI:
```bash
npm install -g snyk
```

2. ทดสอบความปลอดภัยของแอปพลิเคชัน:
```bash
snyk test
```

### 7.2 การปรับปรุงความปลอดภัย
1. ติดตั้ง Helmet เพิ่มเติม:
```bash
npm install helmet --save
```

2. ตั้งค่านโยบายความปลอดภัยเพิ่มเติมใน `app.js`:
```javascript
// ตั้งค่า Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 7.3 การสร้าง Security Response Plan
1. สร้างไฟล์ `SECURITY.md` ในโปรเจค:
```markdown
# นโยบายความปลอดภัย

## การรายงานช่องโหว่

หากคุณพบช่องโหว่ด้านความปลอดภัยในระบบขอเอกสารออนไลน์สำหรับนักศึกษา กรุณาแจ้งให้ทีมความปลอดภัยทราบโดยส่งอีเมลไปที่ security@nordbkk.ac.th

กรุณาระบุรายละเอียดต่อไปนี้:
- ประเภทของช่องโหว่
- เส้นทางหรือตำแหน่งของช่องโหว่
- ขั้นตอนการทำซ้ำ
- ผลกระทบที่อาจเกิดขึ้น

## นโยบายการเปิดเผย
ทีมความปลอดภัยจะตอบกลับรายงานของคุณภายใน 48 ชั่วโมง และจะให้การอัพเดทเป็นระยะเกี่ยวกับความคืบหน้าในการแก้ไขช่องโหว่
```

## 8. การสนับสนุนและช่วยเหลือผู้ใช้

### 8.1 การสร้างเอกสารคู่มือสำหรับผู้ใช้
1. สร้างคู่มือการใช้งานสำหรับนักศึกษา
2. สร้างคู่มือการใช้งานสำหรับเจ้าหน้าที่

### 8.2 การสร้างระบบช่วยเหลือ
1. เพิ่มหน้า FAQ ในระบบ
2. สร้างระบบตั๋วสำหรับรายงานปัญหาและขอความช่วยเหลือ

### 8.3 การฝึกอบรม
1. จัดการฝึกอบรมสำหรับนักศึกษา
2. จัดการฝึกอบรมสำหรับเจ้าหน้าที่และผู้ดูแลระบบ

## สรุป
การนำระบบขอเอกสารออนไลน์สำหรับนักศึกษาไปใช้งานจริงต้องคำนึงถึงปัจจัยหลายด้าน ทั้งด้านเทคนิค ความปลอดภัย ประสิทธิภาพ และการสนับสนุนผู้ใช้ แนวทางนี้ได้ครอบคลุมขั้นตอนสำคัญต่างๆ ที่ควรดำเนินการเพื่อให้การนำระบบไปใช้งานเป็นไปอย่างราบรื่นและประสบความสำเร็จ
