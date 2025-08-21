import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads/resumes';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId_timestamp_originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const userId = req.user?._id || req.user?.id || 'unknown';
    cb(null, `${userId}_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter for resume uploads
const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Wrap multer to make it optional
export const uploadResume = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    // Don't treat missing file as an error
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      // File field not present, continue without error
      return next();
    }
    if (err) {
      return next(err);
    }
    next();
  });
};

// Middleware to handle multer errors
export const handleUploadError = (error, req, res, next) => {
  console.log('Upload middleware error:', error);
  
  if (error instanceof multer.MulterError) {
    console.log('Multer error:', error.code, error.message);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  } else if (error) {
    console.log('Other upload error:', error.message);
    return res.status(400).json({ error: error.message });
  }
  next();
}; 

// Document upload configuration
export const uploadDocument = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(process.cwd(), 'src/uploads/documents');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Generate unique filename: userId_documentType_timestamp_random.ext
      const userId = req.user._id;
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const ext = path.extname(file.originalname);
              const documentTypeId = req.body.documentTypeId || 'document';
      
      const filename = `${userId}_${documentTypeId}_${timestamp}_${random}${ext}`;
      cb(null, filename);
    }
  }),
  
  fileFilter: function (req, file, cb) {
    // Allow common document formats
    const allowedMimeTypes = [
      'application/pdf',           // PDF
      'image/jpeg',               // JPEG
      'image/jpg',                // JPG
      'image/png',                // PNG
      'image/gif',                // GIF
      'application/msword',       // DOC
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'text/plain'                // TXT
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and document files are allowed.'), false);
    }
  },
  
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
}).single('file'); // Field name for document upload

// Document upload error handler
export const handleDocumentUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name. Use "file" field.' });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  
  console.error('Document upload error:', err);
  return res.status(500).json({ error: 'Document upload failed' });
}; 