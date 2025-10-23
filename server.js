const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Railway-এর জন্য
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS calculations (
        id SERIAL PRIMARY KEY,
        num1 REAL,
        num2 REAL,
        result REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "calculations" created or already exists');
  } catch (err) {
    console.error('Database initialization error:', err.stack);
  } finally {
    client.release(); // কানেকশন ফিরিয়ে দিন
  }
}

initializeDatabase(); // ডাটাবেস ইনিশিয়ালাইজ করা

app.post('/api/calculate', (req, res) => {
  const { num1, num2 } = req.body;
  if (!num1 || !num2) return res.status(400).json({ error: 'Please provide two numbers' });
  const sum = parseFloat(num1) + parseFloat(num2);
  pool.query(
    `INSERT INTO calculations (num1, num2, result) VALUES ($1, $2, $3)`,
    [num1, num2, sum],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save calculation' });
      res.json({ result: sum });
    }
  );
});

app.get('/api/history', (req, res) => {
  pool.query(`SELECT * FROM calculations ORDER BY created_at DESC`, (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch history' });
    res.json(result.rows);
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGINT', () => {
  pool.end(() => process.exit(0));
});