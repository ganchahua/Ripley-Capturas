const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

// Activamos el sigilo avanzado
puppeteer.use(StealthPlugin());

// --- CONFIGURACIÓN DE VARIABLES ---
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
const MIS_COOKIES = process.env.MIS_COOKIES;

// --- FUNCIÓN PARA SUBIR A DRIVE ---
async function uploadToDrive(buffer, fileName) {
    console.log('📤 Conectando con Google Drive...');
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
        console.log(`✅ ¡ÉXITO! Imagen en Drive con ID: ${response.data.id}`);
    } catch (err) {
        console.error('❌ Error subiendo a Drive:', err.message);
    }
}

// --- FUNCIÓN PRINCIPAL ---
async function start() {
    console.log('🚀 Iniciando Puppeteer (Modo Mimetismo)...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Usamos false porque Xvfb en el .yml maneja la pantalla
        executablePath: '/usr/bin/google-chrome', // Ruta fija para GitHub Actions
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
        
        // Falsificamos que somos un Windows 10 real para que coincida con tus cookies
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        await page.setUserAgent(ua);
        await page.setViewport({ width: 1920, height: 1080 });

        // Inyectamos las cookies si existen
        if (MIS_COOKIES && MIS_COOKIES !== "undefined") {
            console.log('🍪 Inyectando cookies de sesión...');
            const cookies = JSON.parse(MIS_COOKIES);
            await page.setCookie(...cookies);
        }

        // TÉCNICA MAESTRA: Navegación en cadena
        // 1. Entramos por la ventana (Categoría con menos protección)
        console.log('📸 Paso 1: Entrando por categoría de Laptops...');
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', { 
            waitUntil: 'networkidle2', 
            timeout: 90000 
        });
        await new Promise(r => setTimeout(r, 8000));

        // 2. Saltamos a la Home (Ya con la sesión "caliente")
        console.log('🏠 Paso 2: Saltando a la Home de Ripley...');
        await page.goto('https://simple.ripley.com.pe', { 
            waitUntil: 'networkidle2', 
            timeout: 90000 
        });

        // Espera de seguridad por si aparece el captcha
        const content = await page.content();
        if (content.includes("Verify you are human")) {
            console.log('⏳ Cloudflare detectado. Esperando 15s adicionales...');
            await new Promise(r => setTimeout(r, 15000));
        }

        // --- SCROLL PARA CARGAR IMÁGENES (LAZY LOAD) ---
        console.log('📜 Haciendo scroll para cargar toda la página...');
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

        // Volver arriba para la captura
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 3000));

        // --- CAPTURA Y SUBIDA ---
        console.log('🖼️ Generando captura de pantalla completa...');
        const buffer = await page.screenshot({ 
            fullPage: true, 
            type: 'jpeg', 
            quality: 75 
        });

        const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })
                        .replace(/[/,:]/g, '-').replace(/\s/g, '_');
        const fileName = `Captura_Ripley_${fecha}.jpg`;

        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Navegador cerrado.');
    }
}

start();