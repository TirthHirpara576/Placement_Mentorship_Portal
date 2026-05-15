import { getCompanies } from '../models/companyModel.js';
import { getBranches } from '../models/branchModel.js';
import { getAll as getYears } from '../models/yearModel.js';
import { getAll as getResources } from '../models/resourcesModel.js';
import { getAll as getAllPlaced } from '../models/placedModel.js';
import { getAll as getCoordinators } from '../models/coordinatorsModel.js';
import db from '../config/db.js';

// Helper: extracts coordinator info from req (set by optionalAuth middleware)
const coordInfo = (req) => {
    if (req.coordinator && req.coordinator.role === 'admin') {
        return {
            isAdmin: true,
            adminName: req.coordinator.name,
            isCoordinator: false,
            coordName: ''
        };
    } else if (req.coordinator && req.coordinator.role === 'coordinator') {
        return {
            isAdmin: false,
            adminName: '',
            isCoordinator: true,
            coordName: req.coordinator.tname
        };
    }
    return {
        isAdmin: false,
        adminName: '',
        isCoordinator: false,
        coordName: ''
    };
};

// ==============================
// Home (Companies listing page)
// ==============================
export const indexPage = async (req, res) => {
    try {
        const { bid, yid } = req.query;

        let query;
        const params = [];
        const conditions = [];

        if (bid || yid) {
            // Filter: show only companies that recruited students in selected branch/year
            query = `SELECT DISTINCT c.* FROM company c
                     JOIN studentsplaced sp ON c.cid = sp.cid`;

            if (bid) {
                conditions.push(`sp.bid = $${params.length + 1}`);
                params.push(bid);
            }
            if (yid) {
                conditions.push(`sp.yid = $${params.length + 1}`);
                params.push(yid);
            }

            query += ' WHERE ' + conditions.join(' AND ');
        } else {
            // Default: show all companies
            query = `SELECT * FROM company c`;
        }

        query += ' ORDER BY c.cid';

        const result = await db.query(query, params);
        const companies = result.rows;
        const branches = await getBranches();
        const years = await getYears();

        res.render('index', {
            companies,
            branches,
            years,
            selectedBid: bid || '',
            selectedYid: yid || '',
            activePage: 'home',
            ...coordInfo(req)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};


// ==============================
// Company Profile Page
// ==============================
export const companyProfilePage = async (req, res) => {
    try {
        const cid = req.params.cid;

        const compResult = await db.query('SELECT * FROM company WHERE cid = $1', [cid]);
        const company = compResult.rows[0];
        if (!company) return res.status(404).send('Company not found');

        const roundResult = await db.query(
            'SELECT * FROM rounddetails WHERE cid = $1 ORDER BY id', [cid]
        );
        const rounds = roundResult.rows;

        const descResult = await db.query(
            'SELECT * FROM description WHERE cid = $1 ORDER BY createdat DESC', [cid]
        );
        const descriptions = descResult.rows;

        const placedResult = await db.query(
            `SELECT sp.*, b.bname, y.year
             FROM studentsplaced sp
             LEFT JOIN branch b ON sp.bid = b.bid
             LEFT JOIN year y ON sp.yid = y.yid
             WHERE sp.cid = $1
             ORDER BY sp.id`, [cid]
        );
        const placed = placedResult.rows;

        res.render('companyProfile', {
            company, rounds, descriptions, placed,
            activePage: 'home',
            ...coordInfo(req)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

// ==============================
// Resources Page
// ==============================
export const resourcesPage = async (req, res) => {
    try {
        const { bid } = req.query;
        let resources;

        if (bid) {
            const result = await db.query(
                'SELECT r.*, b.bname FROM resources r LEFT JOIN branch b ON r.bid = b.bid WHERE r.bid = $1 ORDER BY r.id',
                [bid]
            );
            resources = result.rows;
        } else {
            const result = await db.query(
                'SELECT r.*, b.bname FROM resources r LEFT JOIN branch b ON r.bid = b.bid ORDER BY r.id'
            );
            resources = result.rows;
        }

        const branches = await getBranches();

        res.render('resources', {
            resources,
            branches,
            selectedBid: bid || '',
            activePage: 'resources',
            ...coordInfo(req)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

// ==============================
// Coordinators Page (public)
// ==============================
export const coordinatorsPage = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT co.*, b.bname, y.year
             FROM coordinators co
             LEFT JOIN branch b ON co.bid = b.bid
             LEFT JOIN year y ON co.yid = y.yid
             WHERE co.active = true
             ORDER BY co.tid`
        );
        const coordinators = result.rows;
        res.render('coordinators', {
            coordinators,
            activePage: 'coordinators',
            ...coordInfo(req)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

// ==============================
// Statistics Page
// ==============================
export const statisticsPage = async (req, res) => {
    try {
        const { bid, yid } = req.query;
        let baseQuery = ' FROM studentsplaced sp';
        let conditions = [];
        let params = [];

        if (bid) {
            conditions.push(`sp.bid = $${params.length + 1}`);
            params.push(bid);
        }
        if (yid) {
            conditions.push(`sp.yid = $${params.length + 1}`);
            params.push(yid);
        }

        let whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        const totalResult = await db.query('SELECT COUNT(*) as total' + baseQuery + whereClause, params);
        const totalPlaced = parseInt(totalResult.rows[0].total) || 0;

        const maxResult = await db.query('SELECT MAX(package) as max_val' + baseQuery + whereClause, params);
        const highestPackage = maxResult.rows[0].max_val ? parseFloat(maxResult.rows[0].max_val).toFixed(2) : '0';

        const avgResult = await db.query('SELECT AVG(package) as avg_val' + baseQuery + whereClause, params);
        const avgPackage = avgResult.rows[0].avg_val ? parseFloat(avgResult.rows[0].avg_val).toFixed(2) : '0.00';

        const compQuery = `
            SELECT c.cname, COUNT(sp.id) as count
            FROM studentsplaced sp
            JOIN company c ON sp.cid = c.cid
            ${whereClause}
            GROUP BY c.cname
            ORDER BY count DESC, c.cname ASC
        `;
        const compResult = await db.query(compQuery, params);
        const companyRecruitment = compResult.rows;

        const branches = await getBranches();
        const years = await getYears();

        res.render('statistics', {
            branches,
            years,
            selectedBid: bid || '',
            selectedYid: yid || '',
            totalPlaced,
            highestPackage,
            avgPackage,
            companyRecruitment,
            activePage: 'statistics',
            ...coordInfo(req)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

// ==============================
// Login Page
// ==============================
export const loginPage = async (req, res) => {
    res.render('login', { activePage: '', error: null, isCoordinator: false, coordName: '' });
};

// ==============================
// Coordinator Dashboard Page
// ==============================
export const coordinatorDashboard = async (req, res) => {
    try {
        const coordName = req.coordinator ? req.coordinator.tname : 'Coordinator';
        const { yid } = req.query;

        const years = await getYears();

        let placed = [];
        if (yid) {
            const result = await db.query(
                `SELECT sp.*, c.cname, b.bname, y.year
                 FROM studentsplaced sp
                 LEFT JOIN company c ON sp.cid = c.cid
                 LEFT JOIN branch b ON sp.bid = b.bid
                 LEFT JOIN year y ON sp.yid = y.yid
                 WHERE sp.yid = $1
                 ORDER BY sp.package DESC NULLS LAST`,
                [yid]
            );
            placed = result.rows;
        }

        res.render('coordinator/dashboard', {
            coordName,
            years,
            placed,
            selectedYid: yid || '',
            activePage: 'dashboard',
            isCoordinator: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};
