import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import multer from 'multer';

// Routes (API)

import adminRoutes from './routes/adminRoutes.js';

// Home controller (view rendering)
import {
    indexPage,
    companyProfilePage,
    resourcesPage,
    coordinatorsPage,
    statisticsPage,
    loginPage,
    coordinatorDashboard
} from './controllers/homeController.js';

// Coordinator forms controller
import {
    addCompanyPage, addCompanyPost,
    addRoundPage, addRoundPost,
    addPlacedPage, addPlacedPost,
    addExperiencePage, addExperiencePost,
    addResourcePage, addResourcePost,
    addSessionPage, addSessionPost,
    viewSessionsPage,
    sendMailPage, sendMailPost,
    resetPasswordPage, resetPasswordPost
} from './controllers/coordFormsController.js';

// Profile controller (view, edit, delete for all 6 sections)
import {
    profilePage,
    editCompanyPage, editCompanyPost,
    editPlacedPage, editPlacedPost, deletePlaced,
    editRoundPage, editRoundPost, deleteRound,
    editExpPage, editExpPost, deleteExp,
    editResourcePage, editResourcePost, deleteResource,
    editSessionPage, editSessionPost, deleteSession
} from './controllers/profileController.js';

import { findCoordinatorByUid } from './models/coordinatorsModel.js';
import { findAdminByUid } from './models/adminModel.js';
import * as AuditModel from './models/auditModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'my_secret_key';

// Create app
const app = express();

// Path setup (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer – logo uploads saved to /logos folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'logos')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'company_' + Date.now() + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        cb(null, allowed.test(file.mimetype));
    }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set EJS as the View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/logos', express.static(path.join(__dirname, 'logos')));
app.use('/css', express.static(path.join(__dirname, 'views', 'css')));
app.use('/js', express.static(path.join(__dirname, 'views', 'js')));

// API Routes

app.use('/admin', adminRoutes);

// Optional auth – silently attaches coordinator info if logged in, never redirects
const optionalAuth = (req, res, next) => {
    const token = req.cookies && req.cookies.token;
    if (token) {
        try { req.coordinator = jwt.verify(token, JWT_SECRET); } catch (e) { /* not logged in */ }
    }
    next();
};

// Required auth – redirects to login if no valid token
const requireAuth = (req, res, next) => {
    const token = req.cookies && req.cookies.token;
    if (!token) return res.redirect('/login');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        req.coordinator = decoded;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

// Apply optional auth to ALL routes so public pages know coordinator status
app.use(optionalAuth);

// ── Public Page Routes ────────────────────────────────────────────────────
app.get('/', indexPage);
app.get('/Home/Index', indexPage);
app.get('/Home/CompanyProfile/:cid', companyProfilePage);
app.get('/Home/Resources', resourcesPage);
app.get('/coordinators', coordinatorsPage);
app.get('/Home/Coordinators', coordinatorsPage);
app.get('/statistics', statisticsPage);
app.get('/Home/Statistics', statisticsPage);

// Login
app.get('/login', (req, res) => {
    const token = req.cookies && req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role === 'admin') {
                return res.redirect('/admin/dashboard');
            }
            return res.redirect('/coordinator/dashboard');
        } catch (e) { }
    }
    res.render('login', { error: null, activePage: '' });
});

app.post('/login', async (req, res) => {
    try {
        const { uid, pwd } = req.body;

        // 1. Check if it's an admin first
        const admin = await findAdminByUid(uid);
        if (admin && admin.pwd === pwd) {
            const token = jwt.sign(
                { role: 'admin', id: admin.id, uid: admin.uid, name: admin.name },
                JWT_SECRET,
                { expiresIn: '8h' }
            );
            res.cookie('token', token, { httpOnly: true });

            await AuditModel.create({
                tid: -1,
                action: 'Login',
                category: 'Authentication',
                detail: `Admin logged in (uid: ${admin.uid})`
            });

            return res.redirect('/admin/dashboard');
        }

        // 2. Check if it's a coordinator
        const user = await findCoordinatorByUid(uid);
        if (!user || user.pwd !== pwd) {
            return res.render('login', { error: 'Invalid username or password.', activePage: '' });
        }
        const token = jwt.sign(
            { role: 'coordinator', id: user.tid, uid: user.uid, tname: user.tname },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.cookie('token', token, { httpOnly: true });

        await AuditModel.create({
            tid: user.tid,
            action: 'Login',
            category: 'Authentication',
            detail: `Coordinator logged in (uid: ${user.uid})`
        });

        res.redirect('/coordinator/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Server error. Please try again.', activePage: '' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// ── Coordinator Protected Routes ──────────────────────────────────────────
app.get('/coordinator/dashboard', requireAuth, coordinatorDashboard);

// 1. Add Company
app.get('/coordinator/add-company', requireAuth, addCompanyPage);
app.post('/coordinator/add-company', requireAuth, upload.single('logo'), addCompanyPost);

// 2. Add Placement Procedure (Round Details)
app.get('/coordinator/add-placement-procedure', requireAuth, addRoundPage);
app.post('/coordinator/add-placement-procedure', requireAuth, addRoundPost);

// 3. Add Students Placed
app.get('/coordinator/add-students-placed', requireAuth, addPlacedPage);
app.post('/coordinator/add-students-placed', requireAuth, addPlacedPost);

// 4. Add Student Experiences
app.get('/coordinator/add-student-experiences', requireAuth, addExperiencePage);
app.post('/coordinator/add-student-experiences', requireAuth, addExperiencePost);

// 5. Add Resources
app.get('/coordinator/add-resources', requireAuth, addResourcePage);
app.post('/coordinator/add-resources', requireAuth, addResourcePost);

// 6. Add Session
app.get('/coordinator/add-session', requireAuth, addSessionPage);
app.post('/coordinator/add-session', requireAuth, addSessionPost);

// 7. View Sessions
app.get('/coordinator/view-sessions', requireAuth, viewSessionsPage);

// 8. Send Mail
app.get('/coordinator/send-mail', requireAuth, sendMailPage);
app.post('/coordinator/send-mail', requireAuth, sendMailPost);

// 9. Coordinator Profile — full CRUD
app.get('/coordinator/profile', requireAuth, profilePage);

// Edit Company (Update only — no delete per spec)
app.get('/coordinator/edit-company/:id', requireAuth, editCompanyPage);
app.post('/coordinator/edit-company/:id', requireAuth, editCompanyPost);

// Edit & Delete — Students Placed
app.get('/coordinator/edit-placed/:id', requireAuth, editPlacedPage);
app.post('/coordinator/edit-placed/:id', requireAuth, editPlacedPost);
app.post('/coordinator/delete-placed/:id', requireAuth, deletePlaced);

// Edit & Delete — Round Details
app.get('/coordinator/edit-round/:id', requireAuth, editRoundPage);
app.post('/coordinator/edit-round/:id', requireAuth, editRoundPost);
app.post('/coordinator/delete-round/:id', requireAuth, deleteRound);

// Edit & Delete — Student Experiences
app.get('/coordinator/edit-experience/:id', requireAuth, editExpPage);
app.post('/coordinator/edit-experience/:id', requireAuth, editExpPost);
app.post('/coordinator/delete-experience/:id', requireAuth, deleteExp);

// Edit & Delete — Resources
app.get('/coordinator/edit-resource/:id', requireAuth, editResourcePage);
app.post('/coordinator/edit-resource/:id', requireAuth, editResourcePost);
app.post('/coordinator/delete-resource/:id', requireAuth, deleteResource);

// Edit & Delete — Sessions
app.get('/coordinator/edit-session/:id', requireAuth, editSessionPage);
app.post('/coordinator/edit-session/:id', requireAuth, editSessionPost);
app.post('/coordinator/delete-session/:id', requireAuth, deleteSession);

// 10. Reset Password
app.get('/coordinator/reset-password', requireAuth, resetPasswordPage);
app.post('/coordinator/reset-password', requireAuth, resetPasswordPost);

// Report generation placeholder
app.get('/coordinator/report', requireAuth, (req, res) => {
    res.send('<h2 style="font-family:sans-serif;padding:2rem;">PDF Report generation coming soon!</h2>');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;