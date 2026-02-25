const axios = require('axios');

async function testSync() {
    try {
        console.log("Triggering Sync...");
        const res = await axios.post('http://localhost:3000/api/documents/sync-status');
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.error("Response:", error.response.data);
    }
}

testSync();
