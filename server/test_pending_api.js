const axios = require('axios');

async function testPendingDocs() {
    try {
        const res = await axios.get('http://localhost:3000/api/documents/pending');
        console.log("Status:", res.status);
        console.log("Data Type:", typeof res.data);
        console.log("Data.data Type:", typeof res.data.data);
        console.log("Raw Data:", res.data);
        console.log("Data.data Length:", res.data.data ? res.data.data.length : 'N/A');
        console.log("First Item:", JSON.stringify(res.data.data[0], null, 2));
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.error("Response:", error.response.data);
    }
}

testPendingDocs();
