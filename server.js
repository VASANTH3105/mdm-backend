const express = require("express");
const cors = require("cors");

const app = express();

// Use Render/Railway provided port or fallback to localhost
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

let latestHeartbeat = null;

app.post("/heartbeat", (req, res) => {
    latestHeartbeat = {
        receivedAt: new Date().toISOString(),
        payload: req.body
    };
    console.log("📩 Received Heartbeat:", latestHeartbeat);
    res.json({
        status: "success",
        message: "Heartbeat received successfully"
    });
});

app.get("/heartbeat/latest", (req, res) => {
    res.json(latestHeartbeat || { status: "empty" });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on PORT ${PORT}`);
});
