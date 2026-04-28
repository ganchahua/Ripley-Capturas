const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

// Activamos el sigilo avanzado
puppeteer.use(StealthPlugin());

// --- VARIABLES DE ENTORNO ---
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
const MIS_COOKIES = process.env.MIS_COOKIES;

// --- FUNCIÓN PARA SUBIR A DRIVE ---
async function uploadToDrive(buffer, fileName) {
    console.log('📤 Iniciando comunicación con Google Drive API...');
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
        console.log('✅ ¡IMAGEN GUARDADA EN DRIVE! ID:', response.data.id);
    } catch (err) {
        console.error('❌ Error en Drive API:', err.message);
    }
}

// --- FUNCIÓN PRINCIPAL ---
async function start() {
    console.log('🚀 Iniciando Puppeteer con Xvfb y Mimetismo...');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled',
            '--lang=es-PE,es;q=0.9'
        ] 
    });

    try {
        const page = await browser.newPage();
        
        // Falsificación de firma de Windows 10
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        await page.setUserAgent(ua);
        await page.setViewport({ width: 1920, height: 1080 });

        // Inyectar cookies si existen (Asegúrate de que el Secret en GitHub sea un JSON válido)
        if (MIS_COOKIES && MIS_COOKIES !== "undefined" && MIS_COOKIES !== "") {
            try {
                console.log('🍪 Inyectando cookies de sesión residenciales...');
                const cookies = JSON.parse(MIS_COOKIES);
                await page.setCookie(...cookies);
                console.log('✅ Cookies inyectadas.');
            } catch (e) {
                console.error('⚠️ El Secret MIS_COOKIES no tiene formato JSON válido.');
            }
        }

        // TÉCNICA: Entrar por una categoría para evadir el firewall de la Home
        console.log('📸 Paso 1: Entrando por categoría confirmada (Laptops)...');
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', { 
            waitUntil: 'networkidle2', 
            timeout: 90000 
        });
        await new Promise(r => setTimeout(r, 10000));

        console.log('🏠 Paso 2: Intentando cargar la Home Principal...');
        await page.goto('https://simple.ripley.com.pe/home', { 
            waitUntil: 'networkidle2', 
            timeout: 90000 
        });

        // Espera táctica por si Cloudflare Turnstile está analizando
        console.log('⏳ Espera de seguridad (20s)...');
        await new Promise(r => setTimeout(r, 20000));

        // Scroll para cargar Lazy Load
        console.log('📜 Ejecutando scroll dinámico...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 400;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });

        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 3000));

        console.log('🖼️ Generando captura de pantalla...');
        const buffer = await page.screenshot({ 
            fullPage: true, 
            type: 'jpeg', 
            quality: 70 
        });

        const fileName = `Ripley_Auto_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ Error durante la ejecución:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Navegador cerrado.');
    }
}

start();