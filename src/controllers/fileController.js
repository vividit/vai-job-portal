import { gridfsBucket } from "../utils/gridfs.js";

export const uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ fileId: req.file.id, fileUrl: `/api/files/download/${req.file.filename}` });
};

export const getFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    const file = await gridfsBucket.find({ filename }).toArray();

    if (!file || file.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    gridfsBucket.openDownloadStreamByName(filename).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve file" });
  }
};
