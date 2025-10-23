const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ডিবাগ লগ
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is missing! App will crash.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) return;

  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS calculations (
        id SERIAL PRIMARY KEY,
        num1 REAL,
        num2 REAL,
        result REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "calculations" ready');
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    client.release();
  }
}

initializeDatabase();

app.post('/api/calculate', (req, res) => {
  const { num1, num2 } = req.body;
  if (!num1 || !num2) return res.status(400).json({ error: 'Two numbers required' });
  const sum = parseFloat(num1) + parseFloat(num2);
  pool.query(
    'INSERT INTO calculations (num1, num2, result) VALUES ($1, $2, $3)',
    [num1, num2, sum],
    (err) => {
      if (err) return res.status(500).json({ error: 'Save failed' });
      res.json({ result: sum });
    }
  );
});

app.get('/api/history', (req, res) => {
  pool.query('SELECT * FROM calculations ORDER BY created_at DESC', (err, result) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(result.rows);
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});