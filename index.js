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
        console.log('✅ ¡Captura final guardada en Drive!');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🌐 Iniciando captura mediante Proxy (Ajuste de tiempos)...');
    
    const targetUrl = 'https://simple.ripley.com.pe';
    const token = process.env.SCRAPEDO_TOKEN;
    
    // Agregamos &wait=10000 (10 segundos) para que la API espere a que Ripley cargue todo
    const apiUrl = `https://api.scrape.do/?token=${token}&url=${targetUrl}&screenshot=true&render=true&returnJSON=true&wait=10000`;

    try {
        console.log('📡 Solicitando enlace de captura...');
        // Aumentamos el timeout de axios a 3 minutos para no cortar la conexión
        const initRes = await axios.get(apiUrl, { timeout: 180000 });
        
        console.log('🔍 Respuesta de la API recibida. Analizando...');
        const screenshotUrl = initRes.data.screenshotResult;
        
        if (screenshotUrl) {
            console.log('🖼️ Descargando imagen...');
            const finalRes = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
            
            const fileName = `RIPLEY_HOME_EXITO_${new Date().getTime()}.jpg`;
            await uploadToDrive(Buffer.from(finalRes.data), fileName);
        } else {
            // Imprimimos la respuesta completa para saber qué pasó
            console.error('❌ No se encontró el link. Respuesta completa:', JSON.stringify(initRes.data));
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ Error Detalle:', error.response.data.toString());
        } else {
            console.error('❌ Error de conexión:', error.message);
        }
    }
}

start();