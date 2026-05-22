const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { analyzeIdeas } = require('./llm-service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

function readFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

// Extract ideas only
app.post('/upload-ideas', upload.single('excel'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });

    const ideas = readFile(req.file.path);
    fs.unlinkSync(req.file.path);

    res.json({ message: 'Ideas extracted successfully', count: ideas.length, ideas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full analysis — rates all ideas, picks top 3 overall + top 2 per category
app.post('/analyze', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });

    const ideas = readFile(req.file.path);
    fs.unlinkSync(req.file.path);

    const analysis = await analyzeIdeas(ideas);

    res.json({
      totalIdeas: ideas.length,
      criteria: ['feasibility', 'innovation', 'impact', 'marketability', 'clarity'],
      analysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze directly from uploads/ideas.csv
app.post('/analyze-local', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads', 'ideas.csv');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'uploads/ideas.csv not found' });
    }

    const ideas = readFile(filePath);
    const analysis = await analyzeIdeas(ideas);

    res.json({
      totalIdeas: ideas.length,
      criteria: ['feasibility', 'innovation', 'impact', 'marketability', 'clarity'],
      analysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});