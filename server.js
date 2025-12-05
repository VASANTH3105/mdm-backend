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

let deviceConfig = {
    launcherVisible: true  // true = Show App, false = Hide App
};

// ==========================================
// 2. HELPER FUNCTIONS (Time Formatting)
// ==========================================

// Helper 1: Manually shift time (Used ONLY for ISO String)
function getShiftedDate(utcDate) {
    return new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
}

// Helper 2: Readable format (Let Intl handle the math from UTC)
function formatReadableIST(utcDate) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata" // This handles the +5:30 automatically
    }).format(utcDate);
}

// ==========================================
// 3. DEVICE ROUTES
// ==========================================

app.post("/heartbeat", (req, res) => {
    const utcNow = new Date(); // The absolute current time (UTC)
    
    // 1. Create the Readable String using the REAL UTC time
    const readable = formatReadableIST(utcNow);

    // 2. Create the Shifted Date object JUST for the ISO string
    // (So the JSON looks like "2025-12-06T01:10...")
    const istShifted = getShiftedDate(utcNow);

    latestHeartbeat = {
        receivedAtUTC: utcNow.toISOString(),     
        receivedAtIST: istShifted.toISOString().replace("Z", "+05:30"), // Corrected ISO string
        readableTime: readable,                  
        payload: req.body
    };

    console.log(`\n📩 [${latestHeartbeat.readableTime}] Heartbeat Received`);
    
    res.json({
        status: "success",
        message: "Heartbeat logged",
        serverTimeIST: latestHeartbeat.readableTime,
        config: deviceConfig 
    });
});

// ==========================================
// 4. DASHBOARD / ADMIN ROUTES
// ==========================================

app.get("/heartbeat/latest", (req, res) => {
    res.json(latestHeartbeat || { status: "empty" });
});

app.get("/admin/config", (req, res) => {
    res.json(deviceConfig);
});

app.post("/admin/config", (req, res) => {
    const { launcherVisible } = req.body;

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