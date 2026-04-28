const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

// Configuración para Google Cloud Storage (vía protocolo S3)
const s3Client = new S3Client({
    endpoint: "https://storage.googleapis.com", // IMPORTANTE: Usamos el endpoint de tu captura
    region: "auto",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function start() {
    console.log('🚀 Iniciando bypass vía puente de Google Storage...');
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    
    try {
        // Headers de Brave (image_edb05f.png)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        // 1. Visitar primero tu ruta de Ripley en Google Storage
        // Usamos la ruta exacta que me pasaste en la imagen
        const bridgeUrl = "https://storage.googleapis.com/home.ripley.com.pe/minisitios/App/index.html";
        console.log(`📡 Validando en: ${bridgeUrl}`);
        await page.goto(bridgeUrl, { waitUntil: 'networkidle2' });

        // 2. Inyectar Cookies corporativas
        if (process.env.MIS_COOKIES) {
            const rawCookie = process.env.MIS_COOKIES;
            const cookies = rawCookie.split(';').map(pair => {
                const [name, ...value] = pair.trim().split('=');
                return { name, value: value.join('='), domain: '.ripley.com.pe' };
            });
            await page.setCookie(...cookies);
        }

        // 3. Salto a la Home
        console.log('🏠 Saltando a la Home con Referrer de confianza...');
        await page.setExtraHTTPHeaders({ 'Referer': bridgeUrl });
        await page.goto('https://simple.ripley.com.pe', { waitUntil: 'load', timeout: 90000 });

        await new Promise(r => setTimeout(r, 20000)); // 20s para asegurar carga total

        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
        
        // Subir a Drive (usando tu función ya existente)
        await uploadToDrive(buffer, `Ripley_Bridge_GCS_${new Date().getTime()}.jpg`);

    } catch (err) {
        console.error('❌ Fallo:', err.message);
        const errBuf = await page.screenshot({ type: 'jpeg' });
        // Subir log de error a tu bucket para que lo veas en S3 Browser
        const command = new PutObjectCommand({
            Bucket: "home.ripley.com.pe",
            Key: `debug/error_${new Date().getTime()}.jpg`,
            Body: errBuf
        });
        await s3Client.send(command);
    } finally {
        await browser.close();
    }
}
start();