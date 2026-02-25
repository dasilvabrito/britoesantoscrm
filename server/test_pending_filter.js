const axios = require('axios');

async function testFilter() {
    try {
        console.log("Fetching Pending Docs...");
        const res = await axios.get('http://localhost:3000/api/documents/pending');
        const docs = res.data.data;
        console.log(`Returned ${docs.length} documents.`);

        const valid = docs.filter(d => d.folder === '/LawFirmCRM/');
        const invalid = docs.filter(d => d.folder !== '/LawFirmCRM/');

        console.log(`Valid (Folder Match): ${valid.length}`);
        console.log(`Invalid (Wrong/Null Folder): ${invalid.length}`);

        const ids = docs.map(d => d.id);
        console.log("Returned IDs:", ids);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testFilter();
