const { google } = require('googleapis');
const stream = require('stream');
const axios = require('axios'); // Asegúrate de que esté en tu package.json

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
        console.log('✅ Captura de la HOME (vía Proxy) enviada a Drive.');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🌐 Iniciando captura mediante API de Proxy Residencial...');
    
    const targetUrl = 'https://simple.ripley.com.pe';
    const token = process.env.SCRAPEDO_TOKEN;
    
    // Scrape.do tiene un endpoint que toma screenshots directamente
    // Usamos render=true para que cargue el JS y las imágenes de Ripley
    const apiUrl = `https://api.scrape.do/screenshot?token=${token}&url=${targetUrl}&render=true&width=1920&height=1080&fullpage=true`;

    try {
        console.log('📸 Solicitando captura a la red residencial...');
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        
        const fileName = `RIPLEY_HOME_PROXY_API_${new Date().getTime()}.jpg`;
        await uploadToDrive(Buffer.from(response.data), fileName);
        
    } catch (error) {
        console.error('❌ Error al obtener la captura:', error.message);
    }
}

start();