const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

const s3Client = new S3Client({
    endpoint: "https://storage.googleapis.com",
    region: "auto",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

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
        console.log(`✅ Drive: ${fileName}`);
    } catch (e) { console.error('❌ Error Drive:', e.message); }
}

async function start() {
    console.log('🚀 Iniciando navegación estable...');
    const browser = await puppeteer.launch({ 
        headless: false,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled'
        ] 
    });

    const page = await browser.newPage();
    page.on('error', err => console.log('⚠️ Error de página:', err.message));

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        if (process.env.MIS_COOKIES) {
            const cookies = process.env.MIS_COOKIES.split(';').map(pair => {
                const [name, ...value] = pair.trim().split('=');
                return { name, value: value.join('='), domain: '.ripley.com.pe', path: '/' };
            });
            await page.setCookie(...cookies);
        }

        // Usamos la ruta de tu GCS como puente
        const bridgeUrl = "https://storage.googleapis.com/home.ripley.com.pe/minisitios/App/index.html";
        await page.goto(bridgeUrl, { waitUntil: 'networkidle2' });

        console.log('🏠 Cargando Ripley...');
        await page.setExtraHTTPHeaders({ 'Referer': bridgeUrl });
        
        // Cambiado a 'domcontentloaded' para máxima compatibilidad
        await page.goto('https://www.ripley.com.pe/', { 
            waitUntil: 'domcontentloaded', 
            timeout: 90000 
        });

        console.log('⏳ Esperando renderizado final (20s)...');
        await new Promise(r => setTimeout(r, 20000));

        if (!page.isClosed()) {
            const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
            await uploadToDrive(buffer, `Ripley_Final_${Date.now()}.jpg`);
        }

    } catch (err) {
        console.error('❌ Fallo crítico:', err.message);
        if (!page.isClosed()) {
            const errBuf = await page.screenshot({ type: 'jpeg' });
            const command = new PutObjectCommand({
                Bucket: "home.ripley.com.pe",
                Key: `debug/error_gh_${Date.now()}.jpg`,
                Body: errBuf
            });
            await s3Client.send(command).catch(e => console.log("S3 Error:", e.message));
        }
    } finally {
        await browser.close();
    }
}
start();