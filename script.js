async function loadFFmpeg() {
    if (ffmpeg) return;
    statusText.innerText = 'Carregando motor de compressão (pode levar alguns segundos)...';
    progressContainer.classList.remove('hidden');
    
    ffmpeg = new window.FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log(message));
    ffmpeg.on('progress', ({ progress }) => {
        progressBar.value = progress * 100;
    });

    try {
        // Utilizando o unpkg, que é mais estável para pacotes ESM de WASM
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        
        await ffmpeg.load({
            coreURL: await window.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await window.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        progressContainer.classList.add('hidden');
        statusText.innerText = ''; // Limpa a mensagem de carregamento
    } catch (error) {
        console.error("Falha ao carregar o FFmpeg:", error);
        statusText.innerText = '❌ Erro ao carregar o motor. Verifique o console (F12) para mais detalhes.';
        progressBar.value = 0;
        // Opcional: permitir que o usuário tente novamente
        compressBtn.disabled = false; 
        throw error; // Repassa o erro para a função chamadora
    }
}
