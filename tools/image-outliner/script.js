document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const outlineWidth = document.getElementById('outlineWidth');
    const outlineColor = document.getElementById('outlineColor');
    const widthValue = document.getElementById('widthValue');
    const colorValue = document.getElementById('colorValue');
    const imagePreview = document.getElementById('imagePreview');
    const imageCanvas = document.getElementById('imageCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    const ctx = imageCanvas.getContext('2d');

    let currentImage = null;
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 150; // ms

    // Initialize values
    widthValue.textContent = outlineWidth.value;
    colorValue.textContent = outlineColor.value.toUpperCase();

    // Handle file upload via click
    dropZone.addEventListener('click', () => fileInput.click());

    // Handle file upload via drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500');
        dropZone.classList.remove('border-gray-300');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-500');
        dropZone.classList.add('border-gray-300');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500');
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

    // Debounced input handlers
    const debouncedUpdate = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (currentImage) {
                applyOutline();
            }
        }, DEBOUNCE_DELAY);
    };

    outlineWidth.addEventListener('input', () => {
        widthValue.textContent = outlineWidth.value;
        debouncedUpdate();
    });

    outlineColor.addEventListener('input', () => {
        colorValue.textContent = outlineColor.value.toUpperCase();
        debouncedUpdate();
    });

    function handleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImage = new Image();
            currentImage.onload = () => {
                applyOutline();
                enableButtons();
            };
            currentImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function enableButtons() {
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('bg-gray-300');
        downloadBtn.classList.add('bg-indigo-600');
    }

    function applyOutline() {
        const width = parseInt(outlineWidth.value);
        const color = outlineColor.value;
        
        // Set canvas size to accommodate outline
        imageCanvas.width = currentImage.width + (width * 2);
        imageCanvas.height = currentImage.height + (width * 2);

        // Clear canvas and set background to transparent
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

        if (width > 0) {
            // First pass: Draw the outline shape
            const steps = 360;
            const centerX = width;
            const centerY = width;

            // Draw the image multiple times with slight offsets
            for (let i = 0; i < steps; i++) {
                const angle = (i * 2 * Math.PI) / steps;
                ctx.drawImage(
                    currentImage,
                    centerX + Math.sin(angle) * width,
                    centerY + Math.cos(angle) * width
                );
            }

            // Change composite operation to convert the overlapping images into a solid shape
            ctx.globalCompositeOperation = 'source-in';
            
            // Fill with the outline color
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);

            // Reset composite operation
            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw the original image in the center
        ctx.drawImage(currentImage, width, width);

        // Update preview using requestAnimationFrame
        requestAnimationFrame(() => {
            imagePreview.src = imageCanvas.toDataURL();
            imagePreview.style.display = 'block';
        });
    }

    // Handle image download
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'outlined-image.png';
        link.href = imageCanvas.toDataURL();
        link.click();
    });
});
