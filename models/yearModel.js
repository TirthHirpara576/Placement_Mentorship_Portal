import db from '../config/db.js';

export const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM year ORDER BY yid');
    return rows;
};

export const getById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM year WHERE yid=$1',
        [id]
    );
    return rows[0];
};

export const create = async (data) => {
    const { yid, year } = data;

    const { rows } = await db.query(
        'INSERT INTO year (yid, year) VALUES ($1,$2) RETURNING *',
        [yid, year]
    );

    return rows[0];
};

export const update = async (id, data) => {
    const { year } = data;

    const { rows } = await db.query(
        'UPDATE year SET year=$1 WHERE yid=$2 RETURNING *',
        [year, id]
    );

    return rows[0];
};

export const remove = async (id) => {
    await db.query('DELETE FROM year WHERE yid=$1', [id]);
};