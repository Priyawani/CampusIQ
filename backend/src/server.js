const express = require("express");

const app = express();

const PORT = 5000;

app.get("/", (req, res) => {
  res.json({
    message: "CampusIQ Backend is running 🚀"
  });
});

app.listen(PORT, () => {
  console.log(`CampusIQ Backend running on http://localhost:${PORT}`);
});

