const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const stream = require('stream');

// --- CONFIGURACIÓN DE IDENTIDAD ---
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
// ----------------------------------
async function uploadToDrive(buffer, fileName) {
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
        console.log('✅ Captura subida con éxito. ID:', response.data.id);
    } catch (err) {
        console.error('❌ Error en Drive API:', err.message);
    }
}

async function start() {
    console.log('🚀 Iniciando navegador (Puppeteer)...');
    // Usamos 'new' headless para mejor compatibilidad
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--single-process'
        ] 
    });

    const page = await browser.newPage();
    // Desktop HD
    await page.setViewport({ width: 1920, height: 1080 });

    // Técnica 1: Bloquear elementos innecesarios para acelerar (opcional)
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //     if(req.resourceType() === 'font') req.abort();
    //     else req.continue();
    // });

    try {
        console.log('📸 Entrando a Ripley.com.pe...');
        // Esperamos a que no haya tráfico de red por al menos 500ms
        await page.goto('https://simple.ripley.com.pe/', { 
            waitUntil: 'networkidle0', 
            timeout: 90000 // 90 segundos de timeout
        });

        // Técnica 2: Scroll Inteligente Avanzado
        console.log('📜 Haciendo scroll lento para disparar Lazy Loading...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 300; // Scroll más corto y lento
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 150); // Tiempo suficiente entre scrolls para que carguen imágenes
            });
        });

        // Técnica 3: Espera extra de seguridad
        console.log('⏳ Esperando 5 segundos extra para renderizado final...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Técnica 4: Asegurar que estamos arriba antes de la captura (opcional)
        // await page.evaluate(() => window.scrollTo(0, 0));

        console.log('🖼️ Generando captura de pantalla completa...');
        const buffer = await page.screenshot({ 
            fullPage: true, 
            type: 'jpeg', 
            quality: 60 // Bajamos un poco la calidad para asegurar rapidez en la subida
        });

        const date = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `Ripley_Completa_${date}.jpg`;
        
        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ Error durante la ejecución:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Proceso terminado.');
    }
}

start();