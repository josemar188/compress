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

// Inicializa o FFmpeg
async function loadFFmpeg() {
    if (ffmpeg) return;
    statusText.innerText = 'Carregando motor de compressão (pode levar alguns segundos)...';
    progressContainer.classList.remove('hidden');
    
    ffmpeg = new window.FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log(message));
    ffmpeg.on('progress', ({ progress }) => {
        progressBar.value = progress * 100;
    });

    // Usa o CDN para carregar os arquivos core (funciona no GitHub Pages)
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
        coreURL: await window.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await window.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    progressContainer.classList.add('hidden');
}

// Eventos de arrastar e soltar
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

// Processa o arquivo selecionado
async function handleFile(file) {
    currentFile = file;
    fileName.innerText = file.name;
    fileSize.innerText = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    fileInfo.classList.remove('hidden');
    
    // Obtém a duração do vídeo para a estimativa
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
    await loadFFmpeg();
    compressBtn.disabled = false;
}

// Atualiza a estimativa de tamanho com base na qualidade (CRF)
function updateEstimate() {
    if (!videoDuration || !currentFile) return;
    const crf = parseInt(qualitySelect.value);
    // Mapeamento aproximado de CRF para bitrate de vídeo (em kbps)
    const bitrateMap = { 23: 2000, 28: 1000, 32: 600 };
    const videoBitrate = bitrateMap[crf] || 1000;
    const audioBitrate = 128; // kbps
    const estimatedSize = ((videoBitrate + audioBitrate) * 1000 * videoDuration) / 8 / (1024 * 1024);
    estimate.innerText = `Tamanho estimado: ~${estimatedSize.toFixed(1)} MB`;
}
qualitySelect.addEventListener('change', updateEstimate);

// Executa a compressão
compressBtn.addEventListener('click', async () => {
    if (!currentFile || !ffmpeg) return;
    compressBtn.disabled = true;
    downloadArea.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    statusText.innerText = 'Comprimindo...';
    progressBar.value = 0;

    const inputName = 'input' + currentFile.name.substring(currentFile.name.lastIndexOf('.'));
    const outputName = 'output.mp4';
    const crf = qualitySelect.value;

    try {
        await ffmpeg.writeFile(inputName, await window.fetchFile(currentFile));
        
        // Comando FFmpeg para compressão
        await ffmpeg.exec([
            '-i', inputName,
            '-vcodec', 'libx264',
            '-crf', crf,
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '128k',
            outputName
        ]);

        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        // Nome do arquivo final com sufixo
        const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
        downloadLink.href = url;
        downloadLink.download = `${baseName}_compressed.mp4`;
        
        downloadArea.classList.remove('hidden');
        statusText.innerText = 'Concluído!';
        progressBar.value = 100;
    } catch (error) {
        console.error(error);
        statusText.innerText = 'Erro na compressão. Tente outro arquivo.';
    } finally {
        compressBtn.disabled = false;
        // Limpa o sistema de arquivos virtual do FFmpeg
        try { await ffmpeg.deleteFile(inputName); } catch(e) {}
        try { await ffmpeg.deleteFile(outputName); } catch(e) {}
    }
});