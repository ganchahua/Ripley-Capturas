// --- NUEVAS IMPORTACIONES (CRUCIALES) ---
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Indicamos a puppeteer-extra que use el plugin de sigilo
puppeteer.use(StealthPlugin());

const { google } = require('googleapis');
const stream = require('stream');

// --- CONFIGURACIÓN DE IDENTIDAD (Tus datos reales) ---
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
// ---------------------------------------------------

async function uploadToDrive(buffer, fileName) {
    console.log('📤 Iniciando subida a Google Drive...');
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    try {
        const response = await driveService.files.create({
            requestBody: { 
                name: fileName, 
                parents: [FOLDER_ID] 
            },
            media: { 
                mimeType: 'image/jpeg', 
                body: bufferStream 
            },
            fields: 'id',
        });
        console.log('✅ ¡ARCHIVO GUARDADO EN DRIVE! ID:', response.data.id);
    } catch (err) {
        console.error('❌ ERROR DETALLADO EN DRIVE API:');
        console.error('Mensaje:', err.message);
        if (err.response) {
            console.error('Data:', err.response.data);
        }
    }
}

// ... (resto del código igual arriba)

async function start() {
    console.log('🚀 Iniciando proceso en GitHub Action...');
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        console.log('📸 Navegando a Ripley...');
        await page.goto('https://simple.ripley.com.pe/', { waitUntil: 'networkidle2', timeout: 120000 });

        // Scroll lento (ya lo tenemos configurado)
        await page.evaluate(async () => { /* ... tu funcion de scroll ... */ });
        
        console.log('⏳ Espera técnica de renderizado...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('🖼️ Generando Buffer de imagen...');
        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });

        const fileName = `Ripley_GA_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;

        // --- PUNTO CRÍTICO: ESPERA REAL ---
        console.log('📤 Llamando a la función de subida...');
        await uploadToDrive(buffer, fileName); 
        console.log('✅ Proceso de subida finalizado en el flujo principal.');

    } catch (error) {
        console.error('❌ ERROR EN EL FLUJO:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Navegador cerrado. Fin del Job.');
    }
}

start();