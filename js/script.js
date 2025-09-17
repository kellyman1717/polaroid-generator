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

imageUpload.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    userImageMimeType = file.type;
    const reader = new FileReader();
    reader.onload = (event) => {
      userImage = new Image();
      userImage.onload = () => {
        infoMessage.innerHTML = `<p class="text-green-600">Image loaded. Ready to customize!</p>`;
        createPolaroid();
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

captionInput.addEventListener('input', () => { if (userImage) createPolaroid(); });
filterSelect.addEventListener('change', () => { if (userImage) createPolaroid(); });
noiseSlider.addEventListener('input', () => { if (userImage) createPolaroid(); });

downloadBtn.addEventListener('click', () => {
  createPolaroid(2.5);
  downloadBtn.href = canvas.toDataURL('image/png');
});

generateCaptionBtn.addEventListener('click', generateCaption);

async function generateCaption() {
  if (!userImage || !userImage.src) {
    return;
  }

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

    if (!response.ok) {
      throw new Error(`Request to our server failed with status ${response.status}`);
    }

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
                        createPolaroid();
                    } catch (e) {
                    }
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

function createPolaroid(scale = 1) {
  if (!userImage) return;

  const aspectRatio = userImage.width / userImage.height;
  const imgMaxWidth = 350;
  const imgWidth = Math.min(imgMaxWidth, userImage.width);
  const imgHeight = imgWidth / aspectRatio;

  const borderTop = 20, borderSide = 20, borderBottom = 90;
  const frameWidth = imgWidth + borderSide * 2;
  const frameHeight = imgHeight + borderTop + borderBottom;

  canvas.width = frameWidth * scale;
  canvas.height = frameHeight * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  ctx.fillStyle = '#fefefe';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;
  ctx.fillRect(0, 0, frameWidth, frameHeight);
  ctx.shadowColor = 'transparent';

  applyFilter(filterSelect.value);
  ctx.drawImage(userImage, borderSide, borderTop, imgWidth, imgHeight);
  ctx.filter = 'none';

  const noiseValue = parseInt(noiseSlider.value, 10);
  if (noiseValue > 0) {
    applyNoise(noiseValue);
  }

  const captionText = captionInput.value;
  if (captionText) {
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    const textX = frameWidth / 2;
    const boxY = imgHeight + borderTop + 15;
    const boxWidth = frameWidth - 40;
    const boxHeight = borderBottom - 25;

    fitAndDrawText(ctx, captionText, textX, boxY, boxWidth, boxHeight);
  }

  resultContainer.classList.remove('hidden');
  infoMessage.classList.add('hidden');

  if (scale === 1) {
    downloadBtn.href = canvas.toDataURL('image/png');
  }
}

function applyFilter(filterValue) {
  switch (filterValue) {
    case 'classic': ctx.filter = 'saturate(1.1) contrast(1.1) brightness(1.05) sepia(0.1)'; break;
    case 'vintage': ctx.filter = 'sepia(0.4) saturate(1.2) contrast(0.85) brightness(1.05)'; break;
    case 'bw': ctx.filter = 'grayscale(1) contrast(1.1)'; break;
    case 'vibrant': ctx.filter = 'saturate(1.5) contrast(1.2)'; break;
    default: ctx.filter = 'none'; break;
  }
}

function applyNoise(intensity) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity;
    data[i] += noise; data[i + 1] += noise; data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
}

function fitAndDrawText(context, text, x, y, maxWidth, maxHeight) {
  let fontSize = 40;

  while (fontSize > 10) {
    context.font = `${fontSize}px 'Caveat', cursive`;
    const lineHeight = fontSize * 0.95;
    const lines = getWrappedLines(context, text, maxWidth);
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= maxHeight) {
      const startY = y + (maxHeight - totalHeight) / 2;
      for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], x, startY + (i * lineHeight) + (fontSize / 2));
      }
      return;
    }

    fontSize--;
  }

  context.font = `10px 'Caveat', cursive`;
  const lines = getWrappedLines(context, text, maxWidth);
  const lineHeight = 10 * 0.95;
  const startY = y;
  for (let i = 0; i < lines.length; i++) {
    if ((startY + (i * lineHeight) + (10 / 2)) < (y + maxHeight)) {
      context.fillText(lines[i], x, startY + (i * lineHeight) + (10 / 2));
    }
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
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
