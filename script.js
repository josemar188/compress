const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const options = document.getElementById('options');
const qualitySelect = document.getElementById('quality');
const estimate = document.getElementById('estimate');
const compressBtn = document.getElementById('compress-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status');
const downloadArea = document.getElementById('download-area');
const downloadLink = document.getElementById('download-link');

let ffmpeg = null;
let currentFile = null;
let videoDuration = 0;

// Inicializa o FFmpeg de forma robusta
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
        // Usando jsDelivr, que é mais confiável para este tipo de arquivo
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
        
        const [coreURL, wasmURL] = await Promise.all([
            window.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            window.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
        ]);

        await ffmpeg.load({ coreURL, wasmURL });
        
        // Se chegou aqui, o motor carregou. Liberamos a interface.
        progressContainer.classList.add('hidden');
        statusText.innerText = '';
        
        // O ponto crucial: habilitar o botão de compressão agora
        compressBtn.disabled = false;

    } catch (error) {
        console.error("Falha fatal ao carregar o FFmpeg:", error);
        statusText.innerText = '❌ Erro ao carregar o motor. Verifique o console (F12).';
        progressBar.value = 0;
        // Não habilitamos o botão, pois a compressão não funcionará.
        throw error;
    }
}

// --- Lógica de upload (permanece a mesma, mas agora é ativada corretamente) ---
dropArea.addEventListener('click', () => fileInput.click());
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('highlight');
});
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('highlight'));
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('highlight');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) handleFile(file);
});
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

async function handleFile(file) {
    currentFile = file;
    fileName.innerText = file.name;
    fileSize.innerText = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    fileInfo.classList.remove('hidden');
    
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        videoDuration = video.duration;
        updateEstimate();
    };
    video.src = URL.createObjectURL(file);
    
    options.classList.remove('hidden');
    downloadArea.classList.add('hidden');
    
    // O upload é aceito imediatamente. O carregamento do motor acontece em paralelo.
    if (!ffmpeg) {
        // Se o motor ainda não foi carregado, inicia o carregamento.
        // O botão de compressão só será habilitado quando o load terminar.
        await loadFFmpeg();
    } else {
        // Se o motor já estiver carregado, apenas habilita o botão.
        compressBtn.disabled = false;
    }
}

// O restante do código (updateEstimate e o listener de clique do compressBtn) continua igual
// ...
