const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

let latestHeartbeat = null;

app.post("/heartbeat", (req, res) => {
    latestHeartbeat = {
        receivedAt: new Date().toISOString(),
        payload: req.body
    };

    console.log("Heartbeat:", latestHeartbeat);

    res.json({
        status: "success",
        message: "Heartbeat received",
        receivedData: req.body
    });
});

app.get("/heartbeat/latest", (req, res) => {
    res.json(latestHeartbeat || { message: "No data yet" });
});

app.listen(PORT, () => {
    console.log(`🚀 Railway backend running on port ${PORT}`);
});

