const axios = require('axios');

async function testZapSign() {
    try {
        console.log("Sending ZapSign request...");
        const response = await axios.post('http://localhost:3000/api/documents/1/sign', {
            signerEmail: "teste@teste.com",
            signerName: "Teste Signer"
        });
        console.log("ZapSign Success:", response.data);
    } catch (error) {
        if (error.response) {
            console.error("ZapSign Error Response:", error.response.status, error.response.data);
        } else {
            console.error("ZapSign Error:", error.message);
        }
    }
}

testZapSign();
