import bcrypt from 'bcryptjs';
import { pool } from '../server/db.js';

async function resetAdminPassword() {
  try {
    const email = 'admin@numusic.app';
    const newPassword = 'admin123';
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the admin user password
    const result = await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log(`📧 Email: ${email}`);
      console.log(`🔐 New Password: ${newPassword}`);
      console.log('');
      console.log('You can now login to the admin dashboard at /admin/login');
    } else {
      console.log('❌ Admin user not found. Creating new admin user...');
      
      // Create new admin user if doesn't exist
      const createResult = await pool.query(
        'INSERT INTO admin_users (email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email',
        [email, hashedPassword, 'super_admin']
      );
      
      if (createResult.rows.length > 0) {
        console.log('✅ New admin user created successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔐 Password: ${newPassword}`);
        console.log('');
        console.log('You can now login to the admin dashboard at /admin/login');
      }
    }
    
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();