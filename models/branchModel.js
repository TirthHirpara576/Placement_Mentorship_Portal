import db from '../config/db.js';

export const getBranches = async () => {
    const { rows } = await db.query('SELECT * FROM branch ORDER BY bid');
    return rows;
};

export const getBranchById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM branch WHERE bid=$1',
        [id]
    );
    return rows[0];
};

export const createBranch = async (data) => {
    const { bid, bname } = data;

    const { rows } = await db.query(
        'INSERT INTO branch (bid, bname) VALUES ($1,$2) RETURNING *',
        [bid, bname]
    );

    return rows[0];
};

export const updateBranch = async (id, data) => {
    const { bname } = data;

    const { rows } = await db.query(
        'UPDATE branch SET bname=$1 WHERE bid=$2 RETURNING *',
        [bname, id]
    );

    return rows[0];
};

export const deleteBranch = async (id) => {
    await db.query('DELETE FROM branch WHERE bid=$1', [id]);
};