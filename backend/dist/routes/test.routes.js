"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const role_middleware_js_1 = require("../middleware/role.middleware.js");
const router = express_1.default.Router();
// Any authenticated user
router.get("/profile", auth_middleware_js_1.authenticateToken, (req, res) => {
    res.json({
        message: "You accessed a protected route successfully!",
        user: req.user
    });
});
// Only ADMIN users
router.get("/admin", auth_middleware_js_1.authenticateToken, (0, role_middleware_js_1.authorizeRoles)("ADMIN"), (req, res) => {
    res.json({
        message: "Welcome Admin!",
        user: req.user
    });
});
// STUDENT and FACULTY
router.get("/academic", auth_middleware_js_1.authenticateToken, (0, role_middleware_js_1.authorizeRoles)("STUDENT", "FACULTY"), (req, res) => {
    res.json({
        message: "You can access academic resources",
        user: req.user
    });
});
exports.default = router;
