import db from '../config/db.js';
import { getCompanyById, updateCompany } from '../models/companyModel.js';
import { getById as getPlacedById, update as updatePlaced, remove as removePlaced } from '../models/placedModel.js';
import { getById as getRoundById, update as updateRound, remove as removeRound } from '../models/roundModel.js';
import { getById as getExpById, update as updateExp, remove as removeExp } from '../models/descriptionModel.js';
import { getById as getResourceById, update as updateResource, remove as removeResource } from '../models/resourcesModel.js';
import { getById as getSessionById, update as updateSession, remove as removeSession } from '../models/sessionsModel.js';
import { getBranches } from '../models/branchModel.js';
import { getAll as getYears } from '../models/yearModel.js';

// ── Profile Page ────────────────────────────────────────────────────────────
// Fetch all data for the logged-in coordinator across all 6 sections
export const profilePage = async (req, res) => {
    const tid = req.coordinator.id;

    const [companies, placed, rounds, experiences, resources, sessions] = await Promise.all([
        // Companies this coordinator added
        db.query('SELECT * FROM company WHERE tid=$1 ORDER BY cid', [tid]),
        // Students placed by this coordinator (with branch, year, company names)
        db.query(
            `SELECT p.*, b.bname, y.year AS yname, c.cname
             FROM studentsplaced p
             JOIN branch b ON b.bid = p.bid
             JOIN year y ON y.yid = p.yid
             JOIN company c ON c.cid = p.cid
             WHERE p.tid=$1 ORDER BY p.id`,
            [tid]
        ),
        // Placement round details by this coordinator (with company name)
        db.query(
            `SELECT r.*, c.cname FROM rounddetails r
             JOIN company c ON c.cid = r.cid
             WHERE r.tid=$1 ORDER BY r.id`,
            [tid]
        ),
        // Student experiences by this coordinator (with company name)
        db.query(
            `SELECT d.*, c.cname FROM description d
             JOIN company c ON c.cid = d.cid
             WHERE d.tid=$1 ORDER BY d.id`,
            [tid]
        ),
        // Resources by this coordinator (with branch name)
        db.query(
            `SELECT r.*, b.bname FROM resources r
             JOIN branch b ON b.bid = r.bid
             WHERE r.tid=$1 ORDER BY r.id`,
            [tid]
        ),
        // Sessions by this coordinator (with branch name)
        db.query(
            `SELECT s.*, b.bname FROM sessions s
             JOIN branch b ON b.bid = s.bid
             WHERE s.tid=$1 ORDER BY s.id`,
            [tid]
        ),
    ]);

    res.render('coordinator/profile', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        companies: companies.rows,
        placed: placed.rows,
        rounds: rounds.rows,
        experiences: experiences.rows,
        resources: resources.rows,
        sessions: sessions.rows,
        success: req.query.success || null,
        error: req.query.error || null,
    });
};

// ── COMPANY: Update ─────────────────────────────────────────────────────────
export const editCompanyPage = async (req, res) => {
    const company = await getCompanyById(req.params.id);
    if (!company || company.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    res.render('coordinator/edit-company', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        company, success: null, error: null
    });
};

export const editCompanyPost = async (req, res) => {
    const company = await getCompanyById(req.params.id);
    if (!company || company.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const { cname } = req.body;
    if (!cname || !cname.trim()) {
        return res.render('coordinator/edit-company', {
            activePage: 'dashboard', coordName: req.coordinator.tname,
            company, success: null, error: 'Company name is required.'
        });
    }
    try {
        await updateCompany(req.params.id, { cname: cname.trim() });
        res.redirect('/coordinator/profile?success=Company updated successfully!');
    } catch (err) {
        res.render('coordinator/edit-company', {
            activePage: 'dashboard', coordName: req.coordinator.tname,
            company, success: null, error: 'Update failed: ' + err.message
        });
    }
};

// ── STUDENTS PLACED: Update + Delete ────────────────────────────────────────
export const editPlacedPage = async (req, res) => {
    const record = await getPlacedById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const [branches, years, companiesResult] = await Promise.all([
        getBranches(),
        getYears(),
        db.query('SELECT cid, cname FROM company ORDER BY cname'),
    ]);
    res.render('coordinator/edit-placed', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, branches, years, companies: companiesResult.rows,
        success: null, error: null
    });
};

export const editPlacedPost = async (req, res) => {
    const record = await getPlacedById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const [branches, years, companiesResult] = await Promise.all([
        getBranches(), getYears(),
        db.query('SELECT cid, cname FROM company ORDER BY cname'),
    ]);
    const renderPage = (success, error) => res.render('coordinator/edit-placed', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, branches, years, companies: companiesResult.rows, success, error
    });

    const { bid, yid, cid, sname, package: pkg, contact } = req.body;
    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!yid) return renderPage(null, 'Please select a year.');
    if (!cid) return renderPage(null, 'Please select a company.');
    if (!sname || !sname.trim()) return renderPage(null, 'Student name is required.');
    if (!pkg || isNaN(pkg)) return renderPage(null, 'Enter a valid package (number).');
    if (!contact || !contact.trim()) return renderPage(null, 'Contact/email is required.');

    try {
        await updatePlaced(req.params.id, {
            tid: req.coordinator.id,
            bid: parseInt(bid), yid: parseInt(yid), cid: parseInt(cid),
            sname: sname.trim(), package: parseFloat(pkg), contact: contact.trim()
        });
        res.redirect('/coordinator/profile?success=Student record updated successfully!');
    } catch (err) {
        renderPage(null, 'Update failed: ' + err.message);
    }
};

export const deletePlaced = async (req, res) => {
    try {
        const record = await getPlacedById(req.params.id);
        if (record && record.tid === req.coordinator.id) await removePlaced(req.params.id);
        res.redirect('/coordinator/profile?success=Student record deleted.');
    } catch (err) {
        res.redirect('/coordinator/profile?error=Delete failed: ' + err.message);
    }
};

// ── PLACEMENT ROUND DETAILS: Update + Delete ─────────────────────────────────
export const editRoundPage = async (req, res) => {
    const record = await getRoundById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    res.render('coordinator/edit-round', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, companies: companiesResult.rows, success: null, error: null
    });
};

export const editRoundPost = async (req, res) => {
    const record = await getRoundById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    const renderPage = (success, error) => res.render('coordinator/edit-round', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, companies: companiesResult.rows, success, error
    });

    const { cid, dtext } = req.body;
    if (!cid) return renderPage(null, 'Please select a company.');
    if (!dtext || !dtext.trim()) return renderPage(null, 'Round details are required.');

    try {
        await updateRound(req.params.id, { tid: req.coordinator.id, cid: parseInt(cid), dtext: dtext.trim() });
        res.redirect('/coordinator/profile?success=Round details updated successfully!');
    } catch (err) {
        renderPage(null, 'Update failed: ' + err.message);
    }
};

export const deleteRound = async (req, res) => {
    try {
        const record = await getRoundById(req.params.id);
        if (record && record.tid === req.coordinator.id) await removeRound(req.params.id);
        res.redirect('/coordinator/profile?success=Round details deleted.');
    } catch (err) {
        res.redirect('/coordinator/profile?error=Delete failed: ' + err.message);
    }
};

// ── STUDENT EXPERIENCES: Update + Delete ─────────────────────────────────────
export const editExpPage = async (req, res) => {
    const record = await getExpById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    res.render('coordinator/edit-experience', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, companies: companiesResult.rows, success: null, error: null
    });
};

export const editExpPost = async (req, res) => {
    const record = await getExpById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    const renderPage = (success, error) => res.render('coordinator/edit-experience', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, companies: companiesResult.rows, success, error
    });

    const { cid, dtext } = req.body;
    if (!cid) return renderPage(null, 'Please select a company.');
    if (!dtext || dtext.trim().length < 10) return renderPage(null, 'Experience must be at least 10 characters.');

    try {
        await updateExp(req.params.id, { tid: req.coordinator.id, cid: parseInt(cid), dtext: dtext.trim() });
        res.redirect('/coordinator/profile?success=Experience updated successfully!');
    } catch (err) {
        renderPage(null, 'Update failed: ' + err.message);
    }
};

export const deleteExp = async (req, res) => {
    try {
        const record = await getExpById(req.params.id);
        if (record && record.tid === req.coordinator.id) await removeExp(req.params.id);
        res.redirect('/coordinator/profile?success=Experience deleted.');
    } catch (err) {
        res.redirect('/coordinator/profile?error=Delete failed: ' + err.message);
    }
};

// ── RESOURCES: Update + Delete ────────────────────────────────────────────────
export const editResourcePage = async (req, res) => {
    const record = await getResourceById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const branches = await getBranches();
    res.render('coordinator/edit-resource', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, branches, success: null, error: null
    });
};

export const editResourcePost = async (req, res) => {
    const record = await getResourceById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const branches = await getBranches();
    const renderPage = (success, error) => res.render('coordinator/edit-resource', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, branches, success, error
    });

    const { bid, rlink, Details } = req.body;
    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!rlink || !rlink.trim()) return renderPage(null, 'Resource link is required.');
    if (!rlink.trim().startsWith('http')) return renderPage(null, 'Link must start with http:// or https://');
    if (!Details || !Details.trim()) return renderPage(null, 'Description is required.');

    try {
        await updateResource(req.params.id, {
            tid: req.coordinator.id, bid: parseInt(bid),
            rlink: rlink.trim(), Details: Details.trim()
        });
        res.redirect('/coordinator/profile?success=Resource updated successfully!');
    } catch (err) {
        renderPage(null, 'Update failed: ' + err.message);
    }
};

export const deleteResource = async (req, res) => {
    try {
        const record = await getResourceById(req.params.id);
        if (record && record.tid === req.coordinator.id) await removeResource(req.params.id);
        res.redirect('/coordinator/profile?success=Resource deleted.');
    } catch (err) {
        res.redirect('/coordinator/profile?error=Delete failed: ' + err.message);
    }
};

// ── SESSIONS: Update + Delete ─────────────────────────────────────────────────
export const editSessionPage = async (req, res) => {
    const record = await getSessionById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const branches = await getBranches();
    res.render('coordinator/edit-session', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, branches, success: null, error: null
    });
};

export const editSessionPost = async (req, res) => {
    const record = await getSessionById(req.params.id);
    if (!record || record.tid !== req.coordinator.id) return res.redirect('/coordinator/profile');
    const branches = await getBranches();
    const renderPage = (success, error) => res.render('coordinator/edit-session', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        record, branches, success, error
    });

    const { bid, detail, time, link } = req.body;
    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!detail || !detail.trim()) return renderPage(null, 'Session description is required.');
    if (!time || !time.trim()) return renderPage(null, 'Session time is required.');

    try {
        await updateSession(req.params.id, {
            tid: req.coordinator.id, bid: parseInt(bid),
            link: (link || '').trim() || null,
            detail: detail.trim(), time: time.trim()
        });
        res.redirect('/coordinator/profile?success=Session updated successfully!');
    } catch (err) {
        renderPage(null, 'Update failed: ' + err.message);
    }
};

export const deleteSession = async (req, res) => {
    try {
        const record = await getSessionById(req.params.id);
        if (record && record.tid === req.coordinator.id) await removeSession(req.params.id);
        res.redirect('/coordinator/profile?success=Session deleted.');
    } catch (err) {
        res.redirect('/coordinator/profile?error=Delete failed: ' + err.message);
    }
};
