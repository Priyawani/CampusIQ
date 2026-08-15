"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const test_routes_js_1 = __importDefault(require("./routes/test.routes.js"));
const app = (0, express_1.default)();
const PORT = 5000;
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.json({
        message: "CampusIQ Backend is running 🚀"
    });
});
app.use("/api/auth", auth_routes_js_1.default);
app.use("/api/test", test_routes_js_1.default);
app.listen(PORT, () => {
    console.log(`CampusIQ Backend running on http://localhost:${PORT}`);
});
