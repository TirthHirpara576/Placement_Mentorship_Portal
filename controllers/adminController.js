import db from '../config/db.js';
import * as AuditModel from '../models/auditModel.js';
import { getBranches } from '../models/branchModel.js';
import { getAll as getYears } from '../models/yearModel.js';
import { getAdminById } from '../models/adminModel.js';
import xlsx from 'xlsx';
import fs from 'fs';
import nodemailer from 'nodemailer';

// Helper: get next auto ID from a table
const nextId = async (table, idCol) => {
    const r = await db.query(`SELECT COALESCE(MAX(${idCol}), 0) + 1 AS nid FROM ${table}`);
    return r.rows[0].nid;
};

// ── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
export const adminDashboard = async (req, res) => {
    try {
        const adminName = req.admin ? req.admin.name : 'Admin';

        const [bRes, yRes, cRes, iRes] = await Promise.all([
            db.query('SELECT * FROM branch ORDER BY bid'),
            db.query('SELECT * FROM year ORDER BY year DESC'),
            db.query(`
                SELECT c.*, b.bname 
                FROM coordinators c
                LEFT JOIN branch b ON c.bid = b.bid
                WHERE c.active = true ORDER BY c.tid
            `),
            db.query(`
                SELECT sc.id, b.bname, y.year, sc.count 
                FROM studentcount sc
                JOIN branch b ON sc.bid = b.bid
                JOIN year y ON sc.yid = y.yid
                ORDER BY y.year DESC, b.bname ASC
            `)
        ]);

        res.render('admin/dashboard', {
            adminName,
            activePage: 'dashboard',
            branches: bRes.rows,
            years: yRes.rows,
            coordinators: cRes.rows,
            intake: iRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

export const dashboardUpdatePost = async (req, res) => {
    try {
        const { updateType, updateId } = req.body;

        if (updateType === 'branch') {
            await db.query('UPDATE branch SET bname = $1 WHERE bid = $2', [req.body.bname, updateId]);
        } else if (updateType === 'year') {
            await db.query('UPDATE year SET year = $1 WHERE yid = $2', [req.body.year, updateId]);
        } else if (updateType === 'coordinator') {
            await db.query('UPDATE coordinators SET tname = $1, contact = $2 WHERE tid = $3', [req.body.tname, req.body.contact, updateId]);
        } else if (updateType === 'intake') {
            await db.query('UPDATE studentcount SET count = $1 WHERE id = $2', [req.body.count, updateId]);
        }

        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating record: ' + err.message);
    }
};

// ── 1. ADD YEAR ───────────────────────────────────────────────────────────────
export const addYearPage = async (req, res) => {
    const years = await getYears();
    res.render('admin/add-year', {
        adminName: req.admin.name,
        activePage: 'dashboard',
        years,
        success: null, error: null
    });
};

export const addYearPost = async (req, res) => {
    const years = await getYears();
    const renderPage = (s, e) => res.render('admin/add-year', {
        adminName: req.admin.name, activePage: 'dashboard', years, success: s, error: e
    });

    const { year } = req.body;
    if (!year || !year.trim()) return renderPage(null, 'Year is required.');
    if (isNaN(year) || parseInt(year) < 1900 || parseInt(year) > 2100)
        return renderPage(null, 'Please enter a valid year (e.g. 2025).');

    // Check duplicate
    const existing = years.find(y => y.year === year.trim());
    if (existing) return renderPage(null, `Year "${year}" already exists.`);

    try {
        const yid = await nextId('year', 'yid');
        await db.query('INSERT INTO year (yid, year) VALUES ($1, $2)', [yid, year.trim()]);
        await AuditModel.create({
            action: 'Add Year',
            category: 'Year',
            detail: `Added year ${year.trim()}`
        });
        const updatedYears = await getYears();
        res.render('admin/add-year', {
            adminName: req.admin.name, activePage: 'dashboard',
            years: updatedYears,
            success: `Year "${year}" added successfully!`, error: null
        });
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to add year: ' + err.message);
    }
};

// ── 2. ADD BRANCH ─────────────────────────────────────────────────────────────
export const addBranchPage = async (req, res) => {
    const branches = await getBranches();
    res.render('admin/add-branch', {
        adminName: req.admin.name,
        activePage: 'dashboard',
        branches,
        success: null, error: null
    });
};

export const addBranchPost = async (req, res) => {
    const branches = await getBranches();
    const renderPage = (s, e) => res.render('admin/add-branch', {
        adminName: req.admin.name, activePage: 'dashboard', branches, success: s, error: e
    });

    const { bname } = req.body;
    if (!bname || !bname.trim()) return renderPage(null, 'Branch name is required.');

    // Check duplicate
    const existing = branches.find(b => b.bname.toLowerCase() === bname.trim().toLowerCase());
    if (existing) return renderPage(null, `Branch "${bname}" already exists.`);

    try {
        const bid = await nextId('branch', 'bid');
        await db.query('INSERT INTO branch (bid, bname) VALUES ($1, $2)', [bid, bname.trim()]);
        await AuditModel.create({
            action: 'Add Branch',
            category: 'Branch',
            detail: `Added branch ${bname.trim()}`
        });
        const updatedBranches = await getBranches();
        res.render('admin/add-branch', {
            adminName: req.admin.name, activePage: 'dashboard',
            branches: updatedBranches,
            success: `Branch "${bname}" added successfully!`, error: null
        });
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to add branch: ' + err.message);
    }
};

// ── 3. ADD STUDENT COUNT (Intake) ─────────────────────────────────────────────
export const addStudentCountPage = async (req, res) => {
    const branches = await getBranches();
    const years = await getYears();
    res.render('admin/add-student-count', {
        adminName: req.admin.name,
        activePage: 'dashboard',
        branches, years,
        success: null, error: null
    });
};

export const addStudentCountPost = async (req, res) => {
    const branches = await getBranches();
    const years = await getYears();
    const renderPage = (s, e) => res.render('admin/add-student-count', {
        adminName: req.admin.name, activePage: 'dashboard',
        branches, years, success: s, error: e
    });

    const { bid, yid, count } = req.body;
    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!yid) return renderPage(null, 'Please select a year.');
    if (!count || isNaN(count) || parseInt(count) < 0) return renderPage(null, 'Enter a valid student count (number ≥ 0).');

    try {
        const id = await nextId('studentcount', 'id');
        await db.query(
            'INSERT INTO studentcount (id, yid, bid, count) VALUES ($1, $2, $3, $4)',
            [id, parseInt(yid), parseInt(bid), parseInt(count)]
        );
        await AuditModel.create({
            action: 'Add Student Count',
            category: 'Students',
            detail: `Added student intake count of ${count}`
        });
        renderPage(`Student intake count saved successfully! (${count} students)`, null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to save intake count: ' + err.message);
    }
};

// ── 4. DEACTIVATE COORDINATORS ────────────────────────────────────────────────
export const deactivateCoordinatorsPage = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT co.tid, co.tname, b.bname
             FROM coordinators co
             LEFT JOIN branch b ON co.bid = b.bid
             WHERE co.active = true
             ORDER BY co.tname`
        );
        res.render('admin/deactivate-coordinators', {
            adminName: req.admin.name,
            activePage: 'dashboard',
            coordinators: result.rows,
            success: null, error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

export const deactivateCoordinatorsPost = async (req, res) => {
    try {
        // "selected" may be a single string or an array of strings
        let selected = req.body.selected;
        if (!selected) {
            // Nothing checked
            const result = await db.query(
                `SELECT co.tid, co.tname, b.bname FROM coordinators co LEFT JOIN branch b ON co.bid = b.bid WHERE co.active = true ORDER BY co.tname`
            );
            return res.render('admin/deactivate-coordinators', {
                adminName: req.admin.name, activePage: 'dashboard',
                coordinators: result.rows,
                success: null, error: 'Please select at least one coordinator to deactivate.'
            });
        }

        if (!Array.isArray(selected)) selected = [selected];

        // Set active = false for selected coordinator IDs
        await db.query(
            'UPDATE coordinators SET active = false WHERE tid = ANY($1::int[])',
            [selected.map(Number)]
        );

        await AuditModel.create({
            action: 'Deactivate Coordinators',
            category: 'Coordinators',
            detail: `Deactivated ${selected.length} coordinator(s)`
        });

        const result = await db.query(
            `SELECT co.tid, co.tname, b.bname FROM coordinators co LEFT JOIN branch b ON co.bid = b.bid WHERE co.active = true ORDER BY co.tname`
        );
        res.render('admin/deactivate-coordinators', {
            adminName: req.admin.name, activePage: 'dashboard',
            coordinators: result.rows,
            success: `${selected.length} coordinator(s) deactivated successfully.`, error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

// ── 5. ADD NEW COORDINATOR ────────────────────────────────────────────────────
export const addCoordinatorPage = async (req, res) => {
    const branches = await getBranches();
    const years = await getYears();
    res.render('admin/add-coordinator', {
        adminName: req.admin.name,
        activePage: 'dashboard',
        branches, years,
        success: null, error: null
    });
};

export const addCoordinatorPost = async (req, res) => {
    const branches = await getBranches();
    const years = await getYears();
    const renderPage = (s, e) => res.render('admin/add-coordinator', {
        adminName: req.admin.name, activePage: 'dashboard',
        branches, years, success: s, error: e
    });

    const { tname, bid, yid, contact, uid, pwd } = req.body;
    if (!tname || !tname.trim()) return renderPage(null, 'Coordinator name is required.');
    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!yid) return renderPage(null, 'Please select a year.');
    if (!uid || !uid.trim()) return renderPage(null, 'Username is required.');
    if (!pwd || pwd.trim().length < 4) return renderPage(null, 'Password must be at least 4 characters.');

    try {
        // Check if username already exists
        const dupCheck = await db.query('SELECT tid FROM coordinators WHERE uid = $1', [uid.trim()]);
        if (dupCheck.rows.length > 0) return renderPage(null, `Username "${uid}" is already taken.`);

        const tid = await nextId('coordinators', 'tid');
        await db.query(
            'INSERT INTO coordinators (tid, bid, yid, tname, contact, uid, pwd, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            [tid, parseInt(bid), parseInt(yid), tname.trim(), (contact || '').trim(), uid.trim(), pwd.trim(), true]
        );
        await AuditModel.create({
            action: 'Add Coordinator',
            category: 'Coordinators',
            detail: `Added coordinator ${tname.trim()}`
        });
        renderPage(`Coordinator "${tname}" added successfully!`, null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to add coordinator: ' + err.message);
    }
};

// ── 6. ADD STUDENTS ───────────────────────────────────────────────────────────
export const addStudentsPage = async (req, res) => {
    const branches = await getBranches();
    res.render('admin/add-students', {
        adminName: req.admin.name,
        activePage: 'dashboard',
        branches,
        success: null, error: null
    });
};

export const addStudentsPost = async (req, res) => {
    const branches = await getBranches();
    const renderPage = (s, e) => res.render('admin/add-students', {
        adminName: req.admin.name, activePage: 'dashboard',
        branches, success: s, error: e
    });

    if (!req.file) {
        return renderPage(null, 'Please upload an Excel file.');
    }

    try {
        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        fs.unlinkSync(filePath); // delete temp file

        if (data.length < 2) return renderPage(null, 'Excel file is empty or missing data rows.');

        // Assuming first row is header, skip it.
        let addedCount = 0;
        let pId = await nextId('students', 'id');

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;

            const mail = (row[0] || '').toString().trim();
            const bname = (row[1] || '').toString().trim();
            const entryyear = parseInt(row[2]);

            if (mail && bname && !isNaN(entryyear)) {
                await db.query(
                    'INSERT INTO students (id, mail, bname, entryyear) VALUES ($1,$2,$3,$4)',
                    [pId++, mail, bname, entryyear]
                );
                addedCount++;
            }
        }

        await AuditModel.create({
            action: 'Add Students',
            category: 'Students',
            detail: `Imported ${addedCount} student(s) from Excel`
        });

        renderPage(`Successfully imported ${addedCount} student(s)!`, null);
    } catch (err) {
        console.error(err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        renderPage(null, 'Failed to import students: ' + err.message);
    }
};

// ── 7. REMOVE STUDENTS ────────────────────────────────────────────────────────
export const removeStudentsPage = async (req, res) => {
    try {
        const { rows: years } = await db.query('SELECT DISTINCT entryyear FROM students ORDER BY entryyear DESC');
        res.render('admin/remove-students', {
            adminName: req.admin.name,
            activePage: 'dashboard',
            years: years.map(r => r.entryyear),
            success: null, error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

export const removeStudentsPost = async (req, res) => {
    try {
        const { year } = req.body;

        let query = '';
        let params = [];
        let deletedMessage = '';

        if (!year) {
            const { rows: years } = await db.query('SELECT DISTINCT entryyear FROM students ORDER BY entryyear DESC');
            return res.render('admin/remove-students', {
                adminName: req.admin.name, activePage: 'dashboard',
                years: years.map(r => r.entryyear), success: null, error: 'Please select a year.'
            });
        }

        if (year === 'All') {
            await db.query('DELETE FROM students');
            deletedMessage = 'All students have been removed successfully.';
            await AuditModel.create({ action: 'Remove Students', category: 'Students', detail: 'Removed all students' });
        } else {
            await db.query('DELETE FROM students WHERE entryyear = $1', [parseInt(year)]);
            deletedMessage = `Students from year ${year} removed successfully.`;
            await AuditModel.create({ action: 'Remove Students', category: 'Students', detail: `Removed students from year ${year}` });
        }

        const { rows: updatedYears } = await db.query('SELECT DISTINCT entryyear FROM students ORDER BY entryyear DESC');
        res.render('admin/remove-students', {
            adminName: req.admin.name, activePage: 'dashboard',
            years: updatedYears.map(r => r.entryyear),
            success: deletedMessage, error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};

// ── 8. SEND EMAIL ─────────────────────────────────────────────────────────────
export const sendEmailPage = async (req, res) => {
    const branches = await getBranches();
    res.render('admin/send-email', {
        adminName: req.admin.name,
        activePage: 'dashboard',
        branches,
        success: null, error: null
    });
};

export const sendEmailPost = async (req, res) => {
    const branches = await getBranches();
    const renderPage = (s, e) => {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.render('admin/send-email', {
            adminName: req.admin.name, activePage: 'dashboard',
            branches, success: s, error: e
        });
    };

    const { bid, subject, content } = req.body;

    if (!bid) return renderPage(null, 'Please select a branch.');
    if (!subject || !subject.trim()) return renderPage(null, 'Subject is required.');
    if (!content || !content.trim()) return renderPage(null, 'Message content is required.');

    try {
        const branchObj = branches.find(b => b.bid == bid);
        const bname = branchObj ? branchObj.bname : 'the branch';

        await db.query(
            `INSERT INTO mails (bid, subject, content, sent_at)
             VALUES ($1, $2, $3, NOW())`,
            [parseInt(bid), subject.trim(), content.trim()]
        );

        await AuditModel.create({
            action: 'Send Mail',
            category: 'Emails',
            detail: `Sent email regarding ${subject.trim()} to branch ${bname}`
        });

        let studentEmails = [];
        if (bname) {
            const studentsQuery = await db.query('SELECT mail FROM students WHERE bname = $1', [bname]);
            studentEmails = studentsQuery.rows.map(row => row.mail).filter(mail => mail);
        }

        if (studentEmails.length > 0) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER, // Replace with your actual email in .env
                    pass: process.env.EMAIL_PASS // Replace with your app password in .env
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: studentEmails,
                subject: subject.trim(),
                text: content.trim()
            };

            if (req.file) {
                mailOptions.attachments = [
                    {
                        filename: req.file.originalname,
                        path: req.file.path
                    }
                ];
            }

            await transporter.sendMail(mailOptions);
        } else {
            console.log(`No students found for branch ${bname} to send email.`);
        }

        renderPage(`Mail campaign for ${bname} has been queued and emails sent. You can safely close this page.`, null);
    } catch (err) {
        console.error(err);
        renderPage(null, 'Failed to send email: ' + err.message);
    }
};

// ── 9. ADMIN PROFILE ──────────────────────────────────────────────────────────
export const adminProfilePage = async (req, res) => {
    try {
        const admin = await getAdminById(req.admin.id);

        // Fetch chart raw data
        const { rows: placements } = await db.query(`
            SELECT p.*, y.year, b.bname, c.cname 
            FROM studentsplaced p
            LEFT JOIN year y ON p.yid = y.yid
            LEFT JOIN branch b ON p.bid = b.bid
            LEFT JOIN company c ON p.cid = c.cid
        `);

        // Fetch student intakes mapping
        const { rows: intakes } = await db.query(`
            SELECT sc.count, y.year, b.bname
            FROM studentcount sc
            JOIN year y ON sc.yid = y.yid
            JOIN branch b ON sc.bid = b.bid
        `);

        // Fetch recent activities from unified audit
        const { rows: audits } = await db.query(`
            SELECT a.*, COALESCE(c.tname, 'System Administrator') as doer
            FROM audit a
            LEFT JOIN coordinators c ON a.tid = c.tid
            ORDER BY a.time DESC LIMIT 50
        `);

        res.render('admin/profile', {
            adminName: req.admin.name,
            activePage: 'dashboard',
            admin,
            placements: JSON.stringify(placements),
            intakes: JSON.stringify(intakes),
            audits
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error: ' + err.message);
    }
};
