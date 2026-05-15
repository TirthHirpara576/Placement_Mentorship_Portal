import db from './config/db.js';

async function checkAdminCols() {
    try {
        const { rows } = await db.query('SELECT * FROM admin LIMIT 1');
        console.log(rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
checkAdminCols();
