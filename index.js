const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, FOLDER_ID, MIS_COOKIES } = process.env;

async function uploadToDrive(buffer, fileName) {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough().end(buffer);
    try {
        await driveService.files.create({
            requestBody: { name: fileName, parents: [FOLDER_ID] },
            media: { mimeType: 'image/jpeg', body: bufferStream }
        });
        console.log(`✅ Archivo en Drive: ${fileName}`);
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🛠️ Iniciando Bypass Final para la Home...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
        ] 
    });

    const page = await browser.newPage();
    
    try {
        // Mimetismo de navegador real (Chrome 124 en Windows 10)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        if (MIS_COOKIES && MIS_COOKIES !== "undefined") {
            await page.setCookie(...JSON.parse(MIS_COOKIES));
            console.log('🍪 Cookies cargadas.');
        }

        // TÉCNICA: No ir directo a la Home, usar un Referrer
        console.log('📦 Paso 1: "Calentando" en Categoría Laptops...');
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });
        await new Promise(r => setTimeout(r, 5000));

        console.log('🏠 Paso 2: Saltando a la HOME Principal...');
        // Navegamos simulando que venimos de la categoría anterior
        await page.goto('https://simple.ripley.com.pe/home', { 
            waitUntil: 'domcontentloaded', 
            referer: 'https://simple.ripley.com.pe/tecnologia/computacion/laptops' 
        });

        // Espera de validación Turnstile (Aumentado a 30s)
        console.log('⏳ Esperando 30s para que Cloudflare se relaje...');
        await new Promise(r => setTimeout(r, 30000));

        // Verificamos si pasamos el bloqueo
        const html = await page.content();
        if (html.includes("Verify you are human")) {
            console.log('⚠️ Aún bloqueado en la Home. Intentando refresco suave...');
            await page.reload({ waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 15000));
        }

        // SCROLL para cargar el e-commerce
        console.log('📜 Ejecutando scroll humano...');
        await page.evaluate(async () => {
            window.scrollBy(0, 1000);
            await new Promise(r => setTimeout(r, 1000));
            window.scrollTo(0, 0);
        });

        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
        const fileName = `RIPLEY_HOME_FINAL_${new Date().getTime()}.jpg`;
        await uploadToDrive(buffer, fileName);

    } catch (err) {
        console.error('❌ Crash:', err.message);
    } finally {
        await browser.close();
        console.log('👋 Fin.');
    }
}
start();