import db from '../config/db.js';

export const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM audit ORDER BY id');
    return rows;
};

export const getById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM audit WHERE id=$1',
        [id]
    );
    return rows[0];
};

export const create = async (data) => {
    let { id, tid, action, category, detail, time } = data;

    if (tid === undefined || tid === null) {
        tid = -1;
    }
    if (!time) {
        time = new Date();
    }

    let result;
    if (id) {
        // Only use explicit ID if provided, e.g. for migrating
        const { rows } = await db.query(
            `INSERT INTO audit
            (id, tid, action, category, detail, time)
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *`,
            [id, tid, action, category, detail, time]
        );
        result = rows;
    } else {
        // Let the DB sequence generate the ID
        const { rows } = await db.query(
            `INSERT INTO audit
            (tid, action, category, detail, time)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *`,
            [tid, action, category, detail, time]
        );
        result = rows;
    }

    return result[0];
};

export const update = async (id, data) => {
    const { tid, action, category, detail } = data;

    const { rows } = await db.query(
        `UPDATE audit
         SET tid=$1, action=$2, category=$3, detail=$4
         WHERE id=$5
         RETURNING *`,
        [tid, action, category, detail, id]
    );

    return rows[0];
};

export const remove = async (id) => {
    await db.query('DELETE FROM audit WHERE id=$1', [id]);
};