import mongoose from 'mongoose';
import ImageMapQuiz from '../models/ImageMapQuiz';
import dotenv from 'dotenv';

dotenv.config();

const sampleQuizzes = [
  {
    title: "Brain Anatomy",
    description: "Identify major brain structures and lobes",
    imageUrl: "",
    svgData: `<svg viewBox="0 0 500 400">
      <polygon id="frontal" points="150,100 250,100 250,200 150,200" fill="#3b82f6" opacity="0.3" />
      <polygon id="parietal" points="250,100 350,100 350,200 250,200" fill="#10b981" opacity="0.3" />
      <polygon id="temporal" points="150,200 250,200 250,300 150,300" fill="#8b5cf6" opacity="0.3" />
      <polygon id="occipital" points="250,200 350,200 350,300 250,300" fill="#f59e0b" opacity="0.3" />
      <polygon id="cerebellum" points="200,300 300,300 300,350 200,350" fill="#ef4444" opacity="0.3" />
    </svg>`,
    regions: [
      { id: "frontal", name: "Frontal Lobe", points: "150,100 250,100 250,200 150,200" },
      { id: "parietal", name: "Parietal Lobe", points: "250,100 350,100 350,200 250,200" },
      { id: "temporal", name: "Temporal Lobe", points: "150,200 250,200 250,300 150,300" },
      { id: "occipital", name: "Occipital Lobe", points: "250,200 350,200 350,300 250,300" },
      { id: "cerebellum", name: "Cerebellum", points: "200,300 300,300 300,350 200,350" }
    ],
    difficulty: "hard",
    category: "Neuroanatomy",
    tags: ["brain", "cerebrum", "lobes", "nervous system"],
    isPublic: true
  },
  {
    title: "Heart Anatomy",
    description: "Label the chambers and major vessels of the heart",
    imageUrl: "",
    svgData: `<svg viewBox="0 0 500 400">
      <polygon id="ra" points="100,100 200,100 200,200 100,200" fill="#3b82f6" opacity="0.3" />
      <polygon id="rv" points="100,200 200,200 200,350 100,350" fill="#10b981" opacity="0.3" />
      <polygon id="la" points="300,100 400,100 400,200 300,200" fill="#8b5cf6" opacity="0.3" />
      <polygon id="lv" points="300,200 400,200 400,350 300,350" fill="#f59e0b" opacity="0.3" />
      <polygon id="aorta" points="250,50 350,50 350,100 250,100" fill="#ef4444" opacity="0.3" />
    </svg>`,
    regions: [
      { id: "ra", name: "Right Atrium", points: "100,100 200,100 200,200 100,200" },
      { id: "rv", name: "Right Ventricle", points: "100,200 200,200 200,350 100,350" },
      { id: "la", name: "Left Atrium", points: "300,100 400,100 400,200 300,200" },
      { id: "lv", name: "Left Ventricle", points: "300,200 400,200 400,350 300,350" },
      { id: "aorta", name: "Aorta", points: "250,50 350,50 350,100 250,100" }
    ],
    difficulty: "standard",
    category: "Cardiovascular",
    tags: ["heart", "circulatory", "chambers", "vessels"],
    isPublic: true
  },
  {
    title: "Skeletal System",
    description: "Identify major bones of the human skeleton",
    imageUrl: "",
    svgData: `<svg viewBox="0 0 500 500">
      <polygon id="skull" points="200,50 300,50 300,150 200,150" fill="#3b82f6" opacity="0.3" />
      <polygon id="ribs" points="180,150 320,150 320,280 180,280" fill="#10b981" opacity="0.3" />
      <polygon id="femur" points="200,350 250,350 250,500 200,500" fill="#8b5cf6" opacity="0.3" />
      <polygon id="tibia" points="250,350 300,350 300,500 250,500" fill="#f59e0b" opacity="0.3" />
      <polygon id="humerus" points="100,150 150,150 150,250 100,250" fill="#ef4444" opacity="0.3" />
    </svg>`,
    regions: [
      { id: "skull", name: "Skull", points: "200,50 300,50 300,150 200,150" },
      { id: "ribs", name: "Rib Cage", points: "180,150 320,150 320,280 180,280" },
      { id: "femur", name: "Femur", points: "200,350 250,350 250,500 200,500" },
      { id: "tibia", name: "Tibia", points: "250,350 300,350 300,500 250,500" },
      { id: "humerus", name: "Humerus", points: "100,150 150,150 150,250 100,250" }
    ],
    difficulty: "easy",
    category: "Skeletal",
    tags: ["bones", "skeleton", "axial", "appendicular"],
    isPublic: true
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/anatomyai');
    
    // Clear existing data
    await ImageMapQuiz.deleteMany({});
    
    // Insert sample quizzes with a dummy user ID
    const dummyUserId = new mongoose.Types.ObjectId();
    const quizzesWithUser = sampleQuizzes.map(quiz => ({
      ...quiz,
      createdBy: dummyUserId,
      likes: Math.floor(Math.random() * 100) + 20,
      plays: Math.floor(Math.random() * 200) + 50,
      avgScore: Math.floor(Math.random() * 30) + 60
    }));
    
    await ImageMapQuiz.insertMany(quizzesWithUser);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();