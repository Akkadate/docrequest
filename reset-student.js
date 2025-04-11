const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetStudentPassword() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345', salt);
    
    const result = await db.query(
      'UPDATE students SET password = $1 WHERE username = $2 RETURNING id',
      [hashedPassword, '6200001']
    );
    
    if (result.rows.length > 0) {
      console.log('Student password updated successfully');
    } else {
      console.log('Student user not found');
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  }
}

resetStudentPassword();
