import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// Storage for Notes (PDFs, Docs, etc.)
export const noteStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'anatomytime/notes',
      resource_type: isImage ? 'image' : 'raw',
      format: isImage ? undefined : file.originalname.split('.').pop(), // Keep original extension for raw files
      public_id: `note-${Date.now()}`,
    };
  },
});

// Storage for Image Maps
export const imageMapStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'anatomytime/imagemaps',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  } as any,
});