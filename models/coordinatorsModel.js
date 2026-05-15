import db from '../config/db.js';

export const getAll = async () => {
    const { rows } = await db.query(
        'SELECT * FROM coordinators WHERE active = true ORDER BY tid'
    );
    return rows;
};

export const getById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM coordinators WHERE tid=$1',
        [id]
    );
    return rows[0];
};

export const findCoordinatorByUid = async (uid) => {

    const result = await db.query(
        "SELECT * FROM coordinators WHERE uid = $1 AND active = true",
        [uid]
    );

    return result.rows[0];

};

export const create = async (data) => {
    const { tid, bid, yid, tname, contact, uid, pwd, active } = data;

    const { rows } = await db.query(
        `INSERT INTO coordinators
        (tid,bid,yid,tname,contact,uid,pwd,active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [tid, bid, yid, tname, contact, uid, pwd, active]
    );

    return rows[0];
};

export const update = async (id, data) => {
    const { tname, contact, uid, pwd, active } = data;

    const { rows } = await db.query(
        `UPDATE coordinators
         SET tname=$1, contact=$2, uid=$3, pwd=$4, active=$5
         WHERE tid=$6
         RETURNING *`,
        [tname, contact, uid, pwd, active, id]
    );

    return rows[0];
};

export const remove = async (id) => {
    await db.query(
        'DELETE FROM coordinators WHERE tid=$1',
        [id]
    );
};

// Update a coordinator's password (plain text, consistent with existing login)
export const updatePassword = async (tid, newPwd) => {
    await db.query(
        'UPDATE coordinators SET pwd=$1 WHERE tid=$2',
        [newPwd, tid]
    );
};