# AnatomyTime

A full-stack educational platform designed to help medical students master clinical anatomy through AI-generated quizzes, flashcards, rapid recall exercises, and interactive diagram identification.

### App link:  
https://anatomyai-orcin.vercel.app/

## Key Features
* **AI Quiz Generation:** Automatically generate multiple-choice, free-response, or mixed clinical anatomy quizzes from text prompts or uploaded documents.
* **Smart AI Grading:** Free-response answers are evaluated by AI, providing students with fair scoring and constructive, medically accurate feedback.
* **Interactive Flashcards:** Instantly convert study notes into digital flashcard decks.
* **Rapid Recall Mode:** Test diagnostic speed against a built-in timer.
* **Image Map Module:** Hand-crafted, interactive diagram identification tests allowing users to visually click and identify anatomical structures.
* **Demo Mode (Graceful Degradation):** A built-in portfolio feature that allows visitors and recruiters to seamlessly test the UI using pre-generated database content even when AI generation is paused.

## Tech Stack
* **Frontend:** React, TypeScript, Tailwind CSS, React-Img-Mapper
* **Backend:** Node.js, Express.js, TypeScript
* **Database & Storage:** MongoDB (Mongoose), Cloudinary
* **AI Integration:** Google AI Studio (Gemini 2.5 Flash)

##  Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/MercyAndati/AnatomyTime.git]
Install dependencies:
Open two terminal windows.

Bash
# Terminal 1 (Backend)
cd backend

npm install

# Terminal 2 (Frontend)
cd frontend

npm install

Environment Variables:
Create a .env file in the backend directory and add the following:
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=your_google_ai_studio_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
IS_AI_ENABLED=true

Create a .env file in the frontend directory and add:
VITE_API_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000

Start the development servers:
### Run in both frontend and backend directories
npm run dev
