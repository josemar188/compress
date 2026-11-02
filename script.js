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

// 1. Carrega o FFmpeg (agora com o Worker protegido por BlobURL)
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
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
        const ffmpegBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';

        // Prepara os Blob URLs para o core e para o worker (contorna o erro de CORS)
        const [coreURL, wasmURL, classWorkerURL] = await Promise.all([
            window.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            window.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            window.toBlobURL(`${ffmpegBaseURL}/worker.js`, 'text/javascript')
        ]);

        await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });
        
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

// 2. Função de estimativa (restaurada)
function updateEstimate() {
    if (!videoDuration || !currentFile) return;
    const crf = parseInt(qualitySelect.value);
    const bitrateMap = { 23: 2000, 28: 1000, 32: 600 };
    const videoBitrate = bitrateMap[crf] || 1000;
    const audioBitrate = 128;
    const estimatedSize = ((videoBitrate + audioBitrate) * 1000 * videoDuration) / 8 / (1024 * 1024);
    estimate.innerText = `Tamanho estimado: ~${estimatedSize.toFixed(1)} MB`;
}
qualitySelect.addEventListener('change', updateEstimate);

// 3. Lógica de upload
dropArea.addEventListener('click', () => fileInput.click());
dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('highlight'); });
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
    
    if (!ffmpeg) {
        await loadFFmpeg();
    } else {
        compressBtn.disabled = false;
    }
}

// 4. Executa a compressão
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
        try { await ffmpeg.deleteFile(inputName); } catch(e) {}
        try { await ffmpeg.deleteFile(outputName); } catch(e) {}
    }
});

