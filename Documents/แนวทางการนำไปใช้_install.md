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

3. ติดตั้งแ
