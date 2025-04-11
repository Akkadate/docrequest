// ฟังก์ชันสำหรับตรวจสอบข้อมูลในแบบฟอร์ม
(function () {
  'use strict';

  // ฟอร์มที่ต้องการตรวจสอบ
  const forms = document.querySelectorAll('.needs-validation');

  // กำหนดการตรวจสอบเมื่อส่งฟอร์ม
  Array.from(forms).forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }

      form.classList.add('was-validated');
    }, false);
  });

  // ตรวจสอบประเภทเอกสารและแสดง/ซ่อนฟิลด์ที่เกี่ยวข้อง
  const documentTypeSelect = document.getElementById('documentType');
  if (documentTypeSelect) {
    documentTypeSelect.addEventListener('change', function() {
      const requireAttachment = ['enrollment', 'general'].includes(this.value);
      const attachmentField = document.getElementById('attachment-field');
      
      if (attachmentField) {
        attachmentField.style.display = requireAttachment ? 'block' : 'none';
        
        // หากต้องแนบไฟล์ ให้กำหนด required
        const attachmentInput = document.getElementById('attachment');
        if (attachmentInput) {
          attachmentInput.required = requireAttachment;
        }
      }
    });
  }

  // ตรวจสอบวิธีรับเอกสารและแสดง/ซ่อนฟิลด์ที่อยู่จัดส่ง
  const deliveryMethodSelect = document.getElementById('deliveryMethod');
  if (deliveryMethodSelect) {
    deliveryMethodSelect.addEventListener('change', function() {
      const requireAddress = this.value === 'postal';
      const addressFields = document.getElementById('address-fields');
      
      if (addressFields) {
        addressFields.style.display = requireAddress ? 'block' : 'none';
        
        // หากต้องกรอกที่อยู่ ให้กำหนด required สำหรับฟิลด์ที่จำเป็น
        const requiredFields = addressFields.querySelectorAll('[data-required]');
        requiredFields.forEach(field => {
          field.required = requireAddress;
        });
      }
      
      // คำนวณค่าธรรมเนียมใหม่
      calculateFees();
    });
  }

  // ฟังก์ชันคำนวณค่าธรรมเนียม
  function calculateFees() {
    const documentType = document.getElementById('documentType');
    const copies = document.getElementById('copies');
    const deliveryMethod = document.getElementById('deliveryMethod');
    const feesContainer = document.getElementById('fees-container');
    
    if (documentType && copies && deliveryMethod && feesContainer) {
      // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
      if (documentType.value && copies.value && deliveryMethod.value) {
        // ส่งคำขอไปยัง API เพื่อคำนวณค่าธรรมเนียม
        fetch('/documents/calculate-fees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            documentType: documentType.value,
            copies: copies.value,
            deliveryMethod: deliveryMethod.value
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // แสดงค่าธรรมเนียม
            const fees = data.fees;
            document.getElementById('document-fee').textContent = fees.documentFee.toFixed(2);
            document.getElementById('total-document-fee').textContent = fees.totalDocumentFee.toFixed(2);
            document.getElementById('delivery-fee').textContent = fees.deliveryFee.toFixed(2);
            document.getElementById('total-fee').textContent = fees.totalFee.toFixed(2);
            
            // แสดง/ซ่อนส่วนแสดงค่าธรรมเนียม
            feesContainer.style.display = 'block';
          } else {
            console.error('Error calculating fees:', data.message);
            feesContainer.style.display = 'none';
          }
        })
        .catch(error => {
          console.error('Error calculating fees:', error);
          feesContainer.style.display = 'none';
        });
      } else {
        feesContainer.style.display = 'none';
      }
    }
  }

  // เพิ่มการตรวจสอบการเปลี่ยนแปลงจำนวนฉบับ
  const copiesInput = document.getElementById('copies');
  if (copiesInput) {
    copiesInput.addEventListener('change', calculateFees);
    copiesInput.addEventListener('keyup', calculateFees);
  }

  // คำนวณค่าธรรมเนียมเมื่อโหลดหน้า
  if (documentTypeSelect) {
    documentTypeSelect.addEventListener('change', calculateFees);
  }

  // ตรวจสอบการอัปโหลดไฟล์
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(function(input) {
    input.addEventListener('change', function() {
      const maxSize = (input.dataset.maxSize || 2) * 1024 * 1024; // ขนาดสูงสุด (MB)
      const allowedTypes = (input.dataset.allowedTypes || 'image/jpeg,image/png,application/pdf').split(',');
      
      if (this.files.length > 0) {
        const file = this.files[0];
        
        // ตรวจสอบขนาดไฟล์
        if (file.size > maxSize) {
          alert(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${maxSize / (1024 * 1024)} MB)`);
          this.value = '';
          return;
        }
        
        // ตรวจสอบประเภทไฟล์
        if (!allowedTypes.includes(file.type)) {
          alert('ไฟล์ไม่ตรงตามประเภทที่กำหนด');
          this.value = '';
          return;
        }
        
        // แสดงชื่อไฟล์
        const fileNameDisplay = input.parentElement.querySelector('.file-name');
        if (fileNameDisplay) {
          fileNameDisplay.textContent = file.name;
        }
      }
    });
  });
})();
