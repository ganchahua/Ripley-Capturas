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
        console.log('✅ ¡POR FIN! Captura guardada en Drive.');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🌐 Iniciando Bypass de Nivel 4 (Super Rendering)...');
    
    const targetUrl = 'https://simple.ripley.com.pe';
    const token = process.env.SCRAPEDO_TOKEN;
    
    // CAMBIOS CLAVE:
    // 1. superProxy=true: Usa IPs residenciales de altísima calidad.
    // 2. geoCode=us: A veces Ripley confía más en IPs de EE.UU. que en Data Centers.
    // 3. wait=15000: Damos 15 segundos para que el JS de Cloudflare se ejecute solo.
    const apiUrl = `https://api.scrape.do/?token=${token}&url=${targetUrl}&screenshot=true&render=true&returnJSON=true&superProxy=true&geoCode=us&wait=15000`;

    try {
        console.log('📡 Solicitando enlace (esto tardará unos 30-40 segundos)...');
        const initRes = await axios.get(apiUrl, { timeout: 200000 });
        
        const screenshotUrl = initRes.data.screenshotResult;
        
        if (screenshotUrl) {
            console.log('🖼️ Descargando imagen real...');
            const finalRes = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
            const fileName = `RIPLEY_HOME_FINAL_VENCIDO_${new Date().getTime()}.jpg`;
            await uploadToDrive(Buffer.from(finalRes.data), fileName);
        } else {
            console.error('❌ Cloudflare bloqueó el renderizado. Respuesta:', JSON.stringify(initRes.data).substring(0, 200));
        }
        
    } catch (error) {
        console.error('❌ Error de red o API:', error.message);
    }
}

start();