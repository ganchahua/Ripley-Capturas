const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const stream = require('stream');

// Activamos el plugin de sigilo avanzado
puppeteer.use(StealthPlugin());

// ... variables de entorno (igual que antes) ...
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID;
const MIS_COOKIES = process.env.MIS_COOKIES; 

async function uploadToDrive(buffer, fileName) {
    // ... función de subida (igual que antes) ...
    // ... no lo pego completo para brevedad ...
}

async function start() {
    console.log('🚀 Iniciando Puppeteer con Mimetismo Completo...');
    
    // TÉCNICA 1: Forzar una firma de Windows y limpiar rastro de automatización
const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: '/usr/bin/google-chrome', // Forzamos la ruta en el runner de GitHub
        timeout: 60000, // Le damos 60 segundos para abrir (el doble)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Crítico para evitar que Chrome se quede sin memoria en Docker
            '--disable-gpu', // En servidores sin tarjeta de video real ayuda mucho
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
        ] 
    });

    try {
        const page = await browser.newPage();
        
        // TÉCNICA 2: Mimetismo de User-Agent de Windows y PC Real
        // Usaremos este User-Agent de Windows 10 para coincidir con tus cookies residenciales.
        const windowsUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
        await page.setUserAgent(windowsUserAgent);

        // TÉCNICA 3: Falsificación profunda de plataforma (evita que Cloudflare vea Linux)
        await page.evaluateOnNewDocument((ua) => {
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            Object.defineProperty(navigator, 'productSub', { get: () => '20030107' });
            Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
            Object.defineProperty(navigator, 'userAgent', { get: () => ua });
        }, windowsUserAgent);

        await page.setViewport({ width: 1920, height: 1080 });

        // --- GESTIÓN DE COOKIES (NUEVAS COOKIES REQUERIDAS) ---
        if (MIS_COOKIES && MIS_COOKIES !== "undefined" && MIS_COOKIES !== "") {
            try {
                console.log('🍪 Intentando inyectar cookies de sesión RESIDENCIALES...');
                const cookies = JSON.parse(MIS_COOKIES);
                // TÉCNICA 4: Asegurar que el dominio sea correcto para Ripley
                const formattedCookies = cookies.map(cookie => ({
                    ...cookie,
                    domain: cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`
                }));
                await page.setCookie(...formattedCookies);
                console.log('✅ Cookies de sesión mimetizadas.');
            } catch (e) {
                console.error('⚠️ Error al parsear JSON de cookies.');
            }
        }

        console.log('📸 Navegando a Ripley.com.pe con mimetismo...');
        // TÉCNICA 5: Espera de red más inteligente
        await page.goto('https://simple.ripley.com.pe/', { 
            waitUntil: 'networkidle2', 
            timeout: 180000 // Aumentamos a 3 min por si acaso
        });

        // Espera humana inicial táctica
        console.log('⏳ Esperando 15 segundos para Turnstile pass táctico...');
        await new Promise(r => setTimeout(r, 15000));

        // TÉCNICA 6: Movimiento de mouse simulado (indispensable con Xvfb)
        console.log('🖱️ Simulando actividad humana...');
        await page.mouse.move(500, 500);
        await new Promise(r => setTimeout(r, 200));
        await page.mouse.move(800, 300);

        // Verificamos si estamos bloqueados y tomamos captura de depuración
        const html = await page.content();
        if (html.includes("Verify you are human") || html.includes("Cloudflare")) {
            console.log('⚠️ AVISO: Sigues bloqueado por Cloudflare.');
            console.log('🖼️ Generando captura de DEPURE (lo que el bot ve)...');
            const debugBuffer = await page.screenshot({ fullPage: true });
            const debugFileName = `DEBUG_Cloudflare_Pass_${new Date().toISOString()}.png`;
            await uploadToDrive(debugBuffer, debugFileName);
            
            // TÉCNICA 7: Re-navegar. A veces el segundo intento funciona.
            console.log('🔄 Intentando re-navegar táctica...');
            await page.reload({ waitUntil: "networkidle2" });
            await new Promise(r => setTimeout(r, 10000));
        }

        // --- SCROLL INTELIGENTE AVANZADO ---
        console.log('📜 Ejecutando scroll para cargar productos...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 300; // Scrolls más cortos y humanos
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight || totalHeight > 15000) { // Limitamos por si es infinita
                        clearInterval(timer);
                        resolve();
                    }
                }, 250); // Un poco más lento, más humano
            });
        });

        // Volvemos arriba para la captura estética
        await page.evaluate(() => window.scrollTo(0, 0));
        console.log('⏳ Espera final post-scroll...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('🖼️ Generando buffer de imagen definitiva...');
        const buffer = await page.screenshot({ 
            fullPage: true, 
            type: 'jpeg', 
            quality: 70 
        });

        const fileName = `Ripley_CAPTURA_REAL_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
        
        // --- SUBIDA A DRIVE ---
        await uploadToDrive(buffer, fileName);

    } catch (error) {
        console.error('❌ ERROR DURANTE LA EJECUCIÓN:', error.message);
        // Si hay error de timeout, tomamos captura para ver qué pasó
        if (error.message.includes('timeout')) {
             const buffer = await page.screenshot();
             await uploadToDrive(buffer, `ERROR_TIMEOUT_${new Date().toISOString()}.png`);
        }
    } finally {
        await browser.close();
        console.log('👋 Navegador cerrado. Proceso finalizado.');
    }
}

start();