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
        console.log('✅ ¡Archivo enviado a Drive exitosamente!');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🌐 Iniciando captura mediante Proxy (Modo JSON)...');
    
    const targetUrl = 'https://simple.ripley.com.pe/home';
    const token = process.env.SCRAPEDO_TOKEN;
    
    // Añadimos &returnJSON=true como pide el error
    const apiUrl = `https://api.scrape.do/?token=${token}&url=${targetUrl}&screenshot=true&render=true&returnJSON=true`;

    try {
        console.log('📡 Solicitando enlace de captura...');
        const initRes = await axios.get(apiUrl);
        
        // El link de la imagen viene en initRes.data.screenshotResult
        const screenshotUrl = initRes.data.screenshotResult;
        
        if (screenshotUrl) {
            console.log('🖼️ Descargando imagen desde:', screenshotUrl);
            const finalRes = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
            
            const fileName = `RIPLEY_HOME_SOLVED_${new Date().getTime()}.jpg`;
            await uploadToDrive(Buffer.from(finalRes.data), fileName);
        } else {
            console.error('❌ No se encontró el link de la captura en la respuesta.');
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ Error Detalle:', error.response.data);
        } else {
            console.error('❌ Error de conexión:', error.message);
        }
    }
}

start();