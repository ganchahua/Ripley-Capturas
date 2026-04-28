const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { google } = require('googleapis');
const stream = require('stream');

// --- TUS DATOS (Siguen igual, leídos de secrets) ---
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
// ---------------------------------------------------

async function uploadToDrive(buffer, fileName) {
    console.log('📤 Iniciando subida a Drive...');
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    try {
        const response = await driveService.files.create({
            requestBody: { name: fileName, parents: [FOLDER_ID] },
            media: { mimeType: 'image/jpeg', body: bufferStream },
            fields: 'id',
        });
        console.log('✅ ¡IMAGEN SUBIDA! ID:', response.data.id);
    } catch (err) {
        console.error('❌ Error en Drive:', err.message);
    }
}

async function start() {
    console.log('🚀 Iniciando Puppeteer con Técnicas Anti-Cloudflare...');
    
    // TÉCNICA 1: Headless false en GitHub (requiere xvfb en el .yml)
    // Esto hace que el navegador se renderice "de verdad"
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled' // Sigilo extra
        ] 
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // TÉCNICA 2: User-Agent real y reciente
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // TÉCNICA 3: Limpiar caché y cookies
        console.log('🧹 Limpiando caché y cookies...');
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');

        console.log('📸 Navegando a Ripley...');
        
        const cookies = JSON.parse(process.env.MIS_COOKIES);
        await page.setCookie(...cookies);
        // networkidle0 es más estricto, asegura que no haya red activa
        await page.goto('https://simple.ripley.com.pe/', { 
            waitUntil: 'networkidle0', 
            timeout: 120000 
        });

        // TÉCNICA 4: Espera Humana y movimiento de mouse
        console.log('⏳ Esperando 10 segundos para Turnstile pass...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('🖱️ Simulando movimiento de mouse aleatorio...');
        await page.mouse.move(Math.random() * 500, Math.random() * 500);
        await page.mouse.move(Math.random() * 1000, Math.random() * 800);

        // Verificación si seguimos atrapados
        const content = await page.content();
        if (content.includes('Verify you are human')) {
            console.error('❌ Cloudflare sigue bloqueando.');
            // Opcional: tomar una captura del error para depurar
            const errorBuffer = await page.screenshot();
            await uploadToDrive(errorBuffer, 'Error_Cloudflare.png');
            return;
        }

        // Scroll lento (ya lo tienes, no lo incluyo para abreviar)
        console.log('📜 Haciendo scroll...');
        // ... (tu lógica de scroll aquí) ...
        await new Promise(resolve => setTimeout(resolve, 5000)); // Espera tras scroll

        console.log('🖼️ Generando captura...');
        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
        const fileName = `Ripley_Final_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;

        console.log('📤 Llamando a Drive...');
        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ ERROR EN EL FLUJO:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Fin.');
    }
}

start();