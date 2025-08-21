import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { uploadFile, getFile } from "../controllers/fileController.js";
import { upload } from "../utils/gridfs.js";

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadFile);
router.get("/download/:filename", getFile);

export default router;
