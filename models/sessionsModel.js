import db from '../config/db.js';

export const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM sessions ORDER BY id');
    return rows;
};

// Get all sessions with branch name included (for View Sessions page)
export const getAllWithBranch = async () => {
    const { rows } = await db.query(
        `SELECT s.*, b.bname
         FROM sessions s
         JOIN branch b ON b.bid = s.bid
         ORDER BY s.id DESC`
    );
    return rows;
};

export const getById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM sessions WHERE id=$1',
        [id]
    );
    return rows[0];
};

export const create = async (data) => {
    const { id, tid, bid, link, detail, time } = data;

    const { rows } = await db.query(
        `INSERT INTO sessions
        (id, tid, bid, link, detail, time)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *`,
        [id, tid, bid, link, detail, time]
    );

    return rows[0];
};

export const update = async (id, data) => {
    const { tid, bid, link, detail, time } = data;

    const { rows } = await db.query(
        `UPDATE sessions
         SET tid=$1, bid=$2, link=$3, detail=$4, time=$5
         WHERE id=$6
         RETURNING *`,
        [tid, bid, link, detail, time, id]
    );

    return rows[0];
};

export const remove = async (id) => {
    await db.query('DELETE FROM sessions WHERE id=$1', [id]);
};