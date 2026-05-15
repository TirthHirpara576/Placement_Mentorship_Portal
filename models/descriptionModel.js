import db from '../config/db.js';

export const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM description ORDER BY id');
    return rows;
};

export const getById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM description WHERE id=$1',
        [id]
    );
    return rows[0];
};

export const create = async (data) => {
    const { id, tid, cid, dtext, createdat } = data;

    const { rows } = await db.query(
        `INSERT INTO description
        (id, tid, cid, dtext, createdat)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *`,
        [id, tid, cid, dtext, createdat]
    );

    return rows[0];
};

export const update = async (id, data) => {
    const { tid, cid, dtext } = data;

    const { rows } = await db.query(
        `UPDATE description
         SET tid=$1, cid=$2, dtext=$3
         WHERE id=$4
         RETURNING *`,
        [tid, cid, dtext, id]
    );

    return rows[0];
};

export const remove = async (id) => {
    await db.query('DELETE FROM description WHERE id=$1', [id]);
};