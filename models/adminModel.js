import db from '../config/db.js';

// Find admin by username (for login)
export const findAdminByUid = async (uid) => {
    const { rows } = await db.query(
        'SELECT * FROM admin WHERE uid = $1',
        [uid]
    );
    return rows[0];
};

// Get admin by id (for profile)
export const getAdminById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM admin WHERE id = $1',
        [id]
    );
    return rows[0];
};
