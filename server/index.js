import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'habit_tracker.db');
const verboseSqlite = sqlite3.verbose();
const db = new verboseSqlite.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Habits table
        db.run(`CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

        // Completions table (tracks which days are done)
        db.run(`CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER,
      day INTEGER,
      month INTEGER,
      year INTEGER,
      FOREIGN KEY(habit_id) REFERENCES habits(id)
    )`);
    });
}

// Routes

// Login (Simple: Get or Create User)
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json(row);
        } else {
            db.run("INSERT INTO users (username) VALUES (?)", [username], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, username });
            });
        }
    });
});

// Get User Data (Habits & Completions)
app.get('/api/data', (req, res) => {
    const { userId, month, year } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    const response = { habits: [] };

    // Fetch active habits for user
    const sqlHabits = "SELECT * FROM habits WHERE user_id = ? AND archived = 0";
    db.all(sqlHabits, [userId], (err, habits) => {
        if (err) return res.status(500).json({ error: err.message });

        if (habits.length === 0) {
            return res.json([]);
        }

        let processed = 0;
        habits.forEach(habit => {
            // Fetch completions for this habit in specific month/year
            const sqlCompletions = "SELECT day FROM completions WHERE habit_id = ? AND month = ? AND year = ?";
            db.all(sqlCompletions, [habit.id, month, year], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                response.habits.push({
                    id: habit.id,
                    name: habit.name,
                    completedDays: rows.map(r => r.day)
                });

                processed++;
                if (processed === habits.length) {
                    res.json(response.habits);
                }
            });
        });
    });
});

// Add Habit
app.post('/api/habits', (req, res) => {
    const { userId, name } = req.body;
    db.run("INSERT INTO habits (user_id, name) VALUES (?, ?)", [userId, name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, completedDays: [] });
    });
});

// Delete Habit
app.delete('/api/habits/:id', (req, res) => {
    db.run("DELETE FROM habits WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        // Also delete completions
        db.run("DELETE FROM completions WHERE habit_id = ?", [req.params.id]);
        res.json({ success: true });
    });
});

// Toggle Day
app.post('/api/toggle', (req, res) => {
    const { habitId, day, month, year } = req.body;

    // Check if exists
    db.get("SELECT id FROM completions WHERE habit_id = ? AND day = ? AND month = ? AND year = ?",
        [habitId, day, month, year], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            if (row) {
                // Exists -> Delete (Uncheck)
                db.run("DELETE FROM completions WHERE id = ?", [row.id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ status: 'removed' });
                });
            } else {
                // Not exists -> Insert (Check)
                db.run("INSERT INTO completions (habit_id, day, month, year) VALUES (?, ?, ?, ?)",
                    [habitId, day, month, year], (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ status: 'added' });
                    });
            }
        });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
