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
        console.log(`✅ Captura corporativa enviada: ${fileName}`);
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🚀 Iniciando bypass con Headers de la sede...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const page = await browser.newPage();
    
    try {
        // 1. Emular exactamente tu navegador corporativo (sacado de tu captura)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // 2. Inyectar los Headers específicos de tu imagen
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9',
            'Cache-Control': 'max-age=0',
            'Sec-Ch-Ua': '"Brave";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        });

        // 3. Inyectar las cookies de la oficina (la cadena larga de tu imagen)
        if (process.env.MIS_COOKIES) {
            // Si pasas el string completo de la captura como secret
            const rawCookie = process.env.MIS_COOKIES;
            const cookies = rawCookie.split(';').map(pair => {
                const [name, ...value] = pair.trim().split('=');
                return { name, value: value.join('='), domain: '.ripley.com.pe' };
            });
            await page.setCookie(...cookies);
            console.log('🍪 Sesión corporativa inyectada.');
        }

        console.log('📡 Accediendo a la Home...');
        await page.goto('https://simple.ripley.com.pe/home', { waitUntil: 'networkidle2', timeout: 90000 });

        // Espera humana para renderizado
        await new Promise(r => setTimeout(r, 15000));

        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
        const fileName = `Ripley_Internal_Network_${new Date().getTime()}.jpg`;
        await uploadToDrive(buffer, fileName);

    } catch (err) {
        console.error('❌ Fallo:', err.message);
        const errBuf = await page.screenshot({ type: 'jpeg' });
        await uploadToDrive(errBuf, `DEBUG_SESSION_${new Date().getTime()}.jpg`);
    } finally {
        await browser.close();
    }
}
start();