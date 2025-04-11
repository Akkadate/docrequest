/**
 * main.js - ไฟล์ JavaScript หลักสำหรับระบบขอเอกสารออนไลน์
 */

// รอให้ DOM โหลดเสร็จก่อนทำงาน
document.addEventListener("DOMContentLoaded", function() {
  // ปิดข้อความแจ้งเตือนอัตโนมัติ
  setTimeout(function() {
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(function(alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    });
  }, 5000);
  
  // หากอยู่ในหน้าขอเอกสาร
  if (document.querySelector('#documentRequestForm')) {
    setupDocumentRequestForm();
  }
  
  // หากอยู่ในหน้าตรวจสอบสถานะ
  if (document.querySelector('#trackStatusForm')) {
    setupTrackStatusForm();
  }
  
  // หากอยู่ในหน้าชำระเงิน
  if (document.querySelector('#paymentForm')) {
    setupPaymentForm();
  }
  
  // หากอยู่ในหน้าแดชบอร์ดเจ้าหน้าที่
  if (document.querySelector('#adminDashboard')) {
    setupAdminDashboard();
  }
});

/**
 * ตั้งค่าฟอร์มขอเอกสาร
 */
function setupDocumentRequestForm() {
  const deliveryMethodSelect = document.querySelector('#deliveryMethod');
  const addressFormGroup = document.querySelector('#addressFormGroup');
  const documentTypeSelect = document.querySelector('#documentType');
  const copiesInput = document.querySelector('#copies');
  const feeDisplay = document.querySelector('#feeDisplay');
  
  // ซ่อน/แสดงฟอร์มที่อยู่ตามวิธีรับเอกสาร
  if (deliveryMethodSelect) {
    deliveryMethodSelect.addEventListener('change', function() {
      if (this.value === 'postal') {
        addressFormGroup.classList.remove('d-none');
      } else {
        addressFormGroup.classList.add('d-none');
      }
      
      // คำนวณค่าธรรมเนียมใหม่
      calculateFees();
    });
  }
  
  // คำนวณค่าธรรมเนียมเมื่อเปลี่ยนประเภทเอกสารหรือจำนวนฉบับ
  if (documentTypeSelect && copiesInput && feeDisplay) {
    documentTypeSelect.addEventListener('change', calculateFees);
    copiesInput.addEventListener('change', calculateFees);
    copiesInput.addEventListener('input', calculateFees);
    
    // คำนวณค่าธรรมเนียมเริ่มต้น
    calculateFees();
  }
  
  // ตรวจสอบไฟล์แนบ
  const fileInput = document.querySelector('#attachments');
  if (fileInput) {
    fileInput.addEventListener('change', validateFiles);
  }
}

/**
 * คำนวณค่าธรรมเนียม
 */
function calculateFees() {
  const documentType = document.querySelector('#documentType').value;
  const copies = parseInt(document.querySelector('#copies').value) || 1;
  const deliveryMethod = document.querySelector('#deliveryMethod').value;
  
  // ส่งข้อมูลไปคำนวณที่ฝั่งเซิร์ฟเวอร์
  fetch('/documents/calculate-fees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documentType,
      copies,
      deliveryMethod
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // แสดงค่าธรรมเนียม
      document.querySelector('#documentFee').textContent = data.fees.totalDocumentFee.toFixed(2);
      document.querySelector('#deliveryFee').textContent = data.fees.deliveryFee.toFixed(2);
      document.querySelector('#totalFee').textContent = data.fees.totalFee.toFixed(2);
      
      // แสดง/ซ่อนส่วนค่าธรรมเนียม
      if (data.fees.totalFee > 0) {
        document.querySelector('#feeDisplay').classList.remove('d-none');
      } else {
        document.querySelector('#feeDisplay').classList.add('d-none');
      }
    } else {
      console.error('เกิดข้อผิดพลาดในการคำนวณค่าธรรมเนียม');
    }
  })
  .catch(error => {
    console.error('เกิดข้อผิดพลาด:', error);
  });
}

/**
 * ตรวจสอบไฟล์แนบ
 */
function validateFiles() {
  const fileInput = document.querySelector('#attachments');
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const fileError = document.querySelector('#fileError');
  
  if (fileInput.files.length > 0) {
    // ตรวจสอบแต่ละไฟล์
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];
      
      // ตรวจสอบขนาดไฟล์
      if (file.size > maxFileSize) {
        fileError.textContent = `ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 5MB)`;
        fileError.classList.remove('d-none');
        fileInput.value = ''; // ล้างค่า
        return false;
      }
      
      // ตรวจสอบประเภทไฟล์
      if (!allowedTypes.includes(file.type)) {
        fileError.textContent = `ไฟล์ ${file.name} มีประเภทไม่ถูกต้อง (รองรับเฉพาะ PDF, JPG, JPEG, PNG)`;
        fileError.classList.remove('d-none');
        fileInput.value = ''; // ล้างค่า
        return false;
      }
    }
    
    // ผ่านการตรวจสอบทุกไฟล์
    fileError.classList.add('d-none');
    return true;
  }
  
  return true;
}

/**
 * ตั้งค่าฟอร์มตรวจสอบสถานะ
 */
function setupTrackStatusForm() {
  const trackStatusForm = document.querySelector('#trackStatusForm');
  
  if (trackStatusForm) {
    trackStatusForm.addEventListener('submit', function(e) {
      const referenceInput = document.querySelector('#reference');
      
      if (!referenceInput.value.trim()) {
        e.preventDefault();
        alert('กรุณากรอกเลขที่อ้างอิง');
      }
    });
  }
  
  // ติดตามสถานะแบบเรียลไทม์ (ถ้ามี)
  const statusRefreshButton = document.querySelector('#refreshStatus');
  if (statusRefreshButton) {
    statusRefreshButton.addEventListener('click', function() {
      const reference = this.dataset.reference;
      refreshStatus(reference);
    });
  }
}

/**
 * รีเฟรชข้อมูลสถานะคำขอ
 */
function refreshStatus(reference) {
  const statusElement = document.querySelector('#currentStatus');
  
  if (statusElement) {
    statusElement.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">กำลังโหลด...</span></div> กำลังตรวจสอบ...';
    
    fetch(`/documents/status/${reference}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          statusElement.textContent = data.statusInfo.statusThai;
          document.querySelector('#lastUpdated').textContent = new Date().toLocaleString('th-TH');
        } else {
          statusElement.textContent = 'ไม่สามารถดึงข้อมูลได้';
          console.error('เกิดข้อผิดพลาดในการดึงข้อมูลสถานะ');
        }
      })
      .catch(error => {
        statusElement.textContent = 'ไม่สามารถดึงข้อมูลได้';
        console.error('เกิดข้อผิดพลาด:', error);
      });
  }
}

/**
 * ตั้งค่าฟอร์มชำระเงิน
 */
function setupPaymentForm() {
  const paymentForm = document.querySelector('#paymentForm');
  const paymentMethodSelect = document.querySelector('#paymentMethod');
  const paymentSlipInput = document.querySelector('#paymentSlip');
  
  if (paymentForm) {
    paymentForm.addEventListener('submit', function(e) {
      // ตรวจสอบว่ามีการอัปโหลดสลิปหรือไม่
      if (!paymentSlipInput.files.length) {
        e.preventDefault();
        alert('กรุณาอัปโหลดสลิปการโอนเงิน');
      }
    });
  }
  
  // ตรวจสอบไฟล์สลิป
  if (paymentSlipInput) {
    paymentSlipInput.addEventListener('change', validatePaymentSlip);
  }
  
  // แสดงปุ่ม QR Code ถ้าเลือกชำระผ่าน QR
  if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener('change', function() {
      const qrButton = document.querySelector('#generateQR');
      
      if (this.value === 'qr_payment' && qrButton) {
        qrButton.classList.remove('d-none');
      } else if (qrButton) {
        qrButton.classList.add('d-none');
      }
    });
  }
}

/**
 * ตรวจสอบไฟล์สลิปการโอนเงิน
 */
function validatePaymentSlip() {
  const fileInput = document.querySelector('#paymentSlip');
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const fileError = document.querySelector('#slipError');
  
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    
    // ตรวจสอบขนาดไฟล์
    if (file.size > maxFileSize) {
      fileError.textContent = 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)';
      fileError.classList.remove('d-none');
      fileInput.value = ''; // ล้างค่า
      return false;
    }
    
    // ตรวจสอบประเภทไฟล์
    if (!allowedTypes.includes(file.type)) {
      fileError.textContent = 'ประเภทไฟล์ไม่ถูกต้อง (รองรับเฉพาะ PDF, JPG, JPEG, PNG)';
      fileError.classList.remove('d-none');
      fileInput.value = ''; // ล้างค่า
      return false;
    }
    
    // ผ่านการตรวจสอบ
    fileError.classList.add('d-none');
    
    // แสดงตัวอย่างรูปภาพ (ถ้าเป็นรูปภาพ)
    const previewElement = document.querySelector('#slipPreview');
    if (previewElement && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        previewElement.src = e.target.result;
        previewElement.classList.remove('d-none');
      };
      reader.readAsDataURL(file);
    }
    
    return true;
  }
  
  return false;
}

/**
 * ตั้งค่าแดชบอร์ดเจ้าหน้าที่
 */
function setupAdminDashboard() {
  // ถ้ามีกราฟหรือแผนภูมิให้เรียกฟังก์ชันสร้างกราฟที่นี่
  if (document.querySelector('#requestsChart')) {
    createRequestsChart();
  }
  
  if (document.querySelector('#documentTypeChart')) {
    createDocumentTypeChart();
  }
  
  // จัดการตารางคำขอ
  const searchInput = document.querySelector('#searchRequests');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterRequestsTable(this.value);
    });
  }
  
  // ตั้งค่า datepicker สำหรับรายงาน
  const dateInputs = document.querySelectorAll('.date-picker');
  if (dateInputs.length > 0) {
    dateInputs.forEach(input => {
      // หากมีการใช้ flatpickr หรือ datepicker อื่นๆ ให้เพิ่มโค้ดที่นี่
      // ตัวอย่างเช่น flatpickr(input, { dateFormat: 'Y-m-d' });
    });
  }
}

/**
 * กรองตารางคำขอตามคำค้นหา
 */
function filterRequestsTable(searchTerm) {
  const tableRows = document.querySelectorAll('#requestsTable tbody tr');
  searchTerm = searchTerm.toLowerCase();
  
  tableRows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * สร้างกราฟจำนวนคำขอ
 */
function createRequestsChart() {
  // หากมีการใช้ Chart.js ให้เพิ่มโค้ดสร้างกราฟที่นี่
  // ตัวอย่างเช่น
  /*
  const ctx = document.getElementById('requestsChart').getContext('2d');
  const requestsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'จำนวนคำขอ',
        data: [],
        backgroundColor: 'rgba(63, 81, 181, 0.2)',
        borderColor: 'rgba(63, 81, 181, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  */
}

/**
 * สร้างกราฟประเภทเอกสาร
 */
function createDocumentTypeChart() {
  // หากมีการใช้ Chart.js ให้เพิ่มโค้ดสร้างกราฟที่นี่
  // ตัวอย่างเช่น
  /*
  const ctx = document.getElementById('documentTypeChart').getContext('2d');
  const documentTypeChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        label: 'ประเภทเอกสาร',
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }]
    }
  });
  */
}
