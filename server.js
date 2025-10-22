const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL ব্যবহার
const app = express();

// দ্যানামিক পোর্ট
const port = process.env.PORT || 5000;

// মিডলওয়্যার
app.use(cors());
app.use(express.json());

// PostgreSQL সেটআপ
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Railway থেকে আসবে
});

pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to PostgreSQL');
    // টেবিল তৈরি (যদি না থাকে)
    pool.query(`
      CREATE TABLE IF NOT EXISTS calculations (
        id SERIAL PRIMARY KEY,
        num1 REAL,
        num2 REAL,
        result REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Table creation error:', err.message);
    });
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
  pool.query(
    `INSERT INTO calculations (num1, num2, result) VALUES ($1, $2, $3) RETURNING *`,
    [num1, num2, sum],
    (err, result) => {
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
  pool.query(`SELECT * FROM calculations ORDER BY created_at DESC`, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
    res.json(result.rows);
  });
});

// সার্ভার স্টার্ট
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// সার্ভার বন্ধ হলে কানেকশন বন্ধ
process.on('SIGINT', () => {
  pool.end((err) => {
    if (err) console.error('Database close error:', err.message);
    console.log('Database connection closed.');
    process.exit(0);
  });
});