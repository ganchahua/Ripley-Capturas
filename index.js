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
        console.log('✅ Archivo enviado a Drive.');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🌐 Iniciando captura mediante Proxy...');
    
    const targetUrl = 'https://simple.ripley.com.pe/home';
    const token = process.env.SCRAPEDO_TOKEN;
    
    // Cambiamos a la URL de parámetros para mayor compatibilidad
    // Añadimos &screenshot=true para que la API misma tome la foto
    const apiUrl = `https://api.scrape.do/?token=${token}&url=${targetUrl}&screenshot=true&render=true`;

    try {
        console.log('📸 Solicitando captura...');
        const response = await axios.get(apiUrl, { 
            responseType: 'arraybuffer',
            timeout: 120000 // Damos 2 minutos porque Ripley es pesada
        });
        
        const fileName = `RIPLEY_HOME_FINAL_${new Date().getTime()}.jpg`;
        await uploadToDrive(Buffer.from(response.data), fileName);
        
    } catch (error) {
        if (error.response) {
            // Esto nos dirá por qué Scrape.do nos da 403
            console.error('❌ Error 403 Detalle:', error.response.data.toString());
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

start();