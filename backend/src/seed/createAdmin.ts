import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/anatomyai');
    
    console.log('Connected to MongoDB');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@anatomyai.com' });
    
    if (!existingAdmin) {
      // Create admin
      const admin = new User({
        email: 'admin@anatomyai.com',
        password: 'admin123',
        name: 'Anatomy AI Admin',
        isAdmin: true
      });
      
      await admin.save();
      console.log('✅ Admin user created successfully!');
      console.log('Email: admin@anatomyai.com');
      console.log('Password: admin123');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();