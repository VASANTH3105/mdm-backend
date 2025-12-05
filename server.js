const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// 1. Initialize Firebase
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
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. IN-MEMORY STORAGE
// ==========================================
let latestHeartbeat = null;
let deviceFcmToken = null; 

let deviceConfig = {
    launcherVisible: true, 
    lockDevice: false
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
function getShiftedDate(utcDate) {
    return new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
}

function formatReadableIST(utcDate) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: true, timeZone: "Asia/Kolkata"
    }).format(utcDate);
}

// ==========================================
// 3. DEVICE ROUTES
// ==========================================
app.post("/heartbeat", (req, res) => {
    const utcNow = new Date();
    const body = req.body;

    if (body.fcmToken) {
        if (deviceFcmToken !== body.fcmToken) {
            console.log(`📲 New Device Token Registered: ${body.fcmToken.substring(0, 20)}...`);
            deviceFcmToken = body.fcmToken;
        }
    }

    const readable = formatReadableIST(utcNow);
    const istShifted = getShiftedDate(utcNow);

    latestHeartbeat = {
        receivedAtUTC: utcNow.toISOString(),     
        receivedAtIST: istShifted.toISOString().replace("Z", "+05:30"),
        readableTime: readable,                  
        payload: body
    };

    console.log(`\n📩 [${readable}] Heartbeat Received`);
    
    res.json({
        status: "success",
        message: "Heartbeat synced",
        serverTimeIST: readable,
        config: deviceConfig 
    });
});

// ==========================================
// 4. ADMIN APIs
// ==========================================
app.get("/heartbeat/latest", (req, res) => {
    res.json({ 
        ...latestHeartbeat, 
        currentConfig: deviceConfig, 
        deviceToken: deviceFcmToken || "Not Registered"
    });
});

// 👇 UPDATED: Auto-Notify on Config Change
app.post("/admin/config", async (req, res) => {
    const { launcherVisible, lockDevice } = req.body;
    let notificationResult = "No notification sent";

    // 1. Handle Launcher Visibility Change
    if (typeof launcherVisible === 'boolean') {
        const oldState = deviceConfig.launcherVisible;
        deviceConfig.launcherVisible = launcherVisible;

        // If the state CHANGED and we have a token, notify the user
        if (oldState !== launcherVisible && deviceFcmToken) {
            const bodyText = launcherVisible 
                ? "App visibility enabled by Admin." 
                : "App visibility disabled by Admin.";

            const message = {
                token: deviceFcmToken,
                notification: {
                    title: "MDM Settings Update",
                    body: bodyText
                },
                // Sending SYNC command forces the app to update config immediately
                data: { command: "SYNC" } 
            };

            try {
                await admin.messaging().send(message);
                notificationResult = "Notification sent successfully";
                console.log(`🚀 Alert sent: ${bodyText}`);
            } catch (error) {
                console.error("🔥 Failed to send alert:", error.message);
                notificationResult = "Failed to send notification";
            }
        }
    }

    if (typeof lockDevice === 'boolean') deviceConfig.lockDevice = lockDevice;

    console.log("\n⚙️  Admin Config Updated:", deviceConfig);

    res.json({
        status: "success",
        message: "Config updated.",
        notificationStatus: notificationResult,
        currentConfig: deviceConfig
    });
});

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
        data: { command: command || "SYNC" }
    };

    try {
        const response = await admin.messaging().send(message);
        res.json({ status: "success", firebaseResponse: response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 MDM Backend running at http://0.0.0.0:${PORT}`);
});