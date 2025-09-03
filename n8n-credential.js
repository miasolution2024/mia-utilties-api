
const credentialId = process.env.CREDENTIAL_ID || "Pb7ykVjDjlguRbHv";
const n8nCookie = process.env.N8N_COOKIE;
const browserId = process.env.BROWSER_ID;

export async function updateN8nZaloCredential(axios, cookie, imei, userAgent, proxy) {
  const url = `https://auto.miasolution.vn/rest/credentials/${credentialId}`;

  // The data to be sent in the request body
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

  // The headers to be sent with the request
  const headers = {
    "browser-id": browserId,
    Cookie: n8nCookie,
  };

  try {
    const response = await axios.patch(url, requestData, { headers });
    console.log("Update n8n credential successfully");
  } catch (error) {
    console.error("API call failed:", error.message);
  }
}
