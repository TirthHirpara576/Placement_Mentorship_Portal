import db from './config/db.js';

const sql = `
  CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    uid VARCHAR(50) UNIQUE NOT NULL,
    pwd VARCHAR(100) NOT NULL
  );
  INSERT INTO admin (name, uid, pwd)
  VALUES ('Prof. Mehul Patel', 'Admin123', 'Admin123')
  ON CONFLICT (uid) DO NOTHING;
`;

try {
    await db.query(sql);
    console.log('Admin table created and record inserted successfully!');
    process.exit(0);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
