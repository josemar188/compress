// No final do seu script.js, substitua a chamada anterior por esta:

// Função para iniciar o carregamento do FFmpeg em segundo plano
function preloadFFmpeg() {
    if (!ffmpeg) {
        // Apenas inicia o processo. A função loadFFmpeg já lida com o status.
        loadFFmpeg().catch(err => console.log("Pré-carregamento do FFmpeg falhou, será tentado novamente na seleção do arquivo."));
    }
}

// Agenda o pré-carregamento para quando o navegador estiver ocioso
window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(preloadFFmpeg, { timeout: 5000 }); // Começa em até 5s de ociosidade
    } else {
        setTimeout(preloadFFmpeg, 2000); // Fallback para navegadores antigos
    }
});
