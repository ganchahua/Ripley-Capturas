const { connect } = require('puppeteer-real-browser');
const { google } = require('googleapis');
const stream = require('stream');

async function uploadToDrive(buffer, fileName) {
    const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    await driveService.files.create({
        requestBody: { name: fileName, parents: [process.env.FOLDER_ID] },
        media: { mimeType: 'image/jpeg', body: bufferStream }
    });
}

async function start() {
    console.log('🛡️ Iniciando conexión de Real Browser...');
    
    // Esta librería gestiona el sigilo de forma mucho más profunda
    const { browser, page } = await connect({
        args: ["--start-maximized"],
        headless: false,
        customConfig: {},
        turnstile: true, // ¡ESTO intenta detectar y esperar el captcha automáticamente!
        connectOption: { defaultViewport: null }
    });

    try {
        await page.setViewport({ width: 1920, height: 1080 });
        console.log('📸 Navegando a Ripley...');
        
        // Vamos a una categoría, a veces la Home es más difícil
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('⏳ Espera estratégica para validación (20s)...');
        await new Promise(r => setTimeout(r, 20000));

        // Si detectamos el texto de Cloudflare, esperamos un poco más
        const content = await page.content();
        if (content.includes("Verify you are human")) {
            console.log('⚡ Detectado Turnstile, esperando resolución automática...');
            await new Promise(r => setTimeout(r, 20000));
        }

        console.log('📜 Ejecutando scroll final...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 5000));

        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
        const fileName = `Ripley_Final_Success_${new Date().getTime()}.jpg`;

        await uploadToDrive(buffer, fileName);
        console.log('✅ ¡Captura lograda y enviada a Drive!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

start();