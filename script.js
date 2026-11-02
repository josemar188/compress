async function loadFFmpeg() {
    if (ffmpeg) return;
    statusText.innerText = 'Carregando motor de compressão (pode levar alguns segundos)...';
    progressContainer.classList.remove('hidden');
    
    ffmpeg = new window.FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ffmpeg.on('progress', ({ progress }) => {
        progressBar.value = progress * 100;
    });

    try {
        const coreBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
        
        // Carrega o core e o wasm como Blob URLs (ainda do CDN, pois são grandes)
        const [coreURL, wasmURL] = await Promise.all([
            window.toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
            window.toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm')
        ]);

        // Agora usamos os arquivos locais que você baixou para a pasta 'ffmpeg'
        // O caminho é relativo à raiz do site.
        const workerURL = new URL('ffmpeg/worker.js', window.location.href).href;
        const classWorkerURL = new URL('ffmpeg/worker.js', window.location.href).href;

        await ffmpeg.load({ 
            coreURL, 
            wasmURL, 
            workerURL, 
            classWorkerURL 
        });
        
        progressContainer.classList.add('hidden');
        statusText.innerText = '';
        compressBtn.disabled = false;

    } catch (error) {
        console.error("Falha fatal ao carregar o FFmpeg:", error);
        statusText.innerText = '❌ Erro ao carregar o motor. Verifique o console (F12).';
        progressBar.value = 0;
        throw error;
    }
}
