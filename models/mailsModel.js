import db from '../config/db.js';

// Create the mails table if it doesn't exist yet
await db.query(`
    CREATE TABLE IF NOT EXISTS mails (
        id SERIAL PRIMARY KEY,
        tid INTEGER REFERENCES coordinators(tid),
        bid INTEGER REFERENCES branch(bid),
        subject VARCHAR(255),
        content TEXT,
        sent_at TIMESTAMP DEFAULT NOW()
    )
`);

// Save a mail record to the database
export const createMail = async ({ tid, bid, subject, content }) => {
    const { rows } = await db.query(
        `INSERT INTO mails (tid, bid, subject, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tid, bid, subject, content]
    );
    return rows[0];
};

// Get all mail records (newest first)
export const getAllMails = async () => {
    const { rows } = await db.query(
        `SELECT m.*, c.tname, b.bname
         FROM mails m
         JOIN coordinators c ON c.tid = m.tid
         JOIN branch b ON b.bid = m.bid
         ORDER BY m.sent_at DESC`
    );
    return rows;
};
