const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

puppeteer.use(StealthPlugin());

// ... (Configuración de Drive y variables igual que antes) ...

async function start() {
    console.log('🚀 Iniciando Navegación Fantasma para la Home...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ] 
    });

    const page = await browser.newPage();
    
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        if (process.env.MIS_COOKIES) {
            await page.setCookie(...JSON.parse(process.env.MIS_COOKIES));
        }

        // PASO 1: Entrar a Laptops (La zona segura)
        console.log('📡 Validando en zona segura (Laptops)...');
        await page.goto('https://simple.ripley.com.pe/tecnologia/computacion/laptops', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 6000));

        // PASO 2: NAVEGACIÓN FANTASMA (Simulamos clic interno por JS)
        console.log('🏠 Ejecutando salto invisible a la Home...');
        await page.evaluate(() => {
            // Buscamos el link de la Home en el DOM y lo "cliqueamos" como humanos
            const logo = document.querySelector('a[href="/"]') || document.querySelector('a[href*="https://simple.ripley.com.pe/"]');
            if (logo) logo.click();
            else window.location.href = 'https://simple.ripley.com.pe/';
        });

        // PASO 3: LA ESPERA DE ORO
        // Cloudflare tarda en decidir si eres humano. Le damos 40 segundos de "silencio".
        console.log('⏳ Fase de silencio (40s) para que el Firewall se retire...');
        await new Promise(r => setTimeout(r, 40000));

        // PASO 4: VERIFICACIÓN Y CAPTURA
        const html = await page.content();
        if (html.includes("Verify you are human")) {
            console.log('⚠️ El Firewall sigue ahí. Intentando un scroll de emergencia...');
            await page.mouse.wheel({ deltaY: 500 });
            await new Promise(r => setTimeout(r, 10000));
        }

        console.log('🖼️ Tomando captura definitiva...');
        const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
        const fileName = `RIPLEY_HOME_REPASADO_${new Date().getTime()}.jpg`;
        
        // Función de subida a Drive (la misma que ya tienes)
        await uploadToDrive(buffer, fileName);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await browser.close();
    }
}
start();