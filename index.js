const express = require("express");
const ZCA = require("zca-js");
const cors = require("cors");
const serverless = require('serverless-http');
const axios = require('axios');

require('dotenv').config();


const {
  updateN8nZaloCredential,
} = require("./n8n-credential");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

app.get("/qr-login", async (req, res) => {
  try {
    const zalo = new ZCA.Zalo();
    let api = await zalo.loginQR({}, async (qrEvent) => {
      console.error(
        "Received QR event type:",
        qrEvent ? qrEvent.type : "no event"
      );

      switch (qrEvent.type) {
        case 0: // QRCodeGenerated
          if (qrEvent?.data?.image) {
            const qrCodeBase64 = qrEvent.data.image;
            console.error("QR code generated, length:", qrCodeBase64.length);
            // Set the content type header to image/png
            // res.setHeader("Content-Type", "image/png");

            // Send the image buffer as the response
            res.send(qrCodeBase64);
          } else {
            console.error("Could not get QR code from Zalo SDK");
          }
          break;

        case 1: // QRCodeExpired
          console.error("QR code expired. Please try again.");
          break;

        case 2: // QRCodeScanned
          console.error("=== QR CODE SCANNED ===");
          if (qrEvent?.data) {
            console.error("User:", qrEvent.data.display_name);
            console.error("Avatar:", qrEvent.data.avatar ? "Yes" : "No");
          }
          break;

        case 3: // QRCodeDeclined
          console.error("=== QR CODE DECLINED ===");
          if (qrEvent?.data?.code) {
            console.error("Decline code:", qrEvent.data.code);
          }
          break;

        case 4: // GotLoginInfo
          console.error("=== GOT LOGIN INFO ===");
          if (qrEvent?.data) {
            const cookie = qrEvent.data.cookie || [];
            const imei = qrEvent.data.imei || "";
            const userAgent = qrEvent.data.userAgent || "";
            const proxy = qrEvent.data.proxy || "";

            await updateN8nZaloCredential(axios, cookie, imei, userAgent, proxy);
          }
          break;

        default:
          console.error("Unknown QR event type:", qrEvent.type);
      }
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error generating QR code:", error);

    // Send an error response to the client
    res.status(500).send("Failed to generate QR code image.");
  }
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Zalo QR API server is running at http://localhost:${PORT}`);
});

module.exports.handler = serverless(app);