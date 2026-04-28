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
        console.log('✅ ¡Archivo enviado a Drive!');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🕵️ Iniciando infiltración silenciosa...');
    
    const targetUrl = 'https://simple.ripley.com.pe/';
    const token = process.env.SCRAPEDO_TOKEN;
    
    // CAMBIO DE ESTRATEGIA:
    // Quitamos 'render=true' para evitar que salte el motor de detección de JS de Cloudflare
    // Usamos 'superProxy' para que la IP sea 100% de hogar peruano o regional.
    const apiUrl = `https://api.scrape.do/?token=${token}&url=${targetUrl}&screenshot=true&superProxy=true&returnJSON=true`;

    try {
        console.log('📡 Solicitando captura sin renderizado de JS activo...');
        const initRes = await axios.get(apiUrl, { timeout: 120000 });
        
        const screenshotUrl = initRes.data.screenshotResult;
        
        if (screenshotUrl) {
            console.log('🖼️ Captura generada. Descargando...');
            const finalRes = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
            const fileName = `Ripley_Home_Silent_${new Date().getTime()}.jpg`;
            await uploadToDrive(Buffer.from(finalRes.data), fileName);
        } else {
            console.error('❌ Cloudflare detectó el intento. Respuesta:', JSON.stringify(initRes.data).substring(0, 150));
        }
        
    } catch (error) {
        console.error('❌ Fallo en la conexión:', error.message);
    }
}

start();