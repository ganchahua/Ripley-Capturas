const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

// --- CONFIGURACIÓN DE DRIVE ---
async function uploadToDrive(buffer, fileName) {
    console.log('📤 Iniciando comunicación con Google Drive API...');
    const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    try {
        const response = await driveService.files.create({
            requestBody: { 
                name: fileName, 
                parents: [process.env.FOLDER_ID] 
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

// --- FUNCIÓN PRINCIPAL DE NAVEGACIÓN ---
async function start() {
    console.log('🚀 Iniciando Navegación Fantasma para la Home...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ] 
    });

    const page = await browser.newPage();
    
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        if (process.env.MIS_COOKIES && process.env.MIS_COOKIES !== "undefined") {
            console.log('🍪 Intentando inyectar cookies de sesión...');
            await page.setCookie(...JSON.parse(process.env.MIS_COOKIES));
            console.log('✅ Cookies cargadas correctamente.');
        }

        // PASO 1: Entrar a Laptops (La zona segura que ya validamos)
        console.log('📡 Validando en zona segura (Laptops)...');
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        await new Promise(r => setTimeout(r, 8000));

        // PASO 2: SALTO INVISIBLE A LA HOME
        console.log('🏠 Ejecutando salto invisible a la Home...');
        await page.evaluate(() => {
            const logo = document.querySelector('a[href="/"]') || 
                         document.querySelector('a[href="https://simple.ripley.com.pe/"]');
            if (logo) logo.click();
            else window.location.href = 'https://simple.ripley.com.pe/home';
        });

        // PASO 3: FASE DE SILENCIO (Para que Cloudflare Turnstile termine de validar)
        console.log('⏳ Fase de silencio (40s) para que el Firewall se retire...');
        await new Promise(r => setTimeout(r, 40000));

        // Verificación de scroll para cargar contenido dinámico
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(r => setTimeout(r, 2000));
        await page.evaluate(() => window.scrollTo(0, 0));

        console.log('🖼️ Tomando captura definitiva...');
        const buffer = await page.screenshot({ 
            fullPage: true, 
            type: 'jpeg', 
            quality: 75 
        });

        const fileName = `Ripley_HOME_Final_${new Date().getTime()}.jpg`;
        
        // LLAMADA A LA FUNCIÓN (Ahora sí está definida en el scope)
        await uploadToDrive(buffer, fileName);

    } catch (e) {
        console.error('❌ Error en el flujo:', e.message);
    } finally {
        await browser.close();
        console.log('👋 Proceso terminado.');
    }
}

start();