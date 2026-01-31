import mongoose from 'mongoose';
import User from '../models/User';

import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/anatomyai');

    // Check if admin already exists
    let admin = await User.findOne({ email: 'admin@anatomyai.com' });

    if (!admin) {
      // Create admin user
      admin = new User({
        email: 'admin@anatomyai.com',
        password: 'admin123', // Will be hashed automatically
        name: 'Admin'
      });

      await admin.save();
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists');
    }



    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdminUser();