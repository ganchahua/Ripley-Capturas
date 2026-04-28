const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

async function uploadToDrive(buffer, fileName) {
    const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough().end(buffer);
    try {
        await driveService.files.create({
            requestBody: { name: fileName, parents: [process.env.FOLDER_ID] },
            media: { mimeType: 'image/jpeg', body: bufferStream }
        });
        console.log('✅ Imagen enviada a Drive.');
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🚀 Intento final: Bypass por Inyección de Eventos...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    
    try {
        // Mimetismo de Windows 10
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        if (process.env.MIS_COOKIES) {
            await page.setCookie(...JSON.parse(process.env.MIS_COOKIES));
        }

        // 1. Entramos a Laptops (Zona de baja seguridad)
        console.log('📡 Validando en Laptops...');
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 5000));

        // 2. Navegamos a la Home simulando un clic orgánico
        console.log('🏠 Saltando a la Home...');
        await page.evaluate(() => {
            const logo = document.querySelector('a[href="/"]') || document.querySelector('a[href*="https://simple.ripley.com.pe/"]');
            if (logo) logo.click();
            else window.location.href = 'https://simple.ripley.com.pe';
        });

        // 3. SIMULACIÓN HUMANA ACTIVA (Para romper el Turnstile)
        console.log('⏳ Ejecutando movimientos de mouse aleatorios (45s)...');
        for (let i = 0; i < 5; i++) {
            await page.mouse.move(Math.random() * 500, Math.random() * 500);
            await page.mouse.wheel({ deltaY: (Math.random() * 100) });
            await new Promise(r => setTimeout(r, 8000)); // 5 ciclos de 8s = 40s
        }

        // 4. VERIFICACIÓN FINAL: Si sigue el captcha, forzamos un reload
        const html = await page.content();
        if (html.includes("Verify you are human")) {
            console.log('⚠️ Detectado captcha persistente. Forzando recarga...');
            await page.reload({ waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 15000));
        }

        console.log('🖼️ Capturando resultado final...');
        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
        await uploadToDrive(buffer, `RESULTADO_FINAL_${new Date().getTime()}.jpg`);

    } catch (e) {
        console.log('❌ Error:', e.message);
    } finally {
        await browser.close();
    }
}
start();