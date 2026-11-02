async function loadFFmpeg() {
    if (ffmpeg) return;
    statusText.innerText = 'Carregando motor de compressão...';
    progressContainer.classList.remove('hidden');
    
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ffmpeg.on('progress', ({ progress }) => {
        progressBar.value = progress * 100;
    });

    try {
        // ✅ CAMINHO CORRIGIDO: @ffmpeg/core versão 0.12.10 no diretório /dist/umd
        const coreBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
        
        // Constrói a URL absoluta para o worker local na raiz do site
        const workerAbsoluteURL = window.location.origin + '/compress/ffmpeg/worker.js';

        const [coreURL, wasmURL] = await Promise.all([
            toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
            toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm')
        ]);

        await ffmpeg.load({ 
            coreURL, 
            wasmURL, 
            classWorkerURL: workerAbsoluteURL 
        });
        
        progressContainer.classList.add('hidden');
        statusText.innerText = '';
    } catch (error) {
        console.error("Falha fatal ao carregar o FFmpeg:", error);
        statusText.innerText = '❌ Erro ao carregar o motor. Verifique a aba Network (F12).';
        progressBar.value = 0;
        throw error;
    }
}
