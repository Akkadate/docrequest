-- สคริปต์สร้างฐานข้อมูลสำหรับระบบขอเอกสารออนไลน์สำหรับนักศึกษา

-- ลบตารางเดิมถ้ามี (ใช้เฉพาะในสภาพแวดล้อมการพัฒนา)
-- DROP TABLE IF EXISTS request_status_history;
-- DROP TABLE IF EXISTS request_attachments;
-- DROP TABLE IF EXISTS payment_history;
-- DROP TABLE IF EXISTS document_requests;
-- DROP TABLE IF EXISTS staff;
-- DROP TABLE IF EXISTS students;

-- สร้างตารางนักศึกษา
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    faculty VARCHAR(100),
    major VARCHAR(100),
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- สร้างตารางเจ้าหน้าที่
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    department VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- สร้างตารางคำขอเอกสาร
CREATE TABLE IF NOT EXISTS document_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    document_type VARCHAR(50) NOT NULL,
    copies INTEGER NOT NULL DEFAULT 1,
    purpose TEXT,
    delivery_method VARCHAR(20) NOT NULL,
    delivery_address TEXT,
    shipping_fee DECIMAL(10, 2) DEFAULT 0,
    document_fee DECIMAL(10, 2) DEFAULT 0,
    total_fee DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_date TIMESTAMP,
    payment_status VARCHAR(20) DEFAULT 'pending',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    tracking_number VARCHAR(100),
    delivery_date TIMESTAMP,
    reference VARCHAR(20) UNIQUE NOT NULL,
    staff_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- สร้างตารางไฟล์แนบ
CREATE TABLE IF NOT EXISTS request_attachments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES document_requests(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    original_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- สร้างตารางประวัติสถานะ
CREATE TABLE IF NOT EXISTS request_status_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES document_requests(id),
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_by_staff BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- สร้างตารางประวัติการชำระเงิน
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES document_requests(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    payment_date TIMESTAMP NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- สร้างดัชนี (indexes) เพื่อเพิ่มประสิทธิภาพในการค้นหา
CREATE INDEX IF NOT EXISTS idx_document_requests_student_id ON document_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_reference ON document_requests(reference);
CREATE INDEX IF NOT EXISTS idx_request_attachments_request_id ON request_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_status_history_request_id ON request_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_request_id ON payment_history(request_id);

-- เพิ่มข้อมูลเจ้าหน้าที่เริ่มต้น (รหัสผ่าน: admin123)
INSERT INTO staff (username, password, first_name, last_name, email, role, department, created_at)
VALUES ('admin', '$2a$10$GmBDLI6HbLIaARGt1WpJvuGYGBvHy4YlkM5jvCQ.xKXiPrRzfOGhy', 'ผู้ดูแล', 'ระบบ', 'admin@nordbkk.ac.th', 'admin', 'ฝ่ายทะเบียน', NOW())
ON CONFLICT (username) DO NOTHING;

-- เพิ่มข้อมูลนักศึกษาตัวอย่าง (รหัสผ่าน: 123456)
INSERT INTO students (student_id, password, first_name, last_name, faculty, major, email, phone, address, created_at)
VALUES ('6205001', '$2a$10$EUg0WCIAVI88Zu8gGu9WoOpkT5LI.U9yRIEcM4BvE5aV7.23FZC8i', 'สมชาย', 'ใจดี', 'คณะบริหารธุรกิจ', 'สาขาการตลาด', 'somchai@email.com', '0812345678', '123 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900', NOW()),
       ('6205002', '$2a$10$EUg0WCIAVI88Zu8gGu9WoOpkT5LI.U9yRIEcM4BvE5aV7.23FZC8i', 'สมหญิง', 'รักเรียน', 'คณะวิทยาศาสตร์', 'สาขาวิทยาการคอมพิวเตอร์', 'somying@email.com', '0898765432', '456 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240', NOW())
ON CONFLICT (student_id) DO NOTHING;
