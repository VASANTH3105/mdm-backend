const express = require("express");
const cors = require("cors");

const app = express();

// Render/Railway port or local
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

let latestHeartbeat = null;

// Convert UTC time -> IST (+5:30)
function convertToIST(utcDate) {
    return new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
}

// Helper to create readable IST time
function formatReadableIST(dateIST) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).format(dateIST);
}

app.post("/heartbeat", (req, res) => {
    const utcNow = new Date();
    const istNow = convertToIST(utcNow);

    latestHeartbeat = {
        receivedAtUTC: utcNow.toISOString(),     // Original UTC
        receivedAtIST: istNow.toISOString(),     // ISO in IST
        readableTime: formatReadableIST(istNow), // Human readable IST
        payload: req.body
    };

    console.log("\n📩 Received Heartbeat:");
    console.log(JSON.stringify(latestHeartbeat, null, 2));

    res.json({
        status: "success",
        message: "Heartbeat logged",
        serverTimeIST: latestHeartbeat.readableTime
    });
});

app.get("/heartbeat/latest", (req, res) => {
    res.json(latestHeartbeat || { status: "empty" });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on PORT ${PORT}`);
});
