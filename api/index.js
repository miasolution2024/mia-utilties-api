const express = require("express");
const cors = require("cors");
const ZCA = require("zca-js");
const directusAxios = require("axios");
const {
  getOmniChannelByPageId,
  updateOmniChannel,
  createOmniChannel,
  addIntegrationLog,
  getIntegrationSettings,
} = require("./directus");
const { updateN8nZaloCredential, addN8nZaloCredential } = require("./n8n");

require("dotenv").config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;
const n8nServerUrl = process.env.N8N_URL;

directusAxios.defaults.headers.common.Authorization = `Bearer ${process.env.DIRECTUS_API_TOKEN}`;

app.get("/", async (req, res) => {
  res.send("Hello world");
});

app.get("/qr-login", async (req, res) => {
  try {
    const zalo = new ZCA.Zalo();
    const state = {
      cookie: [],
      imei: "",
      userAgent: "",
      proxy: "",
      page_name: "",
    };

    let api = await zalo.loginQR({}, async (qrEvent) => {
      const context = {
        directusAxios,
        addIntegrationLog,
        res,
        state,
        n8nServerUrl,
      };

      const dispatch = {
        0: handleQrGenerated,
        1: handleQrExpired,
        2: handleQrScanned,
        3: handleQrDeclined,
        4: handleGotLoginInfo,
      };

      const fn = dispatch[qrEvent.type] || handleUnknown;
      try {
        await fn(context, qrEvent);
      } catch (err) {
        console.error("Error handling QR event", err);
      }
    });

    api.listener.start();

    AddOrCreateOmniChannel({ directusAxios, state, api, addIntegrationLog });
  } catch (error) {
    console.error("Error generating QR code:", error);

    res.status(500).send("Failed to generate QR code image.");
  }
});

app.listen(PORT, () => console.log(`Server ready on port ${PORT}.`));

async function handleQrGenerated(context, event) {
  const { directusAxios, addIntegrationLog, res, api } = context;
  if (event?.data?.image) {
    const qrCodeBase64 = event.data.image;
    try {
      await addIntegrationLog(directusAxios, {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "QR code generated",
        stack_trace: JSON.stringify({ length: qrCodeBase64.length }),
        user_id: null,
        context: "handleQrGenerated",
      });
    } catch (e) {
      console.error(
        "Failed to write integration log for QR generation",
        e.message
      );
    }
    res.send(qrCodeBase64);
  } else {
    console.error("Could not get QR code from Zalo SDK");
  }
}

async function handleQrExpired(context) {
  const { directusAxios, addIntegrationLog } = context;
  await addIntegrationLog(directusAxios, {
    timestamp: new Date().toISOString(),
    level: "info",
    message: "QR code expired. Please try again",
    stack_trace: "",
    user_id: null,
    context: "handleQrExpired",
  });
}

async function handleQrScanned(context, event) {
  if (event?.data) {
    context.state.page_name = event.data.display_name || "";

    await addIntegrationLog(directusAxios, {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "QR code expired. Please try again",
      stack_trace: JSON.stringify(context.state.page_name),
      user_id: null,
      context: "handleQrScanned",
    });
  }
}

async function handleQrDeclined(context) {
  await addIntegrationLog(directusAxios, {
    timestamp: new Date().toISOString(),
    level: "info",
    message: "QR code declined. Please try again",
    stack_trace: JSON.stringify(context.state.page_name),
    user_id: null,
    context: "handleQrDeclined",
  });
}

async function handleGotLoginInfo(context, event) {
  const { state } = context;
  if (event?.data) {
    state.cookie = event.data.cookie || [];
    state.imei = event.data.imei || "";
    state.userAgent = event.data.userAgent || "";
    state.proxy = event.data.proxy || "";

    await addIntegrationLog(directusAxios, {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Got login info from Zalo",
      stack_trace: JSON.stringify(context.state.page_name),
      user_id: null,
      context: "handleGotLoginInfo",
    });
  }
}

async function AddOrCreateOmniChannel(context) {
  try {
    const omniChannels = await getOmniChannelByPageId(
      context.directusAxios,
      context.api.getOwnId()
    );

    const settings = await getIntegrationSettings(context.directusAxios);

    console.log('Found setting', settings.id);
    
    const channelData = {
      zalo_cookie: JSON.stringify(context.state.cookie),
      zalo_imei: context.state.imei,
      zalo_user_agent: context.state.userAgent,
      zalo_proxy: context.state.proxy || "",
    };

    if (!omniChannels || omniChannels.length === 0) {

      const credentialId = await addN8nZaloCredential({
        n8nServerUrl,
        browserId: settings?.n8n_browser_id || "",
        n8nCookie: settings?.n8n_cookie || "",
        cookie: context.state.cookie,
        imei: context.state.imei,
        userAgent: context.state.userAgent,
        proxy: context.state.proxy,
        pageName: context.state.page_name,
      });
      
      console.log('Addes N8nZaloCredential', credentialId);
      
      const newChannel = await createOmniChannel(context.directusAxios, {
        page_id: context.api.getOwnId(),
        source: "Zalo",
        is_enabled: true,
        status: "published",
        page_name: context.state.page_name,
        n8n_zalo_credential_id: credentialId,
        ...channelData,
      });

      await addIntegrationLog(context.directusAxios, {
        timestamp: new Date().toISOString(),
        level: "info",
        message:
          "Omni channel created (from GOT LOGIN INFO) " +
          context.state.page_name,
        stack_trace: JSON.stringify(newChannel || {}),
        user_id: context.api.getOwnId(),
        context: "createOmniChannel",
      });
    } else {
      const existing = omniChannels[0];
      const updatedChannel = await updateOmniChannel(
        context.directusAxios,
        existing.id,
        channelData
      );

      console.log('Found existing omni channel:', existing.id);

      await updateN8nZaloCredential({
        n8nServerUrl,
        credentialId: existing?.n8n_zalo_credential_id,
        browserId: settings?.n8n_browser_id || "",
        n8nCookie: settings?.n8n_cookie || "",
        cookie: context.state.cookie,
        imei: context.state.imei,
        userAgent: context.state.userAgent,
        proxy: context.state.proxy,
        pageName: context.state.page_name,
      });

      console.log('Updated N8nZaloCredential', existing?.n8n_zalo_credential_id);
      
      await addIntegrationLog(context.directusAxios, {
        timestamp: new Date().toISOString(),
        level: "info",
        message:
          "Omni channel updated (from GOT LOGIN INFO) " +
          context.state.page_name,
        stack_trace: JSON.stringify(updatedChannel || {}),
        user_id: context.api.getOwnId(),
        context: "updateOmniChannel",
      });
    }
  } catch (err) {
    console.error(
      "Failed to sync omni_channel after login info:",
      err.message || err
    );
  }
}

async function handleUnknown(/* context, event */) {
  console.error("Unknown QR event type");
}
