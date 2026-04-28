const { google } = require('googleapis');
const stream = require('stream');
const axios = require('axios');

async function uploadToDrive(buffer, fileName) {
    const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough().end(buffer);
    try {
        await driveService.files.create({
            requestBody: { name: fileName, parents: [process.env.FOLDER_ID] },
            media: { mimeType: 'image/jpeg', body: bufferStream }
        });
        console.log('✅ Captura de CATEGORÍA guardada en Drive.');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🧪 Probando captura en zona de menor seguridad (Laptops)...');
    
    // Cambiamos el objetivo a una categoría
    const targetUrl = 'https://simple.ripley.com.pe/tecnologia/computacion/laptops';
    const token = process.env.SCRAPEDO_TOKEN;
    
    // Volvemos a los parámetros básicos que funcionan con screenshot
    const apiUrl = `https://api.scrape.do/?token=${token}&url=${targetUrl}&screenshot=true&render=true&returnJSON=true&wait=5000`;

    try {
        const initRes = await axios.get(apiUrl, { timeout: 150000 });
        const screenshotUrl = initRes.data.screenshotResult;
        
        if (screenshotUrl) {
            const finalRes = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
            await uploadToDrive(Buffer.from(finalRes.data), `RIPLEY_LAPTOPS_TEST.jpg`);
        } else {
            console.error('❌ Incluso la categoría falló. Detalle:', JSON.stringify(initRes.data));
        }
    } catch (error) {
        console.error('❌ Error crítico:', error.message);
    }
}
start();