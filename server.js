const express = require("express");
const cors = require("cors");

const app = express();

// Use Render/Railway provided port or fallback to localhost
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Memory store
let latestHeartbeat = null;

// Convert timestamp to human readable
function formatReadableTime(timestamp) {
    const date = new Date(timestamp);

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}

// POST /heartbeat
app.post("/heartbeat", (req, res) => {
    const payload = req.body;

    const readableTime = formatReadableTime(payload.timestamp);

    latestHeartbeat = {
        receivedAt: new Date().toISOString(),
        payload,
        readableTime
    };

    console.log("\n📩 Received Heartbeat:");
    console.log(JSON.stringify(latestHeartbeat, null, 2));

    res.json({
        status: "success",
        message: "Heartbeat received successfully",
        data: latestHeartbeat
    });
});

// GET /heartbeat/latest
app.get("/heartbeat/latest", (req, res) => {
    res.json(latestHeartbeat || { status: "empty", message: "No heartbeat received yet" });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend running on PORT ${PORT}`);
});
