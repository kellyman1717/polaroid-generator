const imageUpload = document.getElementById('image-upload');
const captionInput = document.getElementById('caption-input');
const generateCaptionBtn = document.getElementById('generate-caption-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const filterSelect = document.getElementById('filter-select');
const noiseSlider = document.getElementById('noise-slider');
const resultContainer = document.getElementById('result-container');
const infoMessage = document.getElementById('info-message');
const canvas = document.getElementById('polaroid-canvas');
const downloadBtn = document.getElementById('download-btn');
const ctx = canvas.getContext('2d');

let userImage = null;
let userImageMimeType = null;
let filteredImageCanvas = null;

imageUpload.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    userImageMimeType = file.type;
    const reader = new FileReader();
    reader.onload = (event) => {
      userImage = new Image();
      userImage.onload = () => {
        infoMessage.innerHTML = `<p class="text-green-600">Image loaded. Ready to customize!</p>`;
        applyFilterAndNoiseToOffscreenCanvas();
        renderPreviewPolaroid();
        generateCaptionBtn.disabled = false;
      };
      userImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    userImage = null;
    userImageMimeType = null;
    infoMessage.innerHTML = `<p>Upload an image to begin.</p>`;
    resultContainer.classList.add('hidden');
    infoMessage.classList.remove('hidden');
    generateCaptionBtn.disabled = true;
  }
});

captionInput.addEventListener('input', () => { if (userImage) renderPreviewPolaroid(); });

filterSelect.addEventListener('change', () => {
    if (userImage) {
        applyFilterAndNoiseToOffscreenCanvas();
        renderPreviewPolaroid();
    }
});
noiseSlider.addEventListener('input', () => {
    if (userImage) {
        applyFilterAndNoiseToOffscreenCanvas();
        renderPreviewPolaroid();
    }
});

downloadBtn.addEventListener('click', generateAndDownloadHighQualityPolaroid);

generateCaptionBtn.addEventListener('click', generateCaption);

async function generateCaption() {
  if (!userImage || !userImage.src) { return; }

  generateCaptionBtn.disabled = true;
  btnText.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  captionInput.value = ""; 

  try {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const MAX_WIDTH_FOR_API = 512;
    const aspectRatio = userImage.width / userImage.height;
    tempCanvas.width = MAX_WIDTH_FOR_API;
    tempCanvas.height = MAX_WIDTH_FOR_API / aspectRatio;
    tempCtx.drawImage(userImage, 0, 0, tempCanvas.width, tempCanvas.height);
    const resizedImageData = tempCanvas.toDataURL('image/jpeg', 0.7).split(',')[1];
    const languageSelect = document.getElementById('language-select');
    const selectedLang = languageSelect.value;
    
    const response = await fetch('/api/generate-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: resizedImageData, 
        mimeType: 'image/jpeg', 
        language: selectedLang,
      })
    });

    if (!response.ok) { throw new Error(`Request to our server failed with status ${response.status}`); }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let partialChunk = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialChunk += decoder.decode(value, { stream: true });
        const lines = partialChunk.split('\n');
        partialChunk = lines.pop(); 
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6).trim();
                if (jsonStr) { 
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        captionInput.value += text;
                        renderPreviewPolaroid();
                    } catch (e) {}
                }
            }
        }
    }
  } catch (error) {
    console.error("Error generating caption:", error);
    captionInput.value = "Maaf, terjadi kesalahan.";
  } finally {
    generateCaptionBtn.disabled = false;
    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
  }
}

function applyFilterAndNoiseToOffscreenCanvas() {
    if (!userImage) return;
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    const aspectRatio = userImage.width / userImage.height;
    const imgMaxWidth = 350;
    const imgWidth = Math.min(imgMaxWidth, userImage.width);
    const imgHeight = imgWidth / aspectRatio;
    offscreenCanvas.width = imgWidth;
    offscreenCanvas.height = imgHeight;
    offscreenCtx.drawImage(userImage, 0, 0, imgWidth, imgHeight);
    const imageData = offscreenCtx.getImageData(0, 0, imgWidth, imgHeight);
    const filter = filterSelect.value;
    const noise = parseInt(noiseSlider.value, 10);
    applyPixelFilters(imageData, filter, noise);
    offscreenCtx.putImageData(imageData, 0, 0);
    filteredImageCanvas = offscreenCanvas;
}

function renderPreviewPolaroid() {
  if (!userImage || !filteredImageCanvas) return;
  const imgWidth = filteredImageCanvas.width;
  const imgHeight = filteredImageCanvas.height;
  const borderTop = 20, borderSide = 20, borderBottom = 90;
  const frameWidth = imgWidth + borderSide * 2;
  const frameHeight = imgHeight + borderTop + borderBottom;
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#fefefe';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;
  ctx.fillRect(0, 0, frameWidth, frameHeight);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(filteredImageCanvas, borderSide, borderTop, imgWidth, imgHeight);
  const captionText = captionInput.value;
  if (captionText) {
    drawCaption(ctx, captionText, frameWidth, imgHeight, borderTop, borderBottom);
  }
  resultContainer.classList.remove('hidden');
  infoMessage.classList.add('hidden');
}

function generateAndDownloadHighQualityPolaroid() {
    if (!userImage) return;
    const downloadCanvas = document.createElement('canvas');
    const downloadCtx = downloadCanvas.getContext('2d');
    const aspectRatio = userImage.width / userImage.height;
    const imgMaxWidth = 1500;
    const imgWidth = Math.min(imgMaxWidth, userImage.width);
    const imgHeight = imgWidth / aspectRatio;
    const borderTop = 80, borderSide = 80, borderBottom = 360;
    const frameWidth = imgWidth + borderSide * 2;
    const frameHeight = imgHeight + borderTop + borderBottom;
    downloadCanvas.width = frameWidth;
    downloadCanvas.height = frameHeight;
    downloadCtx.fillStyle = '#fefefe';
    downloadCtx.fillRect(0, 0, frameWidth, frameHeight);
    const tempImageCanvas = document.createElement('canvas');
    const tempImageCtx = tempImageCanvas.getContext('2d');
    tempImageCanvas.width = imgWidth;
    tempImageCanvas.height = imgHeight;
    tempImageCtx.drawImage(userImage, 0, 0, imgWidth, imgHeight);
    const imageData = tempImageCtx.getImageData(0, 0, imgWidth, imgHeight);
    const filter = filterSelect.value;
    const noise = parseInt(noiseSlider.value, 10);
    applyPixelFilters(imageData, filter, noise);
    tempImageCtx.putImageData(imageData, 0, 0);
    downloadCtx.drawImage(tempImageCanvas, borderSide, borderTop, imgWidth, imgHeight);
    const captionText = captionInput.value;
    if (captionText) {
      drawCaption(downloadCtx, captionText, frameWidth, imgHeight, borderTop, borderBottom);
    }
    const link = document.createElement('a');
    link.download = 'polaroid.png';
    link.href = downloadCanvas.toDataURL('image/png');
    link.click();
}

function applyPixelFilters(imageData, filter, noise) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        switch (filter) {
            case 'classic':
                r *= 1.1; g *= 1.1; b *= 1.05;
                const classic_sepia = (r * 0.393) + (g * 0.769) + (b * 0.189);
                r = classic_sepia * 0.1 + r * 0.9; g = classic_sepia * 0.1 + g * 0.9; b = classic_sepia * 0.1 + b * 0.9;
                break;
            case 'vintage':
                const vr = (r * 0.393)+(g * 0.769)+(b * 0.189), vg = (r * 0.349)+(g * 0.686)+(b * 0.168), vb = (r * 0.272)+(g * 0.534)+(b * 0.131);
                r = vr * 0.4 + r * 0.6; g = vg * 0.4 + g * 0.6; b = vb * 0.4 + b * 0.6;
                g *= 1.1;
                break;
            case 'bw':
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                r = g = b = gray * 1.1;
                break;
            case 'vibrant':
                 r *= 1.4; g *= 1.4; b *= 1.2;
                 break;
        }
        if (noise > 0) {
            const noiseVal = (Math.random() - 0.5) * noise;
            r += noiseVal; g += noiseVal; b += noiseVal;
        }
        data[i] = Math.max(0, Math.min(255, r));
        data[i+1] = Math.max(0, Math.min(255, g));
        data[i+2] = Math.max(0, Math.min(255, b));
    }
}

function drawCaption(ctx, captionText, frameWidth, imgHeight, borderTop, borderBottom) {
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    const textX = frameWidth / 2;
    const boxY = imgHeight + borderTop + (borderBottom * 0.15);
    const boxWidth = frameWidth - (borderSide * 2);
    const boxHeight = borderBottom * 0.7;
    let fontSize = Math.min(boxHeight, 160);
    while (fontSize > 10) {
        ctx.font = `${fontSize}px 'Caveat', cursive`;
        const lineHeight = fontSize * 0.95;
        const lines = getWrappedLines(ctx, captionText, boxWidth);
        const totalHeight = lines.length * lineHeight;
        if (totalHeight <= boxHeight) {
            const startY = boxY + (boxHeight - totalHeight) / 2;
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], textX, startY + (i * lineHeight) + (fontSize / 2));
            }
            return;
        }
        fontSize--;
    }
}

function getWrappedLines(context, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else { currentLine = testLine; }
  }
  if (currentLine) { lines.push(currentLine); }
  return lines;
}
