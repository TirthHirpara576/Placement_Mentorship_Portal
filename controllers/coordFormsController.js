import db from '../config/db.js';
import * as AuditModel from '../models/auditModel.js';
import { createCompany } from '../models/companyModel.js';
import { create as createRound } from '../models/roundModel.js';
import { create as createPlaced } from '../models/placedModel.js';
import { create as createDescription } from '../models/descriptionModel.js';
import { create as createResource } from '../models/resourcesModel.js';
import { getBranches } from '../models/branchModel.js';
import { getAll as getYears } from '../models/yearModel.js';
import { create as createSession, getAllWithBranch } from '../models/sessionsModel.js';
import { createMail } from '../models/mailsModel.js';
import { updatePassword, getById as getCoordinatorById } from '../models/coordinatorsModel.js';
import nodemailer from 'nodemailer';

// ── Helper: get next auto ID from a table ──────────────────────────────────
const nextId = async (table, idCol) => {
    const r = await db.query(`SELECT COALESCE(MAX(${idCol}), 0) + 1 AS nid FROM ${table}`);
    return r.rows[0].nid;
};

// ── 1. ADD COMPANY ─────────────────────────────────────────────────────────
export const addCompanyPage = async (req, res) => {
    res.render('coordinator/add-company', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        success: null,
        error: null
    });
};

export const addCompanyPost = async (req, res) => {
    const { cname } = req.body;
    const tid = req.coordinator.id;
    const logo = req.file ? req.file.filename : null;

    if (!cname || !cname.trim()) {
        return res.render('coordinator/add-company', {
            activePage: 'dashboard',
            coordName: req.coordinator.tname,
            success: null,
            error: 'Company name is required.'
        });
    }

    try {
        const cid = await nextId('company', 'cid');
        await createCompany({ cid, tid, cname: cname.trim(), logo });

        await AuditModel.create({
            tid,
            action: 'ADD',
            category: 'Company',
            detail: `Added new company ${cname.trim()}`
        });

        res.render('coordinator/add-company', {
            activePage: 'dashboard',
            coordName: req.coordinator.tname,
            success: `Company "${cname}" added successfully!`,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.render('coordinator/add-company', {
            activePage: 'dashboard',
            coordName: req.coordinator.tname,
            success: null,
            error: 'Failed to add company: ' + err.message
        });
    }
};

// ── 2. ADD PLACEMENT PROCEDURE (Round Details) ─────────────────────────────
export const addRoundPage = async (req, res) => {
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    res.render('coordinator/add-round', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        companies: companiesResult.rows,
        success: null,
        error: null
    });
};

export const addRoundPost = async (req, res) => {
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    const { cid, dtext } = req.body;
    const tid = req.coordinator.id;

    if (!cid) {
        return res.render('coordinator/add-round', {
            activePage: 'dashboard', coordName: req.coordinator.tname,
            companies: companiesResult.rows, success: null,
            error: 'Please select a company.'
        });
    }
    if (!dtext || !dtext.trim()) {
        return res.render('coordinator/add-round', {
            activePage: 'dashboard', coordName: req.coordinator.tname,
            companies: companiesResult.rows, success: null,
            error: 'Round details are required.'
        });
    }

    try {
        const id = await nextId('rounddetails', 'id');
        await createRound({ id, tid, cid: parseInt(cid), dtext: dtext.trim() });

        const companyObj = companiesResult.rows.find(c => c.cid == cid);
        const cname = companyObj ? companyObj.cname : 'Unknown Company';
        await AuditModel.create({
            tid,
            action: 'ADD',
            category: 'Placement Procedure',
            detail: `Added round details for company ${cname}`
        });

        res.render('coordinator/add-round', {
            activePage: 'dashboard', coordName: req.coordinator.tname,
            companies: companiesResult.rows,
            success: 'Round details added successfully!',
            error: null
        });
    } catch (err) {
        console.error(err);
        res.render('coordinator/add-round', {
            activePage: 'dashboard', coordName: req.coordinator.tname,
            companies: companiesResult.rows, success: null,
            error: 'Failed to add round: ' + err.message
        });
    }
};

// ── 3. ADD STUDENTS PLACED ─────────────────────────────────────────────────
export const addPlacedPage = async (req, res) => {
    const branches = await getBranches();
    const years = await getYears();
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    res.render('coordinator/add-placed', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        branches, years,
        companies: companiesResult.rows,
        success: null, error: null
    });
};

export const addPlacedPost = async (req, res) => {
    const branches = await getBranches();
    const years = await getYears();
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    const renderPage = (success, error) => res.render('coordinator/add-placed', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        branches, years, companies: companiesResult.rows, success, error
    });

    const { bid, yid, cid, sname, package: pkg, contact } = req.body;
    const tid = req.coordinator.id;

    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!yid) return renderPage(null, 'Please select a year.');
    if (!cid) return renderPage(null, 'Please select a company.');
    if (!sname || !sname.trim()) return renderPage(null, 'Student name is required.');
    if (!pkg || isNaN(pkg) || parseFloat(pkg) < 0) return renderPage(null, 'Enter a valid package amount (number ≥ 0).');
    if (!contact || !contact.trim()) return renderPage(null, 'Email/contact is required.');

    try {
        const id = await nextId('studentsplaced', 'id');
        await createPlaced({
            id, tid,
            bid: parseInt(bid), yid: parseInt(yid), cid: parseInt(cid),
            sname: sname.trim(),
            package: parseFloat(pkg),
            contact: contact.trim()
        });

        const companyObj = companiesResult.rows.find(c => c.cid == cid);
        const cname = companyObj ? companyObj.cname : 'Unknown Company';
        await AuditModel.create({
            tid,
            action: 'ADD',
            category: 'Placement',
            detail: `Added placed student ${sname.trim()} for company ${cname}`
        });

        renderPage('Student placed record added successfully!', null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to add student: ' + err.message);
    }
};

// ── 4. ADD STUDENT EXPERIENCE (Description) ────────────────────────────────
export const addExperiencePage = async (req, res) => {
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    res.render('coordinator/add-experience', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        companies: companiesResult.rows,
        success: null, error: null
    });
};

export const addExperiencePost = async (req, res) => {
    const companiesResult = await db.query('SELECT cid, cname FROM company ORDER BY cname');
    const renderPage = (success, error) => res.render('coordinator/add-experience', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        companies: companiesResult.rows, success, error
    });

    const { cid, dtext } = req.body;
    const tid = req.coordinator.id;

    if (!cid) return renderPage(null, 'Please select a company.');
    if (!dtext || !dtext.trim()) return renderPage(null, 'Experience description is required (min 10 chars).');
    if (dtext.trim().length < 10) return renderPage(null, 'Experience must be at least 10 characters.');

    try {
        const id = await nextId('description', 'id');
        const createdat = new Date().toISOString().split('T')[0];
        await createDescription({ id, tid, cid: parseInt(cid), dtext: dtext.trim(), createdat });

        const companyObj = companiesResult.rows.find(c => c.cid == cid);
        const cname = companyObj ? companyObj.cname : 'Unknown Company';
        await AuditModel.create({
            tid,
            action: 'ADD',
            category: 'Experience',
            detail: `Added student experience for company ${cname}`
        });

        renderPage('Experience added successfully!', null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to add experience: ' + err.message);
    }
};

// ── 5. ADD RESOURCE ────────────────────────────────────────────────────────
export const addResourcePage = async (req, res) => {
    const branches = await getBranches();
    res.render('coordinator/add-resource', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        branches,
        success: null, error: null
    });
};

export const addResourcePost = async (req, res) => {
    const branches = await getBranches();
    const renderPage = (success, error) => res.render('coordinator/add-resource', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        branches, success, error
    });

    const { bid, rlink, Details } = req.body;
    const tid = req.coordinator.id;

    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!rlink || !rlink.trim()) return renderPage(null, 'Resource link is required.');
    if (!rlink.startsWith('http')) return renderPage(null, 'Resource link must start with http:// or https://');
    if (!Details || !Details.trim()) return renderPage(null, 'Resource description is required.');

    try {
        const id = await nextId('resources', 'id');
        await createResource({ id, tid, bid: parseInt(bid), rlink: rlink.trim(), Details: Details.trim() });

        const branchObj = branches.find(b => b.bid == bid);
        const bname = branchObj ? branchObj.bname : 'Unknown Branch';
        await AuditModel.create({
            tid,
            action: 'ADD',
            category: 'Resource',
            detail: `Added new resource link for branch ${bname}`
        });

        renderPage('Resource added successfully!', null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to add resource: ' + err.message);
    }
};

// ── 6. ADD SESSION ─────────────────────────────────────────────────────────
export const addSessionPage = async (req, res) => {
    const branches = await getBranches();
    res.render('coordinator/add-session', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        branches,
        success: null,
        error: null
    });
};

export const addSessionPost = async (req, res) => {
    const branches = await getBranches();
    const renderPage = (success, error) => res.render('coordinator/add-session', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        branches, success, error
    });

    const { bid, detail, time, link } = req.body;
    const tid = req.coordinator.id;

    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!detail || !detail.trim()) return renderPage(null, 'Session description is required.');
    if (!time || !time.trim()) return renderPage(null, 'Session time is required.');

    try {
        const id = await nextId('sessions', 'id');
        await createSession({
            id,
            tid,
            bid: parseInt(bid),
            link: (link || '').trim() || null,
            detail: detail.trim(),
            time: time.trim()
        });

        const branchObj = branches.find(b => b.bid == bid);
        const bname = branchObj ? branchObj.bname : 'Unknown Branch';
        await AuditModel.create({
            tid,
            action: 'ADD',
            category: 'Session',
            detail: `Created session for branch ${bname}`
        });

        renderPage('Session created successfully!', null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to create session: ' + err.message);
    }
};

// ── 7. VIEW SESSIONS ───────────────────────────────────────────────────────
export const viewSessionsPage = async (req, res) => {
    try {
        const sessions = await getAllWithBranch();
        res.render('coordinator/view-sessions', {
            activePage: 'dashboard',
            coordName: req.coordinator.tname,
            sessions
        });
    } catch (err) {
        console.error(err);
        res.render('coordinator/view-sessions', {
            activePage: 'dashboard',
            coordName: req.coordinator.tname,
            sessions: []
        });
    }
};

// ── 8. SEND MAIL ───────────────────────────────────────────────────────────
export const sendMailPage = async (req, res) => {
    // Load coordinator's own record so we can pre-fill their branch
    const coord = await getCoordinatorById(req.coordinator.id);
    const branches = await getBranches();
    const coordBranch = branches.find(b => b.bid === coord.bid);
    res.render('coordinator/send-mail', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        coordBid: coord.bid,
        coordBname: coordBranch ? coordBranch.bname : '',
        success: null,
        error: null
    });
};

export const sendMailPost = async (req, res) => {
    const coord = await getCoordinatorById(req.coordinator.id);
    const branches = await getBranches();
    const coordBranch = branches.find(b => b.bid === coord.bid);
    const renderPage = (success, error) => res.render('coordinator/send-mail', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        coordBid: coord.bid, coordBname: coordBranch ? coordBranch.bname : '',
        success, error
    });

    const { subject, content } = req.body;
    const tid = req.coordinator.id;
    const bid = coord.bid;

    if (!subject || !subject.trim()) return renderPage(null, 'Subject is required.');
    if (!content || !content.trim()) return renderPage(null, 'Content / message is required.');

    try {
        await createMail({ tid, bid, subject: subject.trim(), content: content.trim() });

        // Fetch students from the students table that match the coordinator's branch name
        const bname = coordBranch ? coordBranch.bname : '';
        let studentEmails = [];

        if (bname) {
            const studentsQuery = await db.query('SELECT mail FROM students WHERE bname = $1', [bname]);
            studentEmails = studentsQuery.rows.map(row => row.mail).filter(mail => mail);
        }

        if (studentEmails.length > 0) {
            // Set up Nodemailer transporter
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: studentEmails, // Array of student emails
                subject: subject.trim(),
                text: content.trim()
            };

            await transporter.sendMail(mailOptions);
        } else {
            console.log(`No students found for branch ${bname} to send email.`);
        }

        await AuditModel.create({
            tid,
            action: 'Send Mail',
            category: 'Emails',
            detail: `Coordinator sent email regarding ${subject.trim()} to branch ${bname}`
        });

        renderPage('Mail record saved! Students of your branch will be notified.', null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to save mail: ' + err.message);
    }
};

// ── 9. RESET PASSWORD ──────────────────────────────────────────────────────
export const resetPasswordPage = async (req, res) => {
    res.render('coordinator/reset-password', {
        activePage: 'dashboard',
        coordName: req.coordinator.tname,
        success: null,
        error: null
    });
};

export const resetPasswordPost = async (req, res) => {
    const renderPage = (success, error) => res.render('coordinator/reset-password', {
        activePage: 'dashboard', coordName: req.coordinator.tname,
        success, error
    });

    const { newPwd, confirmPwd } = req.body;

    if (!newPwd || !newPwd.trim()) return renderPage(null, 'New password is required.');
    if (newPwd.trim().length < 6) return renderPage(null, 'Password must be at least 6 characters.');
    if (newPwd !== confirmPwd) return renderPage(null, 'Passwords do not match. Please try again.');

    try {
        await updatePassword(req.coordinator.id, newPwd.trim());
        renderPage('Password updated successfully! Use your new password next time you log in.', null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to update password: ' + err.message);
    }
};
