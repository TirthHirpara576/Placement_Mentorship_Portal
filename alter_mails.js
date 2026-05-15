import db from './config/db.js';

try {
    await db.query('ALTER TABLE mails ALTER COLUMN tid DROP NOT NULL');
    console.log('mails.tid is now nullable — Done!');
    process.exit(0);
} catch (err) {
    // May already be nullable — that's fine
    if (err.message.includes('does not exist') || err.message.includes('nullable')) {
        console.log('Already nullable or no change needed.');
        process.exit(0);
    }
    console.error('Error:', err.message);
    process.exit(1);
}
