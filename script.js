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
        // A MUDANÇA CRUCIAL: usar o core single-thread (@ffmpeg/core-st)
        // que não exige SharedArrayBuffer e funciona no GitHub Pages.
        const coreBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.1/dist/umd';
        
        const [coreURL, wasmURL] = await Promise.all([
            window.toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
            window.toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm')
        ]);

        // Usar os arquivos locais que você baixou para a pasta 'ffmpeg'
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
