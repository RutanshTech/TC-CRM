// Auth Routesconst 
express = require('express');
const router = express.Router();
const { login, register, getAllUsers, employeeLogin, operationLogin } = require('../controllers/authController');

// Auth Routes
router.post('/register', register);  // Only super-admin should use this in real app
router.post('/login', login);
router.post('/employee-login', employeeLogin);
router.post('/operation-login', operationLogin);
router.get('/users', getAllUsers);

module.exports = router;
