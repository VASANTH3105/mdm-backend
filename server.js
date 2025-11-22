const express = require("express");
const cors = require("cors");

const app = express();

// Render/Railway port or local
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

let latestHeartbeat = null;

// Helper to create readable time
function formatReadableTime(date) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).format(date);
}

app.post("/heartbeat", (req, res) => {

    // Create server timestamp
    const now = new Date();

    latestHeartbeat = {
        receivedAt: now.toISOString(),  // server ISO time
        readableTime: formatReadableTime(now), // readable server time
        payload: req.body               // device data (unchanged)
    };

    console.log("\n📩 Received Heartbeat:");
    console.log(JSON.stringify(latestHeartbeat, null, 2));

    res.json({
        status: "success",
        message: "Heartbeat logged",
        serverTime: latestHeartbeat.readableTime
    });
});

app.get("/heartbeat/latest", (req, res) => {
    res.json(latestHeartbeat || { status: "empty" });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on PORT ${PORT}`);
});
