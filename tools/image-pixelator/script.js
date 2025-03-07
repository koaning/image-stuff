document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const pixelSize = document.getElementById('pixelSize');
    const pixelSizeValue = document.getElementById('pixelSizeValue');
    const imageContainer = document.getElementById('imageContainer');
    const imageCanvas = document.getElementById('imageCanvas');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');

    const imgCtx = imageCanvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');

    let currentImage = null;
    let points = [];
    let lastCompletedPolygon = null;
    let originalImageData = null;
    let isDrawing = false;
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 150; // ms

    // Initialize values
    pixelSizeValue.textContent = pixelSize.value;

    // Function to store the original image data
    function storeOriginalImage() {
        if (!currentImage) return;
        originalImageData = imgCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    }

    // Function to restore the original image
    function restoreOriginalImage() {
        if (!originalImageData) return;
        imgCtx.putImageData(originalImageData, 0, 0);
    }

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

    function handleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImage = new Image();
            currentImage.onload = () => {
                // Reset state
                points = [];
                lastCompletedPolygon = null;
                undoBtn.disabled = true;
                clearBtn.disabled = true;

                // Set up canvases
                const width = currentImage.width;
                const height = currentImage.height;
                
                // Scale down the image if it's too large
                const maxWidth = Math.min(800, window.innerWidth - 40);
                const maxHeight = 600;
                let scaledWidth = width;
                let scaledHeight = height;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    scaledWidth = width * ratio;
                    scaledHeight = height * ratio;
                }
                
                imageCanvas.width = scaledWidth;
                imageCanvas.height = scaledHeight;
                overlayCanvas.width = scaledWidth;
                overlayCanvas.height = scaledHeight;
                
                // Clear canvas with transparency
                imgCtx.clearRect(0, 0, scaledWidth, scaledHeight);
                
                // Draw initial image with proper scaling
                imgCtx.drawImage(currentImage, 0, 0, scaledWidth, scaledHeight);
                
                // Store the original image data
                storeOriginalImage();
                
                // Enable download button
                downloadBtn.disabled = false;
                downloadBtn.classList.remove('bg-gray-300');
                downloadBtn.classList.add('bg-indigo-600');
            };
            currentImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Update the pixelation when slider changes
    pixelSize.addEventListener('input', () => {
        pixelSizeValue.textContent = pixelSize.value;
        if (lastCompletedPolygon && lastCompletedPolygon.length >= 3) {
            restoreOriginalImage();
            applyPixelation(lastCompletedPolygon);
        }
    });

    function applyPixelation(polygonPoints) {
        if (!polygonPoints || polygonPoints.length < 3) return;

        // Create a temporary canvas for the mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = imageCanvas.width;
        maskCanvas.height = imageCanvas.height;
        const maskCtx = maskCanvas.getContext('2d');

        // Draw the polygon mask
        maskCtx.beginPath();
        maskCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
        for (let i = 1; i < polygonPoints.length; i++) {
            maskCtx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
        }
        maskCtx.closePath();
        maskCtx.fill();

        // Apply pixelation
        const size = parseInt(pixelSize.value);
        const imageData = imgCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const pixels = imageData.data;
        const mask = maskData.data;

        // Calculate boundaries of the polygon
        let minX = imageCanvas.width;
        let minY = imageCanvas.height;
        let maxX = 0;
        let maxY = 0;

        polygonPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });

        // Adjust to block size
        minX = Math.floor(minX / size) * size;
        minY = Math.floor(minY / size) * size;
        maxX = Math.ceil(maxX / size) * size;
        maxY = Math.ceil(maxY / size) * size;

        // For each block in the bounded area
        for (let blockY = minY; blockY < maxY; blockY += size) {
            for (let blockX = minX; blockX < maxX; blockX += size) {
                let r = 0, g = 0, b = 0, a = 0;
                let totalWeight = 0;

                // Sample the block
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const pixelX = blockX + x;
                        const pixelY = blockY + y;
                        
                        if (pixelX >= imageCanvas.width || pixelY >= imageCanvas.height) continue;

                        const i = (pixelY * imageCanvas.width + pixelX) * 4;
                        
                        // Only include pixels inside the polygon
                        if (mask[i + 3] > 0) {
                            // Use the pixel's alpha as a weight
                            const weight = pixels[i + 3] / 255;
                            if (weight > 0) {
                                r += pixels[i] * weight;
                                g += pixels[i + 1] * weight;
                                b += pixels[i + 2] * weight;
                                a += pixels[i + 3];
                                totalWeight += weight;
                            }
                        }
                    }
                }

                // If we found visible pixels inside the polygon
                if (totalWeight > 0) {
                    const avgR = r / totalWeight;
                    const avgG = g / totalWeight;
                    const avgB = b / totalWeight;
                    const avgA = a / (size * size);  // Keep original alpha distribution

                    // Apply the averaged color to the block
                    for (let y = 0; y < size; y++) {
                        for (let x = 0; x < size; x++) {
                            const pixelX = blockX + x;
                            const pixelY = blockY + y;
                            
                            if (pixelX >= imageCanvas.width || pixelY >= imageCanvas.height) continue;

                            const i = (pixelY * imageCanvas.width + pixelX) * 4;
                            
                            // Only modify pixels inside the polygon
                            if (mask[i + 3] > 0) {
                                pixels[i] = avgR;
                                pixels[i + 1] = avgG;
                                pixels[i + 2] = avgB;
                                pixels[i + 3] = avgA;
                            }
                        }
                    }
                }
            }
        }

        imgCtx.putImageData(imageData, 0, 0);
    }

    // Handle polygon drawing
    overlayCanvas.addEventListener('click', (e) => {
        if (!currentImage) return;

        const rect = overlayCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking near the first point to close the polygon
        if (points.length > 2) {
            const firstPoint = points[0];
            const dx = x - firstPoint.x;
            const dy = y - firstPoint.y;
            if (Math.sqrt(dx * dx + dy * dy) < 10) {
                completePolygon();
                return;
            }
        }

        points.push({ x, y });
        drawOverlay();
        
        undoBtn.disabled = points.length === 0;
        clearBtn.disabled = points.length === 0;
    });

    overlayCanvas.addEventListener('mousemove', (e) => {
        if (!currentImage || points.length === 0) return;

        const rect = overlayCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        drawOverlay(x, y);
    });

    // Undo last point
    undoBtn.addEventListener('click', () => {
        points.pop();
        drawOverlay();
        undoBtn.disabled = points.length === 0;
        clearBtn.disabled = points.length === 0;
    });

    // Clear selection
    clearBtn.addEventListener('click', () => {
        points = [];
        lastCompletedPolygon = null;
        restoreOriginalImage();
        drawOverlay();
        undoBtn.disabled = true;
        clearBtn.disabled = true;
    });

    // Handle image download
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'pixelated-image.png';
        link.href = imageCanvas.toDataURL('image/png');
        link.click();
    });

    function drawOverlay(mouseX, mouseY) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        if (points.length === 0) return;

        // Set styles for the polygon
        overlayCtx.strokeStyle = 'rgba(33, 150, 243, 0.8)';
        overlayCtx.lineWidth = 2;
        overlayCtx.lineJoin = 'round';

        // Draw the polygon
        overlayCtx.beginPath();
        overlayCtx.moveTo(points[0].x, points[0].y);
        
        // Draw lines between points
        for (let i = 1; i < points.length; i++) {
            overlayCtx.lineTo(points[i].x, points[i].y);
        }

        // If mouse position is provided, draw line to current mouse position
        if (mouseX !== undefined && mouseY !== undefined) {
            overlayCtx.lineTo(mouseX, mouseY);
            
            // If we have more than 2 points, draw a preview line back to the first point
            // when the mouse is close to it
            if (points.length > 2) {
                const firstPoint = points[0];
                const dx = mouseX - firstPoint.x;
                const dy = mouseY - firstPoint.y;
                if (Math.sqrt(dx * dx + dy * dy) < 20) {
                    overlayCtx.lineTo(firstPoint.x, firstPoint.y);
                    
                    // Highlight the first point
                    overlayCtx.fillStyle = 'rgba(76, 175, 80, 0.5)';
                    overlayCtx.beginPath();
                    overlayCtx.arc(firstPoint.x, firstPoint.y, 10, 0, Math.PI * 2);
                    overlayCtx.fill();
                }
            }
        }

        // Stroke the polygon
        overlayCtx.stroke();

        // Draw points
        points.forEach((point, index) => {
            overlayCtx.fillStyle = index === 0 ? '#4CAF50' : '#2196F3';
            overlayCtx.strokeStyle = 'white';
            overlayCtx.lineWidth = 2;
            
            overlayCtx.beginPath();
            overlayCtx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            overlayCtx.fill();
            overlayCtx.stroke();
        });
    }

    function completePolygon() {
        if (points.length < 3) return;
        
        // Store the completed polygon
        lastCompletedPolygon = [...points];
        
        // Apply the pixelation effect
        restoreOriginalImage();
        applyPixelation(lastCompletedPolygon);
        
        // Reset the current points and update UI
        points = [];
        drawOverlay();
        undoBtn.disabled = true;
        clearBtn.disabled = true;
    }

    // Debounced update function
    const debouncedUpdate = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            completePolygon();
        }, DEBOUNCE_DELAY);
    };
});
