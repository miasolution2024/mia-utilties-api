const axios = require("axios");

async function updateN8nZaloCredential({
  n8nServerUrl,
  credentialId,
  browserId,
  n8nCookie,
  cookie,
  imei,
  userAgent,
  proxy,
  pageName,
}) {
  const url = `${n8nServerUrl}/rest/credentials/${credentialId}`;

  const requestData = {
    name: `Zalo Credential - ${pageName} - ${new Date().toISOString()}`,
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
  } catch (error) {
    console.error("API call failed:", error.message);
    throw error;
  }
}

async function addN8nZaloCredential({
  n8nServerUrl,
  browserId,
  n8nCookie,
  cookie,
  imei,
  userAgent,
  proxy,
  pageName,
}) {
  const url = `${n8nServerUrl}/rest/credentials`;

  const requestData = {
    name: `Zalo Credential - ${pageName} - ${new Date().toISOString()}`,
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
    const response = await axios.post(url, requestData, { headers });
    return response.data?.data?.id;
  } catch (error) {
    console.error("API call failed (add credential):", error.message);
    throw error;
  }
}

module.exports = {
  updateN8nZaloCredential,
  addN8nZaloCredential,
};
