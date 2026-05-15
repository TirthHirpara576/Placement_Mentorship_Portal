import db from '../config/db.js';

export const getPlacedByYearModel = async (yid) => {

  const result = await db.query(
    `SELECT p.*, c.cname
     FROM studentsplaced p
     LEFT JOIN company c ON p.cid = c.cid
     WHERE p.yid = $1`,
    [yid]
  );

  return result.rows;

};
export const getAll = async () => {
    const { rows } = await db.query(
        'SELECT * FROM studentsplaced ORDER BY id'
    );
    return rows;
};

export const getById = async (id) => {
    const { rows } = await db.query(
        'SELECT * FROM studentsplaced WHERE id=$1',
        [id]
    );
    return rows[0];
};

export const create = async (data) => {

    const { id, tid, bid, yid, cid, sname, package: pkg, contact } = data;

    const { rows } = await db.query(
        `INSERT INTO studentsplaced
        (id, tid, bid, yid, cid, sname, package, contact)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [id, tid, bid, yid, cid, sname, pkg, contact]
    );

    return rows[0];
};

export const update = async (id, data) => {

    const { tid, bid, yid, cid, sname, package: pkg, contact } = data;

    const { rows } = await db.query(
        `UPDATE studentsplaced
         SET tid=$1, bid=$2, yid=$3, cid=$4,
             sname=$5, package=$6, contact=$7
         WHERE id=$8
         RETURNING *`,
        [tid, bid, yid, cid, sname, pkg, contact, id]
    );

    return rows[0];
};

export const remove = async (id) => {
    await db.query(
        'DELETE FROM studentsplaced WHERE id=$1',
        [id]
    );
};