import db from '../config/db.js';

export const getCompanies = async () => {
    const result = await db.query('SELECT * FROM company ORDER BY cid');
    return result.rows;
};

export const getCompanyById = async (cid) => {
    const { rows } = await db.query('SELECT * FROM company WHERE cid=$1', [cid]);
    return rows[0];
};

export const createCompany = async (data) => {
    const { cid, tid, cname, logo } = data;
    const result = await db.query(
        `INSERT INTO company (cid, tid, cname, logo) VALUES ($1,$2,$3,$4) RETURNING *`,
        [cid, tid, cname, logo]
    );
    return result.rows[0];
};

export const updateCompany = async (cid, data) => {
    const { cname } = data;
    const { rows } = await db.query(
        `UPDATE company SET cname=$1 WHERE cid=$2 RETURNING *`,
        [cname, cid]
    );
    return rows[0];
};
