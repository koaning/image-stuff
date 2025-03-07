document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const cornerRadius = document.getElementById('cornerRadius');
    const radiusValue = document.getElementById('radiusValue');
    const imagePreview = document.getElementById('imagePreview');
    const imageCanvas = document.getElementById('imageCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const ctx = imageCanvas.getContext('2d');

    let currentImage = null;

    // Handle file upload via click
    dropZone.addEventListener('click', () => fileInput.click());

    // Handle file upload via drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500');
        dropZone.classList.remove('border-gray-300');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500');
        dropZone.classList.add('border-gray-300');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500');
        dropZone.classList.add('border-gray-300');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImage(file);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImage(file);
        }
    });

    // Handle corner radius changes
    cornerRadius.addEventListener('input', () => {
        radiusValue.textContent = cornerRadius.value;
        if (currentImage) {
            applyCornerRadius();
        }
    });

    // Handle image processing
    function handleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImage = new Image();
            currentImage.onload = () => {
                applyCornerRadius();
                enableButtons();
            };
            currentImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function enableButtons() {
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('bg-gray-300');
        downloadBtn.classList.add('bg-blue-600');
        
        copyBtn.disabled = false;
        copyBtn.classList.remove('bg-gray-300');
        copyBtn.classList.add('bg-gray-600');
    }

    function applyCornerRadius() {
        // Set canvas size to match image
        imageCanvas.width = currentImage.width;
        imageCanvas.height = currentImage.height;

        // Clear canvas
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

        // Draw rounded rectangle
        ctx.save();
        roundRect(ctx, 0, 0, imageCanvas.width, imageCanvas.height, parseInt(cornerRadius.value));
        ctx.clip();

        // Draw image
        ctx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);
        ctx.restore();

        // Update preview
        imagePreview.src = imageCanvas.toDataURL();
        imagePreview.style.display = 'block';
    }

    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Handle image download
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'rounded-image.png';
        link.href = imageCanvas.toDataURL();
        link.click();
    });

    // Handle copy to clipboard
    copyBtn.addEventListener('click', async () => {
        try {
            const blob = await new Promise(resolve => imageCanvas.toBlob(resolve));
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);
            
            // Visual feedback
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.remove('bg-gray-600');
            copyBtn.classList.add('bg-green-600');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('bg-green-600');
                copyBtn.classList.add('bg-gray-600');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy image:', err);
            
            // Error feedback
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Failed to copy';
            copyBtn.classList.remove('bg-gray-600');
            copyBtn.classList.add('bg-red-600');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('bg-red-600');
                copyBtn.classList.add('bg-gray-600');
            }, 2000);
        }
    });
});
