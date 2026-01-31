const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/anatomyai');
    console.log('✅ Connected to MongoDB');
    
    // Define User schema WITHOUT middleware (we'll handle hashing manually)
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: String,
      isAdmin: { type: Boolean, default: false }
    }, { timestamps: true });
    
    const User = mongoose.model('User', userSchema);
    
    // Create or update admin
    const adminData = {
      email: 'admin@anatomyai.com',
      password: 'admin123',
      name: 'Anatomy AI Admin',
      isAdmin: true
    };
    
    // Hash password manually
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);
    
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      // Update existing admin
      existingAdmin.password = adminData.password;
      existingAdmin.name = adminData.name;
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
      console.log('✅ Admin user updated');
    } else {
      // Create new admin
      const admin = new User(adminData);
      await admin.save();
      console.log('✅ Admin user created');
    }
    
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password: admin123 (original)');
    console.log('🔐 Hashed password stored in database');
    
    // Create a sample image map quiz
    const imageMapQuizSchema = new mongoose.Schema({
      title: String,
      description: String,
      imageUrl: String,
      labeledImageUrl: String,
      regions: Array,
      difficulty: String,
      category: String,
      tags: [String],
      createdBy: mongoose.Schema.Types.ObjectId,
      likes: { type: Number, default: 0 },
      plays: { type: Number, default: 0 },
      avgScore: { type: Number, default: 0 },
      isPublic: { type: Boolean, default: true }
    }, { timestamps: true });
    
    const ImageMapQuiz = mongoose.model('ImageMapQuiz', imageMapQuizSchema);
    
    // Create sample quiz if admin exists
    const adminUser = await User.findOne({ email: 'admin@anatomyai.com' });
    
    if (adminUser) {
      const sampleQuiz = {
        title: "Brain Anatomy Sample",
        description: "Identify major brain structures and lobes",
        imageUrl: "/sample/brain-unlabeled.png",
        labeledImageUrl: "/sample/brain-labeled.png",
        regions: [
          { 
            id: "frontal", 
            name: "Frontal Lobe", 
            points: "200,100 300,100 300,200 200,200",
            description: "Responsible for reasoning, planning, and movement"
          },
          { 
            id: "parietal", 
            name: "Parietal Lobe", 
            points: "300,100 400,100 400,200 300,200",
            description: "Processes sensory information and spatial awareness"
          }
        ],
        difficulty: "hard",
        category: "Neuroanatomy",
        tags: ["brain", "cerebrum", "lobes", "nervous system"],
        createdBy: adminUser._id,
        isPublic: true
      };
      
      const existingQuiz = await ImageMapQuiz.findOne({ title: sampleQuiz.title });
      if (!existingQuiz) {
        await ImageMapQuiz.create(sampleQuiz);
        console.log('✅ Sample quiz created');
      } else {
        console.log('✅ Sample quiz already exists');
      }
    }
    
    console.log('\n🎉 Setup complete!');
    console.log('You can now:');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Access admin panel: http://localhost:3000/admin');
    console.log('3. Login with: admin@anatomyai.com / admin123');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();