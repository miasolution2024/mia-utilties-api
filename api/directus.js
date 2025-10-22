async function getOmniChannelByPageId(axios, pageId) {
  try {
    const response = await axios.get(
      `${process.env.DIRECTUS_URL}/items/omni_channels?filter[page_id][_eq]=${pageId}`
    );
    return response.data.data;
  } catch (error) {
    console.error(
      "Error fetching omni_channel:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function updateOmniChannel(axios, id, data) {
  try {
    const response = await axios.patch(
      `${process.env.DIRECTUS_URL}/items/omni_channels/${id}`,
      data
    );
    return response.data.data;
  } catch (error) {
    console.error(
      "Error updating omni_channel:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function createOmniChannel(axios, data) {
  try {
    const response = await axios.post(
      `${process.env.DIRECTUS_URL}/items/omni_channels`,
      data
    );
    return response.data.data;
  } catch (error) {
    console.error(
      "Error creating omni_channel:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getIntegrationSettings(axios) {
  try {
    const url = `${process.env.DIRECTUS_URL}/items/integration_settings`;
    const response = await axios.get(url);
    return response.data.data;
  } catch (error) {
    console.error(
      "Error fetching integration_settings:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function addIntegrationLog(axios, payload) {
  try {
    const response = await axios.post(
      `${process.env.DIRECTUS_URL}/items/integration_logs`,
      payload
    );
    return response.data.data;
  } catch (error) {
    console.error(
      "Error creating integration_log:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Re-export with addIntegrationLog
module.exports = {
  getOmniChannelByPageId,
  updateOmniChannel,
  createOmniChannel,
  getIntegrationSettings,
  addIntegrationLog,
};

