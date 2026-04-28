const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
const MIS_COOKIES = process.env.MIS_COOKIES;

async function uploadToDrive(buffer, fileName) {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    try {
        await driveService.files.create({
            requestBody: { name: fileName, parents: [FOLDER_ID] },
            media: { mimeType: 'image/jpeg', body: bufferStream }
        });
        console.log('✅ Captura de la HOME enviada a Drive.');
    } catch (err) { console.error('❌ Error Drive:', err.message); }
}

async function start() {
    console.log('🚀 Iniciando bypass avanzado para la Home...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--disable-blink-features=AutomationControlled'] 
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        if (MIS_COOKIES && MIS_COOKIES !== "undefined") {
            const cookies = JSON.parse(MIS_COOKIES);
            await page.setCookie(...cookies);
        }

        // PASO 1: Entrar por la categoría (que sabemos que no bloquea)
        console.log('📦 Cargando categoría para validar sesión...');
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 7000));

        // PASO 2: SIMULAR CLIC EN EL LOGO PARA IR A LA HOME
        // Esto es mucho más efectivo que hacer .goto('https://www.ripley.com.pe')
        console.log('🏠 Haciendo clic en el logo para navegar a la Home...');
        try {
            // Buscamos el enlace que envuelve al logo de Ripley
            await page.click('a[href="https://simple.ripley.com.pe/home"]'); 
        } catch (e) {
            console.log('⚠️ No se pudo hacer clic en el logo, intentando navegación directa suavizada...');
            await page.goto('https://simple.ripley.com.pe/home', { waitUntil: 'domcontentloaded' });
        }

        // PASO 3: ESPERA HUMANA LARGA (Crucial para que Turnstile se resuelva solo)
        console.log('⏳ Esperando 25 segundos para que la Home cargue sin bloqueos...');
        await new Promise(r => setTimeout(r, 25000));

        // PASO 4: SCROLL LENTO (Simula lectura humana)
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 500;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) { clearInterval(timer); resolve(); }
                }, 300);
            });
        });

        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 2000));

        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
        const fileName = `Ripley_HOME_Real_${new Date().getTime()}.jpg`;
        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Proceso terminado.');
    }
}
start();