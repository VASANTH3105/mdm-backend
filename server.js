const express = require("express");
const cors = require("cors");

const app = express();

// Render/Railway port or local
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. IN-MEMORY STORAGE
// ==========================================
let latestHeartbeat = null;

// Default Configuration (The "Source of Truth")
let deviceConfig = {
    launcherVisible: true  // true = Show App, false = Hide App
};

// ==========================================
// 2. HELPER FUNCTIONS (Time Formatting)
// ==========================================

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
        hour12: true,
        timeZone: "Asia/Kolkata" // Explicitly ensure timezone
    }).format(dateIST);
}

// ==========================================
// 3. DEVICE ROUTES
// ==========================================

// Device sends data -> Server saves it -> Server sends back CONFIG
app.post("/heartbeat", (req, res) => {
    const utcNow = new Date();
    const istNow = convertToIST(utcNow);

    latestHeartbeat = {
        receivedAtUTC: utcNow.toISOString(),     // Original UTC
        receivedAtIST: istNow.toISOString(),     // ISO in IST
        readableTime: formatReadableIST(istNow), // Human readable IST
        payload: req.body
    };

    console.log(`\n📩 [${latestHeartbeat.readableTime}] Heartbeat Received:`);
    // console.log(JSON.stringify(latestHeartbeat.payload, null, 2)); // Uncomment to see full payload

    res.json({
        status: "success",
        message: "Heartbeat logged",
        serverTimeIST: latestHeartbeat.readableTime,
        config: deviceConfig // <--- CRITICAL: Sends settings to the Android App
    });
});

// ==========================================
// 4. DASHBOARD / ADMIN ROUTES
// ==========================================

// For the Dashboard (Home Page)
app.get("/heartbeat/latest", (req, res) => {
    res.json(latestHeartbeat || { status: "empty" });
});

// For Settings Page: GET current config
app.get("/admin/config", (req, res) => {
    res.json(deviceConfig);
});

// For Settings Page: UPDATE config
app.post("/admin/config", (req, res) => {
    const { launcherVisible } = req.body;

    // Validation: Only update if it is actually a boolean
    if (typeof launcherVisible === 'boolean') {
        deviceConfig.launcherVisible = launcherVisible;
        console.log(`\n⚙️ Configuration Updated: Launcher is now ${launcherVisible ? 'VISIBLE' : 'HIDDEN'}`);
    }

    res.json({
        status: "success",
        message: "Config updated",
        currentConfig: deviceConfig
    });
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Backend running on PORT ${PORT}`);
});