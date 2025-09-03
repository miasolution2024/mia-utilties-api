const express = require("express");
const cors = require("cors");
const ZCA = require("zca-js");
const axios = require("axios");

require("dotenv").config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;
const credentialId = process.env.CREDENTIAL_ID || "Pb7ykVjDjlguRbHv";
const n8nCookie = process.env.N8N_COOKIE;
const browserId = process.env.BROWSER_ID;

app.get("/", async (req, res) => {
   res.send("Hello world");
});

app.get("/qr-login", async (req, res) => {
  try {
    const zalo = new ZCA.Zalo();
    let api = await zalo.loginQR({}, async (qrEvent) => {
      console.log(
        "Received QR event type:",
        qrEvent ? qrEvent.type : "no event"
      );

      switch (qrEvent.type) {
        case 0: // QRCodeGenerated
          if (qrEvent?.data?.image) {
            const qrCodeBase64 = qrEvent.data.image;
            console.log("QR code generated, length:", qrCodeBase64.length);
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

            await updateN8nZaloCredential(cookie, imei, userAgent, proxy);
          }
          break;

        default:
          console.error("Unknown QR event type:", qrEvent.type);
      }
    });

    api.listener.start();
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error generating QR code:", error);

    // Send an error response to the client
    res.status(500).send("Failed to generate QR code image.");
  }
});

app.listen(PORT, () => console.log("Server ready on port 3001."));

async function updateN8nZaloCredential(cookie, imei, userAgent, proxy) {
  const url = `https://auto.miasolution.vn/rest/credentials/${credentialId}`;
  console.error(cookie, imei, userAgent, proxy);

  const requestData = {
    name: "Zalo Đồng Võ Phòng Khám Thẩm Mỹ Donghan",
    type: "zaloUserCredentialsApi",
    data: {
      cookie: JSON.stringify(cookie),
      imei,
      userAgent,
      proxy: proxy || "",
    },
  };

  const headers = {
    "browser-id": browserId,
    Cookie: n8nCookie,
  };

  try {
    await axios.patch(url, requestData, { headers });
    console.log("Update n8n credential successfully");
  } catch (error) {
    console.error("API call failed:", error.message);
  }
}

