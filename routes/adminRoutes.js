import express from 'express';
import jwt from 'jsonwebtoken';

import {
    adminDashboard, dashboardUpdatePost,
    addYearPage, addYearPost,
    addBranchPage, addBranchPost,
    addStudentCountPage, addStudentCountPost,
    deactivateCoordinatorsPage, deactivateCoordinatorsPost,
    addCoordinatorPage, addCoordinatorPost,
    addStudentsPage, addStudentsPost,
    removeStudentsPage, removeStudentsPost,
    sendEmailPage, sendEmailPost,
    adminProfilePage
} from '../controllers/adminController.js';

import multer from 'multer';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'my_secret_key';
const upload = multer({ dest: 'uploads/' });

// Admin authentication middleware
const requireAdminAuth = (req, res, next) => {
    const token = req.cookies && req.cookies.token;
    if (!token) return res.redirect('/login');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key');
        if (decoded.role !== 'admin') {
            return res.redirect('/login');
        }
        req.admin = decoded;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

router.use(requireAdminAuth);

router.get('/dashboard', adminDashboard);
router.post('/dashboard-update', dashboardUpdatePost);

router.get('/add-year', addYearPage);
router.post('/add-year', addYearPost);

router.get('/add-branch', addBranchPage);
router.post('/add-branch', addBranchPost);

router.get('/add-student-count', addStudentCountPage);
router.post('/add-student-count', addStudentCountPost);

router.get('/deactivate-coordinators', deactivateCoordinatorsPage);
router.post('/deactivate-coordinators', deactivateCoordinatorsPost);

router.get('/add-coordinator', addCoordinatorPage);
router.post('/add-coordinator', addCoordinatorPost);

router.get('/add-students', addStudentsPage);
router.post('/add-students', upload.single('file'), addStudentsPost);

router.get('/remove-students', removeStudentsPage);
router.post('/remove-students', removeStudentsPost);

router.get('/send-email', sendEmailPage);
router.post('/send-email', upload.single('attachment'), sendEmailPost);

router.get('/profile', adminProfilePage);

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

export default router;
