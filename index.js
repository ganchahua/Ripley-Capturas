const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

// --- FUNCIÓN DRIVE ---
async function uploadToDrive(buffer, fileName) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough().end(buffer);

    try {
        await driveService.files.create({
            requestBody: { name: fileName, parents: [process.env.FOLDER_ID] },
            media: { mimeType: 'image/jpeg', body: bufferStream }
        });
        console.log(`✅ Enviado a Drive: ${fileName}`);
    } catch (e) {
        console.error('❌ Error Drive:', e.message);
    }
}

// --- FLUJO PRINCIPAL ---
async function start() {
    console.log('🚀 Iniciando Puppeteer con Sesión Corporativa...');
    const browser = await puppeteer.launch({ 
        headless: false, // Requerido para simular mejor a un humano
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Inyectar Cookies si existen
        if (process.env.MIS_COOKIES) {
            try {
                const cookies = JSON.parse(process.env.MIS_COOKIES);
                await page.setCookie(...cookies);
                console.log('🍪 Cookies corporativas cargadas.');
            } catch (e) {
                console.error('⚠️ Error en formato de cookies:', e.message);
            }
        }

        console.log('📡 Accediendo a Ripley Home...');
        await page.goto('https://simple.ripley.com.pe/home', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // Espera de 10 segundos para que carguen los banners pesados de la Home
        await new Promise(r => setTimeout(r, 10000));

        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
        const fileName = `Ripley_Home_OfficeAuth_${new Date().getTime()}.jpg`;
        
        await uploadToDrive(buffer, fileName);

    } catch (err) {
        console.error('❌ Error en el proceso:', err.message);
        // Captura de error para ver qué bloqueó la página
        const errBuf = await page.screenshot({ type: 'jpeg' });
        await uploadToDrive(errBuf, `ERROR_LOG_${new Date().getTime()}.jpg`);
    } finally {
        await browser.close();
    }
}

start();