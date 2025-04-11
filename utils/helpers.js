/**
 * ไฟล์นี้รวบรวมฟังก์ชันช่วยเหลือต่างๆ สำหรับใช้งานในแอปพลิเคชัน
 */

// ฟังก์ชันสำหรับสร้างรหัสอ้างอิงคำขอ
const generateRequestRef = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000); // สุ่มตัวเลข 4 หลัก
  
  return `REQ${year}${month}${day}${random}`;
};

// ฟังก์ชันสำหรับแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543; // เพิ่ม 543 เพื่อแปลงเป็นปี พ.ศ.
  
  return `${day} ${month} ${year}`;
};

// ฟังก์ชันสำหรับคำนวณค่าใช้จ่าย
const calculateFees = (documentType, copies, deliveryMethod) => {
  let baseFee = 0;
  let deliveryFee = 0;
  
  // ค่าธรรมเนียมตามประเภทเอกสาร
  switch (documentType) {
    case 'transcript':
      baseFee = 100; // 100 บาทต่อฉบับ
      break;
    case 'certificate':
      baseFee = 50; // 50 บาทต่อฉบับ
      break;
    case 'enrollment':
      baseFee = 20; // 20 บาทต่อฉบับ
      break;
    case 'general':
      baseFee = 20; // 20 บาทต่อฉบับ
      break;
    default:
      baseFee = 0;
  }
  
  // ค่าธรรมเนียมจัดส่ง
  if (deliveryMethod === 'postal') {
    deliveryFee = 50; // ค่าจัดส่งทางไปรษณีย์ 50 บาท
  }
  
  const totalDocumentFee = baseFee * copies;
  const totalFee = totalDocumentFee + deliveryFee;
  
  return {
    baseFee,
    totalDocumentFee,
    deliveryFee,
    totalFee
  };
};

// ฟังก์ชันสำหรับแปลงสถานะเป็นข้อความภาษาไทย
const translateStatus = (status) => {
  const statusMap = {
    'pending': 'รอดำเนินการ',
    'processing': 'กำลังดำเนินการ',
    'awaiting_payment': 'รอชำระเงิน',
    'paid': 'ชำระเงินแล้ว',
    'preparing': 'กำลังจัดเตรียมเอกสาร',
    'ready_for_pickup': 'พร้อมให้รับเอกสาร',
    'shipped': 'จัดส่งแล้ว',
    'completed': 'เสร็จสิ้น',
    'rejected': 'ถูกปฏิเสธ',
    'cancelled': 'ยกเลิก',
    'need_more_info': 'ต้องการข้อมูลเพิ่มเติม'
  };
  
  return statusMap[status] || 'ไม่ทราบสถานะ';
};

// ฟังก์ชันสำหรับแปลงประเภทเอกสารเป็นข้อความภาษาไทย
const translateDocumentType = (type) => {
  const typeMap = {
    'transcript': 'ใบแสดงผลการเรียน (Transcript)',
    'certificate': 'หนังสือรับรองการเป็นนักศึกษา',
    'graduation': 'หนังสือรับรองสำเร็จการศึกษา',
    'enrollment': 'คำร้องขอลงทะเบียน',
    'general': 'คำร้องทั่วไป'
  };
  
  return typeMap[type] || 'เอกสารอื่นๆ';
};

// ฟังก์ชันสำหรับแปลงวิธีรับเอกสารเป็นข้อความภาษาไทย
const translateDeliveryMethod = (method) => {
  const methodMap = {
    'pickup': 'รับด้วยตนเองที่สำนักทะเบียน',
    'postal': 'จัดส่งทางไปรษณีย์',
    'digital': 'รับเอกสารดิจิทัลทางอีเมล'
  };
  
  return methodMap[method] || 'ไม่ระบุวิธีรับเอกสาร';
};

// ฟังก์ชันคำนวณเวลาดำเนินการโดยประมาณ
const estimateProcessingTime = (documentType) => {
  const today = new Date();
  let processingDays = 3; // ค่าเริ่มต้น 3 วัน
  
  // กำหนดจำนวนวันตามประเภทเอกสาร
  switch (documentType) {
    case 'transcript':
      processingDays = parseInt(process.env.PROCESSING_TIME_TRANSCRIPT) || 2;
      break;
    case 'certificate':
    case 'graduation':
      processingDays = parseInt(process.env.PROCESSING_TIME_CERTIFICATE) || 3;
      break;
    case 'enrollment':
    case 'general':
      processingDays = parseInt(process.env.PROCESSING_TIME_REQUEST) || 5;
      break;
  }
  
  // เพิ่มจำนวนวันที่ประมาณการ
  const estimatedDate = new Date(today);
  estimatedDate.setDate(today.getDate() + processingDays);
  
  // ตรวจสอบว่าเป็นวันหยุดสุดสัปดาห์หรือไม่
  while (estimatedDate.getDay() === 0 || estimatedDate.getDay() === 6) {
    estimatedDate.setDate(estimatedDate.getDate() + 1);
  }
  
  return {
    days: processingDays,
    date: estimatedDate
  };
};

module.exports = {
  generateRequestRef,
  formatThaiDate,
  calculateFees,
  translateStatus,
  translateDocumentType,
  translateDeliveryMethod,
  estimateProcessingTime
};
