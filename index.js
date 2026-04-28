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

async function start() {
    console.log('🚀 Iniciando navegador con Stealth Plugin...');
    // Usamos el navegador de puppeteer-extra
    const browser = await puppeteer.launch({ 
        headless: "new", // "new" es esencial para el sigilo
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--single-process'
        ] 
    });

    const page = await browser.newPage();

    // Técnica de Sigilo Extra: User-Agent real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Desktop HD
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log('📸 Intentando entrar a Ripley.com.pe (con sigilo)...');
        // networkidle2 es un buen balance para Ripley
        await page.goto('https://simple.ripley.com.pe/', { 
            waitUntil: 'networkidle2', 
            timeout: 120000 // 120 segundos, por si Cloudflare nos hace esperar un poco
        });

        // Verificación: si seguimos viendo Cloudflare, algo salió mal
        const content = await page.content();
        if (content.includes('Performing security verification')) {
            console.error('❌ Cloudflare nos bloqueó de nuevo, incluso con sigilo.');
            return;
        }

        // Scroll inteligente avanzado (para cargar todo)
        console.log('📜 Haciendo scroll lento para disparar Lazy Loading...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 300; 
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 150); 
            });
        });

        console.log('⏳ Espera final para renderizado...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🖼️ Generando captura de pantalla completa...');
        const buffer = await page.screenshot({ 
            fullPage: true, 
            type: 'jpeg', 
            quality: 70 
        });

        const date = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `Ripley_Correcta_${date}.jpg`;
        
        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ Error durante la ejecución:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Proceso terminado.');
    }
}

start();