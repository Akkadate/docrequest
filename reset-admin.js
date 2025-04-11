const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetAdminPassword() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const result = await db.query(
      'UPDATE staff SET password = $1 WHERE username = $2 RETURNING id',
      [hashedPassword, 'admin']
    );
    
    if (result.rows.length > 0) {
      console.log('Admin password updated successfully');
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  }
}

resetAdminPassword();
