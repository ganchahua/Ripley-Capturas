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
        console.log(`✅ Captura clonada enviada: ${fileName}`);
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🚀 Iniciando clonación de sesión corporativa...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const page = await browser.newPage();
    
    try {
        // 1. Headers exactos de tu captura image_edb05f.png
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9',
            'Sec-Ch-Ua': '"Brave";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
            'Sec-Ch-Ua-Platform': '"Windows"'
        });

        // 2. Cargar Cookies antes de navegar
        if (process.env.MIS_COOKIES) {
            const rawCookie = process.env.MIS_COOKIES;
            const cookies = rawCookie.split(';').map(pair => {
                const [name, ...value] = pair.trim().split('=');
                return { name, value: value.join('='), domain: '.ripley.com.pe' };
            });
            await page.setCookie(...cookies);
        }

        // 3. Abrir la página (primera carga para establecer el dominio)
        console.log('📡 Abriendo dominio...');
        await page.goto('https://simple.ripley.com.pe/home', { waitUntil: 'domcontentloaded' });

        // 4. Inyectar Local Storage
        if (process.env.MI_LOCAL_STORAGE) {
            console.log('📦 Inyectando Local Storage...');
            await page.evaluate((data) => {
                const storage = JSON.parse(data);
                for (let key in storage) { localStorage.setItem(key, storage[key]); }
            }, process.env.MI_LOCAL_STORAGE);
            // Recargar para que tome los cambios
            await page.reload({ waitUntil: 'networkidle2' });
        }

        await new Promise(r => setTimeout(r, 15000));

        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
        await uploadToDrive(buffer, `Ripley_Clone_${new Date().getTime()}.jpg`);

    } catch (err) {
        console.error('❌ Fallo:', err.message);
        const errBuf = await page.screenshot({ type: 'jpeg' });
        await uploadToDrive(errBuf, `CLONE_FAIL_${new Date().getTime()}.jpg`);
    } finally {
        await browser.close();
    }
}
start();