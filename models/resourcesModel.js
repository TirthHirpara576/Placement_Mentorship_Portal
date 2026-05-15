import db from '../config/db.js';

export const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM resources ORDER BY id');
    return rows;
};

export const getById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM resources WHERE id=$1',
        [id]
    );
    return rows[0];
};

export const create = async (data) => {
    const { id, tid, bid, rlink, Details } = data;

    const { rows } = await db.query(
        `INSERT INTO resources
        (id, tid, bid, rlink, "Details")
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *`,
        [id, tid, bid, rlink, Details]
    );

    return rows[0];
};

export const update = async (id, data) => {
    const { tid, bid, rlink, Details } = data;

    const { rows } = await db.query(
        `UPDATE resources
         SET tid=$1, bid=$2, rlink=$3, "Details"=$4
         WHERE id=$5
         RETURNING *`,
        [tid, bid, rlink, Details, id]
    );

    return rows[0];
};

export const remove = async (id) => {
    await db.query('DELETE FROM resources WHERE id=$1', [id]);
};