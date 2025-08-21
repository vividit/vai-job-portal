import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";

let gfs, gridfsBucket;

const connectGridFS = (conn) => {
  gridfsBucket = new GridFSBucket(conn.db, {
    bucketName: "uploads"
  });

  gfs = gridfsBucket;
};

// Setup multer storage for GridFS
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: "uploads",
      metadata: {
        uploadedBy: req.user?.id || "anonymous",
        type: req.body?.type || "resume"
      }
    };
  }
});

const upload = multer({ storage });

export { connectGridFS, upload, gfs, gridfsBucket };
