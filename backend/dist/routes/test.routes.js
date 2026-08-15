"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = express_1.default.Router();
router.get("/profile", auth_middleware_js_1.authenticateToken, (req, res) => {
    res.json({
        message: "You accessed a protected route successfully!",
        user: req.user
    });
});
exports.default = router;
