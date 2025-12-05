const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// 1. Initialize Firebase (REQUIRED for Notifications)
// Ensure 'firebase-admin-key.json' is in the same folder
try {
    const serviceAccount = require("./firebase-admin-key.json"); 
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Initialized");
} catch (e) {
    console.error("❌ Firebase Init Failed:", e.message);
}

const app = express();

// Render/Railway port or local 8080
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. IN-MEMORY STORAGE
// ==========================================
let latestHeartbeat = null;
let deviceFcmToken = null; // Stores the phone's address

// Default Configuration (The Command Center)
let deviceConfig = {
    launcherVisible: true, // true = Show Icon, false = Hide Icon
    lockDevice: false
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

// POST /heartbeat
// App sends data -> Server saves Token -> Server responds with Config
app.post("/heartbeat", (req, res) => {
    const utcNow = new Date();
    const body = req.body;

    // 1. Capture the FCM Token if provided
    if (body.fcmToken) {
        if (deviceFcmToken !== body.fcmToken) {
            console.log(`📲 New Device Token Registered: ${body.fcmToken.substring(0, 20)}...`);
            deviceFcmToken = body.fcmToken;
        }
    }

    // 2. Format Time
    const readable = formatReadableIST(utcNow);
    const istShifted = getShiftedDate(utcNow);

    latestHeartbeat = {
        receivedAtUTC: utcNow.toISOString(),     
        receivedAtIST: istShifted.toISOString().replace("Z", "+05:30"),
        readableTime: readable,                  
        payload: body
    };

    console.log(`\n📩 [${readable}] Heartbeat: Battery ${body.battery?.level}%`);
    
    // 3. Respond with the COMMAND config
    res.json({
        status: "success",
        message: "Heartbeat synced",
        serverTimeIST: readable,
        config: deviceConfig // <--- Critical: App reads this to Hide/Show icon
    });
});

// ==========================================
// 4. ADMIN APIs
// ==========================================

// GET /heartbeat/latest
app.get("/heartbeat/latest", (req, res) => {
    res.json({ 
        ...latestHeartbeat, 
        currentConfig: deviceConfig, 
        deviceToken: deviceFcmToken || "Not Registered"
    });
});

// POST /admin/config
// Usage: { "launcherVisible": false }
app.post("/admin/config", (req, res) => {
    const { launcherVisible, lockDevice } = req.body;

    if (typeof launcherVisible === 'boolean') deviceConfig.launcherVisible = launcherVisible;
    if (typeof lockDevice === 'boolean') deviceConfig.lockDevice = lockDevice;

    console.log("\n⚙️  Admin Config Updated:", deviceConfig);

    res.json({
        status: "success",
        message: "Config updated. Device will apply on next heartbeat.",
        currentConfig: deviceConfig
    });
});

// POST /admin/notify
// Usage: { "title": "Alert", "body": "Hello!" }
app.post("/admin/notify", async (req, res) => {
    const { title, body, command } = req.body;

    if (!deviceFcmToken) {
        return res.status(400).json({ error: "No device token. Wait for app heartbeat." });
    }

    const message = {
        token: deviceFcmToken,
        notification: {
            title: title || "MDM Alert",
            body: body || "Message from Admin"
        },
        data: {
            command: command || "SYNC" 
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("🚀 Notification sent successfully");
        res.json({ status: "success", firebaseResponse: response });
    } catch (error) {
        console.error("🔥 Notification failed:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 MDM Backend running on PORT ${PORT}`);
});