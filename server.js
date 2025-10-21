const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 5000;

// মিডলওয়্যার
app.use(cors());
app.use(express.json());

// ডাটাবেজ সেটআপ
const db = new sqlite3.Database('calculations.db', (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // টেবিল তৈরি (যদি না থাকে)
    db.run(`
      CREATE TABLE IF NOT EXISTS calculations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        num1 REAL,
        num2 REAL,
        result REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// API এন্ডপয়েন্ট যোগফলের জন্য
app.post('/api/calculate', (req, res) => {
  const { num1, num2 } = req.body;
  if (!num1 || !num2) {
    return res.status(400).json({ error: 'Please provide two numbers' });
  }
  const sum = parseFloat(num1) + parseFloat(num2);
  // ডাটাবেজে সেভ করা
  db.run(
    `INSERT INTO calculations (num1, num2, result) VALUES (?, ?, ?)`,
    [num1, num2, sum],
    (err) => {
      if (err) {
        console.error('Database insert error:', err.message);
        return res.status(500).json({ error: 'Failed to save calculation' });
      }
      res.json({ result: sum });
    }
  );
});

// হিস্ট্রি ফেচ করার জন্য API
app.get('/api/history', (req, res) => {
  db.all(`SELECT * FROM calculations ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
    res.json(rows);
  });
});

// সার্ভার স্টার্ট
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// ডাটাবেজ বন্ধ করা (সার্ভার বন্ধ হলে)
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Database close error:', err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});