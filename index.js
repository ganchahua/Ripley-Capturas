const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

// Activamos el plugin de sigilo
puppeteer.use(StealthPlugin());

// --- VARIABLES DE ENTORNO (Configuradas en GitHub Secrets) ---
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
const MIS_COOKIES = process.env.MIS_COOKIES; 
// -----------------------------------------------------------

async function uploadToDrive(buffer, fileName) {
    console.log('📤 Iniciando comunicación con Google Drive API...');
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
        console.log('✅ ¡ÉXITO! Archivo guardado en Drive. ID:', response.data.id);
    } catch (err) {
        console.error('❌ Error crítico al subir a Drive:', err.message);
    }
}

async function start() {
    console.log('🚀 Iniciando Puppeteer con Stealth y Xvfb...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Importante: Xvfb se encarga de la pantalla virtual
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
        ] 
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // --- GESTIÓN DE COOKIES (INYECCIÓN) ---
        if (MIS_COOKIES && MIS_COOKIES !== "undefined" && MIS_COOKIES !== "") {
            try {
                console.log('🍪 Intentando inyectar cookies de sesión...');
                const cookies = JSON.parse(MIS_COOKIES);
                await page.setCookie(...cookies);
                console.log('✅ Cookies cargadas correctamente.');
            } catch (e) {
                console.error('⚠️ Error al parsear el JSON de cookies. Verifica el formato en Secrets.');
            }
        } else {
            console.log('ℹ️ No se detectaron cookies (MIS_COOKIES está vacío). Continuando navegación limpia...');
        }

        console.log('📸 Navegando a Ripley.com.pe...');
        await page.goto('https://simple.ripley.com.pe/', { 
            waitUntil: 'networkidle2', 
            timeout: 120000 
        });

        // Espera humana inicial para engañar a Cloudflare
        console.log('⏳ Esperando renderizado inicial (10s)...');
        await new Promise(r => setTimeout(r, 10000));

        // Verificamos si estamos bloqueados
        const html = await page.content();
        if (html.includes("Verify you are human") || html.includes("Cloudflare")) {
            console.log('⚠️ Advertencia: Se detectó pantalla de verificación. Intentando esperar un poco más...');
            await new Promise(r => setTimeout(r, 15000));
        }

        // --- SCROLL INTELIGENTE ---
        console.log('📜 Ejecutando scroll para cargar productos...');
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

        // Volvemos arriba para la captura estética
        await page.evaluate(() => window.scrollTo(0, 0));
        console.log('⏳ Espera final post-scroll...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('🖼️ Generando buffer de imagen...');
        const buffer = await page.screenshot({ 
            fullPage: true, 
            type: 'jpeg', 
            quality: 70 
        });

        const fileName = `Ripley_Auto_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
        
        // --- SUBIDA A DRIVE ---
        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ ERROR DURANTE LA EJECUCIÓN:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Navegador cerrado. Proceso finalizado.');
    }
}

start();