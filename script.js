// F4ZE Editor - Main Script
document.addEventListener('DOMContentLoaded', () => {
    // Canvas Setup
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set initial canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Initialize application state
    const state = {
        currentTool: 'brush',
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        brushSize: 5,
        brushColor: '#000000',
        currentShape: 'rectangle',
        currentFilter: 'none',
        brightness: 0,
        contrast: 0,
        saturation: 0,
        layers: [],
        currentLayerIndex: 0,
        history: [],
        historyIndex: -1,
        maxHistorySteps: 20,
        cropActive: false,
        cropStartX: 0,
        cropStartY: 0,
        cropEndX: 0,
        cropEndY: 0,
        textMode: false,
        textPosition: { x: 0, y: 0 },
        canvasScale: 1,
        canvasOffset: { x: 0, y: 0 },
        originalImage: null
    };
    
    // Layer class
    class Layer {
        constructor(name) {
            this.name = name;
            this.canvas = document.createElement('canvas');
            this.canvas.width = canvas.width;
            this.canvas.height = canvas.height;
            this.context = this.canvas.getContext('2d');
            this.visible = true;
        }
        
        resize(width, height) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.canvas, 0, 0, width, height);
            
            this.canvas.width = width;
            this.canvas.height = height;
            this.context.drawImage(tempCanvas, 0, 0);
        }
    }
    
    // Initialize first layer
    function initLayers() {
        const backgroundLayer = new Layer('Background');
        backgroundLayer.context.fillStyle = '#ffffff';
        backgroundLayer.context.fillRect(0, 0, canvas.width, canvas.height);
        
        state.layers.push(backgroundLayer);
        state.currentLayerIndex = 0;
        
        updateLayersList();
        saveToHistory();
    }
    
    // Update canvas with all visible layers
    function updateCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw all visible layers
        state.layers.forEach(layer => {
            if (layer.visible) {
                ctx.drawImage(layer.canvas, 0, 0);
            }
        });
        
        // Apply current adjustments
        applyAdjustments();
    }
    
    // Apply current brightness, contrast, saturation, and filter settings
    function applyAdjustments() {
        if (state.brightness !== 0 || state.contrast !== 0 || state.saturation !== 0 || state.currentFilter !== 'none') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                // Apply brightness
                if (state.brightness !== 0) {
                    data[i] = Math.min(255, Math.max(0, data[i] + state.brightness * 2.55));
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + state.brightness * 2.55));
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + state.brightness * 2.55));
                }
                
                // Apply contrast
                if (state.contrast !== 0) {
                    const factor = (259 * (state.contrast + 100)) / (100 * (259 - state.contrast));
                    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
                }
                
                // Apply saturation
                if (state.saturation !== 0) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const factor = 1 + state.saturation / 100;
                    
                    data[i] = Math.min(255, Math.max(0, avg + factor * (data[i] - avg)));
                    data[i + 1] = Math.min(255, Math.max(0, avg + factor * (data[i + 1] - avg)));
                    data[i + 2] = Math.min(255, Math.max(0, avg + factor * (data[i + 2] - avg)));
                }
                
                // Apply filters
                switch (state.currentFilter) {
                    case 'grayscale':
                        const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
                        data[i] = data[i + 1] = data[i + 2] = gray;
                        break;
                    case 'sepia':
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                        break;
                    case 'invert':
                        data[i] = 255 - data[i];
                        data[i + 1] = 255 - data[i + 1];
                        data[i + 2] = 255 - data[i + 2];
                        break;
                    case 'blur':
                        // This is a simplified blur, actual implementation would be more complex
                        if (i > 0 && i < data.length - 4) {
                            data[i] = (data[i - 4] + data[i] + data[i + 4]) / 3;
                            data[i + 1] = (data[i - 3] + data[i + 1] + data[i + 5]) / 3;
                            data[i + 2] = (data[i - 2] + data[i + 2] + data[i + 6]) / 3;
                        }
                        break;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
        }
    }
    
    // Save current state to history
    function saveToHistory() {
        // If we're in the middle of the history and making a new change, remove future states
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        // Create deep copy of layers
        const layersCopy = state.layers.map(layer => {
            const newLayer = new Layer(layer.name);
            newLayer.context.drawImage(layer.canvas, 0, 0);
            newLayer.visible = layer.visible;
            return newLayer;
        });
        
        // Add to history
        state.history.push({
            layers: layersCopy,
            currentLayerIndex: state.currentLayerIndex,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
        });
        
        // Limit history size
        if (state.history.length > state.maxHistorySteps) {
            state.history.shift();
        } else {
            state.historyIndex++;
        }
        
        // Update undo/redo buttons
        updateUndoRedoButtons();
    }
    
    // Restore state from history
    function restoreFromHistory(index) {
        if (index >= 0 && index < state.history.length) {
            const historyItem = state.history[index];
            
            // Restore canvas size if it changed
            if (canvas.width !== historyItem.canvasWidth || canvas.height !== historyItem.canvasHeight) {
                canvas.width = historyItem.canvasWidth;
                canvas.height = historyItem.canvasHeight;
            }
            
            // Restore layers
            state.layers = historyItem.layers.map(layer => {
                const newLayer = new Layer(layer.name);
                newLayer.context.drawImage(layer.canvas, 0, 0);
                newLayer.visible = layer.visible;
                return newLayer;
            });
            
            state.currentLayerIndex = historyItem.currentLayerIndex;
            state.historyIndex = index;
            
            updateLayersList();
            updateCanvas();
            updateUndoRedoButtons();
        }
    }
    
    // Update undo/redo buttons
    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        undoBtn.disabled = state.historyIndex <= 0;
        redoBtn.disabled = state.historyIndex >= state.history.length - 1;
    }
    
    // Get current layer
    function getCurrentLayer() {
        return state.layers[state.currentLayerIndex];
    }
    
    // Update layers list in UI
    function updateLayersList() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
        
        state.layers.forEach((layer, index) => {
            const li = document.createElement('li');
            li.className = `layer-item ${index === state.currentLayerIndex ? 'active' : ''}`;
            li.dataset.index = index;
            
            const visibilityIcon = document.createElement('span');
            visibilityIcon.className = 'layer-visibility';
            visibilityIcon.innerHTML = layer.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            
            const layerName = document.createElement('span');
            layerName.className = 'layer-name';
            layerName.textContent = layer.name;
            
            const layerActions = document.createElement('div');
            layerActions.className = 'layer-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete layer';
            deleteBtn.disabled = state.layers.length <= 1;
            
            layerActions.appendChild(deleteBtn);
            
            li.appendChild(visibilityIcon);
            li.appendChild(layerName);
            li.appendChild(layerActions);
            
            layersList.appendChild(li);
            
            // Event listeners
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-actions') && !e.target.closest('.layer-visibility')) {
                    state.currentLayerIndex = index;
                    updateLayersList();
                }
            });
            
            visibilityIcon.addEventListener('click', () => {
                layer.visible = !layer.visible;
                updateLayersList();
                updateCanvas();
            });
            
            deleteBtn.addEventListener('click', () => {
                if (state.layers.length > 1) {
                    state.layers.splice(index, 1);
                    if (state.currentLayerIndex >= state.layers.length) {
                        state.currentLayerIndex = state.layers.length - 1;
                    }
                    updateLayersList();
                    updateCanvas();
                    saveToHistory();
                }
            });
        });
    }
    
    // Add a new layer
    function addNewLayer() {
        const layerName = `Layer ${state.layers.length + 1}`;
        const newLayer = new Layer(layerName);
        
        state.layers.push(newLayer);
        state.currentLayerIndex = state.layers.length - 1;
        
        updateLayersList();
        updateCanvas();
        saveToHistory();
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (state.textMode || state.cropActive) return;
        
        const { offsetX, offsetY } = getCanvasCoordinates(e);
        
        state.isDrawing = true;
        state.lastX = offsetX;
        state.lastY = offsetY;
        
        // If using shape tool, prepare for shape drawing
        if (state.currentTool === 'shape') {
            state.cropStartX = offsetX;
            state.cropStartY = offsetY;
        }
    }
    
    function draw(e) {
        if (!state.isDrawing) return;
        
        const { offsetX, offsetY } = getCanvasCoordinates(e);
        const currentLayer = getCurrentLayer();
        
        switch (state.currentTool) {
            case 'brush':
                drawBrush(currentLayer.context, state.lastX, state.lastY, offsetX, offsetY);
                break;
            case 'eraser':
                erase(currentLayer.context, state.lastX, state.lastY, offsetX, offsetY);
                break;
            case 'shape':
                // For shapes, just update end position, will draw on stopDrawing
                state.cropEndX = offsetX;
                state.cropEndY = offsetY;
                
                // Preview shape
                updateCanvas();
                previewShape(ctx, state.cropStartX, state.cropStartY, state.cropEndX, state.cropEndY);
                break;
        }
        
        state.lastX = offsetX;
        state.lastY = offsetY;
        
        if (state.currentTool !== 'shape') {
            updateCanvas();
        }
    }
    
    function stopDrawing() {
        if (!state.isDrawing) return;
        
        const currentLayer = getCurrentLayer();
        
        // If drawing a shape, finalize it
        if (state.currentTool === 'shape') {
            drawShape(
                currentLayer.context, 
                state.cropStartX, 
                state.cropStartY, 
                state.cropEndX, 
                state.cropEndY
            );
        }
        
        state.isDrawing = false;
        updateCanvas();
        saveToHistory();
    }
    
    function drawBrush(context, x1, y1, x2, y2) {
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.lineWidth = state.brushSize;
        context.strokeStyle = state.brushColor;
        
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
    }
    
    function erase(context, x1, y1, x2, y2) {
        context.globalCompositeOperation = 'destination-out';
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.lineWidth = state.brushSize;
        
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        
        context.globalCompositeOperation = 'source-over';
    }
    
    function previewShape(context, startX, startY, endX, endY) {
        context.strokeStyle = state.brushColor;
        context.lineWidth = state.brushSize;
        context.setLineDash([5, 5]);
        
        switch (state.currentShape) {
            case 'rectangle':
                context.strokeRect(
                    Math.min(startX, endX),
                    Math.min(startY, endY),
                    Math.abs(endX - startX),
                    Math.abs(endY - startY)
                );
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                context.beginPath();
                context.arc(startX, startY, radius, 0, Math.PI * 2);
                context.stroke();
                break;
            case 'line':
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                context.stroke();
                break;
        }
        
        context.setLineDash([]);
    }
    
    function drawShape(context, startX, startY, endX, endY) {
        context.strokeStyle = state.brushColor;
        context.fillStyle = state.brushColor;
        context.lineWidth = state.brushSize;
        
        switch (state.currentShape) {
            case 'rectangle':
                context.strokeRect(
                    Math.min(startX, endX),
                    Math.min(startY, endY),
                    Math.abs(endX - startX),
                    Math.abs(endY - startY)
                );
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                context.beginPath();
                context.arc(startX, startY, radius, 0, Math.PI * 2);
                context.stroke();
                break;
            case 'line':
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                context.stroke();
                break;
        }
    }
    
    // Text functions
    function startTextInput(e) {
        const { offsetX, offsetY } = getCanvasCoordinates(e);
        const textInputContainer = document.getElementById('text-input-container');
        const textInput = document.getElementById('text-input');
        
        state.textMode = true;
        state.textPosition = { x: offsetX, y: offsetY };
        
        textInputContainer.style.left = `${offsetX}px`;
        textInputContainer.style.top = `${offsetY}px`;
        textInputContainer.classList.remove('hidden');
        
        textInput.value = '';
        textInput.focus();
    }
    
    function applyText() {
        const textInput = document.getElementById('text-input');
        const text = textInput.value.trim();
        
        if (text) {
            const currentLayer = getCurrentLayer();
            const fontFamily = document.getElementById('font-family').value;
            const fontSize = document.getElementById('font-size').value;
            
            currentLayer.context.font = `${fontSize}px ${fontFamily}`;
            currentLayer.context.fillStyle = state.brushColor;
            currentLayer.context.textBaseline = 'top';
            
            // Split text into lines and render
            const lines = text.split('\n');
            lines.forEach((line, index) => {
                currentLayer.context.fillText(line, state.textPosition.x, state.textPosition.y + (index * fontSize * 1.2));
            });
            
            saveToHistory();
            updateCanvas();
        }
        
        cancelText();
    }
    
    function cancelText() {
        document.getElementById('text-input-container').classList.add('hidden');
        state.textMode = false;
    }
    
    // Image operations
    function cropImage() {
        const cropOverlay = document.getElementById('crop-overlay');
        
        if (state.cropActive) {
            // Apply crop
            const currentLayer = getCurrentLayer();
            const startX = Math.min(state.cropStartX, state.cropEndX);
            const startY = Math.min(state.cropStartY, state.cropEndY);
            const width = Math.abs(state.cropEndX - state.cropStartX);
            const height = Math.abs(state.cropEndY - state.cropStartY);
            
            // Create a temporary canvas to hold the cropped area
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // For each layer
            state.layers.forEach(layer => {
                if (layer.visible) {
                    tempCtx.drawImage(
                        layer.canvas, 
                        startX, startY, width, height, 
                        0, 0, width, height
                    );
                }
            });
            
            // Resize the main canvas to the crop size
            canvas.width = width;
            canvas.height = height;
            
            // Resize all layers and clear them
            state.layers.forEach(layer => {
                const oldCanvas = layer.canvas;
                layer.canvas = document.createElement('canvas');
                layer.canvas.width = width;
                layer.canvas.height = height;
                layer.context = layer.canvas.getContext('2d');
            });
            
            // Draw the cropped content onto the background layer
            const backgroundLayer = state.layers[0];
            backgroundLayer.context.drawImage(tempCanvas, 0, 0);
            
            // Reset crop state
            state.cropActive = false;
            cropOverlay.classList.add('hidden');
            
            // Update and save history
            updateCanvas();
            saveToHistory();
        } else {
            // Start crop
            state.cropActive = true;
            state.cropStartX = 0;
            state.cropStartY = 0;
            state.cropEndX = canvas.width;
            state.cropEndY = canvas.height;
            
            cropOverlay.style.left = '0';
            cropOverlay.style.top = '0';
            cropOverlay.style.width = `${canvas.width}px`;
            cropOverlay.style.height = `${canvas.height}px`;
            cropOverlay.classList.remove('hidden');
            
            // Create handles for resizing
            createCropHandles(cropOverlay);
        }
    }
    
    function createCropHandles(overlay) {
        // Remove existing handles
        const existingHandles = overlay.querySelectorAll('.crop-handle');
        existingHandles.forEach(handle => handle.remove());
        
        // Create new handles
        const positions = [
            { top: '0', left: '0', cursor: 'nwse-resize' },
            { top: '0', left: '50%', cursor: 'ns-resize' },
            { top: '0', right: '0', cursor: 'nesw-resize' },
            { top: '50%', left: '0', cursor: 'ew-resize' },
            { top: '50%', right: '0', cursor: 'ew-resize' },
            { bottom: '0', left: '0', cursor: 'nesw-resize' },
            { bottom: '0', left: '50%', cursor: 'ns-resize' },
            { bottom: '0', right: '0', cursor: 'nwse-resize' }
        ];
        
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = 'crop-handle';
            Object.keys(pos).forEach(key => {
                handle.style[key] = pos[key];
            });
            handle.style.transform = 'translate(-50%, -50%)';
            handle.style.cursor = pos.cursor;
            overlay.appendChild(handle);
        });
    }
    
    function rotateImage(clockwise = true) {
        const angle = clockwise ? 90 : -90;
        
        // Create a temporary canvas
        const tempCanvas = document.createElement('canvas');
        
        // Swap width and height for rotation
        tempCanvas.width = canvas.height;
        tempCanvas.height = canvas.width;
        
        const tempCtx = tempCanvas.getContext('2d');
        
        // Move to center, rotate, and draw
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(angle * Math.PI / 180);
        tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        
        // Update canvas dimensions
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;
        canvas.width = oldHeight;
        canvas.height = oldWidth;
        
        // Resize all layers
        state.layers.forEach(layer => {
            const layerTemp = document.createElement('canvas');
            layerTemp.width = tempCanvas.width;
            layerTemp.height = tempCanvas.height;
            const layerTempCtx = layerTemp.getContext('2d');
            
            layerTempCtx.translate(layerTemp.width / 2, layerTemp.height / 2);
            layerTempCtx.rotate(angle * Math.PI / 180);
            layerTempCtx.drawImage(layer.canvas, -layer.canvas.width / 2, -layer.canvas.height / 2);
            
            layer.canvas.width = tempCanvas.width;
            layer.canvas.height = tempCanvas.height;
            layer.context.drawImage(layerTemp, 0, 0);
        });
        
        updateCanvas();
        saveToHistory();
    }
    
    function flipImage(horizontal = true) {
        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw flipped image
        tempCtx.translate(horizontal ? canvas.width : 0, horizontal ? 0 : canvas.height);
        tempCtx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
        tempCtx.drawImage(canvas, 0, 0);
        
        // Update all layers
        state.layers.forEach(layer => {
            const layerTemp = document.createElement('canvas');
            layerTemp.width = canvas.width;
            layerTemp.height = canvas.height;
            const layerTempCtx = layerTemp.getContext('2d');
            
            layerTempCtx.translate(horizontal ? canvas.width : 0, horizontal ? 0 : canvas.height);
            layerTempCtx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
            layerTempCtx.drawImage(layer.canvas, 0, 0);
            
            layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.context.drawImage(layerTemp, 0, 0);
        });
        
        updateCanvas();
        saveToHistory();
    }
    
    function showResizeDialog() {
        const resizeDialog = document.getElementById('resize-dialog');
        const resizeWidth = document.getElementById('resize-width');
        const resizeHeight = document.getElementById('resize-height');
        
        resizeWidth.value = canvas.width;
        resizeHeight.value = canvas.height;
        
        resizeDialog.classList.remove('hidden');
    }
    
    function applyResize() {
        const resizeWidth = parseInt(document.getElementById('resize-width').value);
        const resizeHeight = parseInt(document.getElementById('resize-height').value);
        
        if (resizeWidth > 0 && resizeHeight > 0) {
            // Resize all layers
            state.layers.forEach(layer => {
                layer.resize(resizeWidth, resizeHeight);
            });
            
            // Update canvas size
            canvas.width = resizeWidth;
            canvas.height = resizeHeight;
            
            updateCanvas();
            saveToHistory();
        }
        
        document.getElementById('resize-dialog').classList.add('hidden');
    }
    
    function cancelResize() {
        document.getElementById('resize-dialog').classList.add('hidden');
    }
    
    // File operations
    function createNewImage() {
        // Reset canvas to default size
        canvas.width = 800;
        canvas.height = 600;
        
        // Reset layers
        state.layers = [];
        initLayers();
        
        // Reset adjustment values
        resetAdjustments();
        
        // Reset history
        state.history = [];
        state.historyIndex = -1;
        
        updateCanvas();
        saveToHistory();
        
        showNotification('New image created');
    }
    
    function uploadImage() {
        const uploadInput = document.getElementById('upload-input');
        uploadInput.click();
    }
    
    function handleImageUpload() {
        const uploadInput = document.getElementById('upload-input');
        const file = uploadInput.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = new Image();
                
                img.onload = function() {
                    // Reset canvas to image size
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Reset layers
                    state.layers = [];
                    
                    // Create background layer with image
                    const backgroundLayer = new Layer('Background');
                    backgroundLayer.context.drawImage(img, 0, 0);
                    state.layers.push(backgroundLayer);
                    state.currentLayerIndex = 0;
                    
                    // Save original image
                    state.originalImage = img;
                    
                    // Reset adjustment values
                    resetAdjustments();
                    
                    // Reset history
                    state.history = [];
                    state.historyIndex = -1;
                    
                    updateLayersList();
                    updateCanvas();
                    saveToHistory();
                    
                    showNotification('Image uploaded successfully');
                };
                
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        }
    }
    
    function saveImage() {
        // Create a copy of the canvas with all adjustments applied
        const dataURL = canvas.toDataURL('image/png');
        
        // Create a link element
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'f4ze_editor_image.png';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Image saved');
    }
    
    function exportImage() {
        // Create a dialog for export options
        const exportOptions = [
            { format: 'png', label: 'PNG (High Quality)' },
            { format: 'jpeg', label: 'JPEG (Smaller File)' },
            { format: 'webp', label: 'WebP (Modern Format)' }
        ];
        
        // Create a simple modal dialog
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'white';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.maxWidth = '300px';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Export Image';
        heading.style.marginBottom = '15px';
        
        modalContent.appendChild(heading);
        
        exportOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.label;
            button.style.display = 'block';
            button.style.width = '100%';
            button.style.marginBottom = '10px';
            button.style.padding = '10px';
            button.style.cursor = 'pointer';
            
            button.addEventListener('click', () => {
                let dataURL;
                
                if (option.format === 'jpeg') {
                    dataURL = canvas.toDataURL('image/jpeg', 0.9);
                } else if (option.format === 'webp') {
                    dataURL = canvas.toDataURL('image/webp', 0.9);
                } else {
                    dataURL = canvas.toDataURL('image/png');
                }
                
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = `f4ze_editor_image.${option.format}`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                document.body.removeChild(modal);
                
                showNotification(`Image exported as ${option.format.toUpperCase()}`);
            });
            
            modalContent.appendChild(button);
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.display = 'block';
        cancelButton.style.width = '100%';
        cancelButton.style.padding = '10px';
        cancelButton.style.cursor = 'pointer';
        
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modalContent.appendChild(cancelButton);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }
    
    // Helper functions
    function resetAdjustments() {
        state.brightness = 0;
        state.contrast = 0;
        state.saturation = 0;
        state.currentFilter = 'none';
        
        document.getElementById('brightness').value = 0;
        document.getElementById('brightness-value').textContent = 0;
        document.getElementById('contrast').value = 0;
        document.getElementById('contrast-value').textContent = 0;
        document.getElementById('saturation').value = 0;
        document.getElementById('saturation-value').textContent = 0;
        
        // Reset filter buttons
        document.querySelectorAll('.filter-options button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'none');
        });
    }
    
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        let offsetX, offsetY;
        
        if (e.type.includes('touch')) {
            // Handle touch events
            const touch = e.touches[0] || e.changedTouches[0];
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
        } else {
            // Handle mouse events
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        }
        
        // Account for canvas scaling
        offsetX = offsetX / state.canvasScale;
        offsetY = offsetY / state.canvasScale;
        
        return { offsetX, offsetY };
    }
    
    function showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    // Event listeners
    function initEventListeners() {
        // Canvas events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrawing(e);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            draw(e);
        });
        canvas.addEventListener('touchend', stopDrawing);
        
        // File operations
        document.getElementById('new-btn').addEventListener('click', createNewImage);
        document.getElementById('upload-btn').addEventListener('click', uploadImage);
        document.getElementById('upload-input').addEventListener('change', handleImageUpload);
        document.getElementById('save-btn').addEventListener('click', saveImage);
        document.getElementById('export-btn').addEventListener('click', exportImage);
        
        // Tools selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Deactivate text mode and crop if active
                if (state.textMode) {
                    cancelText();
                }
                
                if (state.cropActive && btn.dataset.tool !== 'crop') {
                    cropImage();
                }
                
                // Set active tool
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentTool = btn.dataset.tool;
                
                // Special handling for text tool
                if (state.currentTool === 'text') {
                    canvas.style.cursor = 'text';
                    
                    // One-time event listener for text placement
                    const textPlacementListener = (e) => {
                        startTextInput(e);
                        canvas.removeEventListener('click', textPlacementListener);
                        canvas.style.cursor = 'default';
                    };
                    
                    canvas.addEventListener('click', textPlacementListener);
                } else if (state.currentTool === 'crop') {
                    cropImage();
                } else if (state.currentTool === 'resize') {
                    showResizeDialog();
                } else if (state.currentTool === 'rotate') {
                    rotateImage(true);
                } else if (state.currentTool === 'flip') {
                    flipImage(true);
                } else if (state.currentTool === 'shape') {
                    // Show shape options
                    document.querySelector('.shape-options').classList.remove('hidden');
                } else {
                    canvas.style.cursor = 'default';
                    document.querySelector('.shape-options').classList.add('hidden');
                }
            });
        });
        
        // Shape selection
        document.querySelectorAll('.shape-options button').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentShape = btn.dataset.shape;
            });
        });
        
        // Text controls
        document.getElementById('apply-text').addEventListener('click', applyText);
        document.getElementById('cancel-text').addEventListener('click', cancelText);
        
        // Resize dialog
        document.getElementById('apply-resize').addEventListener('click', applyResize);
        document.getElementById('cancel-resize').addEventListener('click', cancelResize);
        
        // Maintain aspect ratio
        const resizeWidth = document.getElementById('resize-width');
        const resizeHeight = document.getElementById('resize-height');
        const maintainAspect = document.getElementById('maintain-aspect-ratio');
        
        resizeWidth.addEventListener('input', () => {
            if (maintainAspect.checked) {
                const aspectRatio = canvas.width / canvas.height;
                resizeHeight.value = Math.round(resizeWidth.value / aspectRatio);
            }
        });
        
        resizeHeight.addEventListener('input', () => {
            if (maintainAspect.checked) {
                const aspectRatio = canvas.width / canvas.height;
                resizeWidth.value = Math.round(resizeHeight.value * aspectRatio);
            }
        });
        
        // Add layer button
        document.getElementById('add-layer').addEventListener('click', addNewLayer);
        
        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (state.historyIndex > 0) {
                restoreFromHistory(state.historyIndex - 1);
            }
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            if (state.historyIndex < state.history.length - 1) {
                restoreFromHistory(state.historyIndex + 1);
            }
        });
        
        // Adjustment sliders
        const brightnessSlider = document.getElementById('brightness');
        const contrastSlider = document.getElementById('contrast');
        const saturationSlider = document.getElementById('saturation');
        
        brightnessSlider.addEventListener('input', () => {
            state.brightness = parseInt(brightnessSlider.value);
            document.getElementById('brightness-value').textContent = state.brightness;
            updateCanvas();
        });
        
        contrastSlider.addEventListener('input', () => {
            state.contrast = parseInt(contrastSlider.value);
            document.getElementById('contrast-value').textContent = state.contrast;
            updateCanvas();
        });
        
        saturationSlider.addEventListener('input', () => {
            state.saturation = parseInt(saturationSlider.value);
            document.getElementById('saturation-value').textContent = state.saturation;
            updateCanvas();
        });
        
        // Apply adjustments when slider is released
        brightnessSlider.addEventListener('change', saveToHistory);
        contrastSlider.addEventListener('change', saveToHistory);
        saturationSlider.addEventListener('change', saveToHistory);
        
        // Filter options
        document.querySelectorAll('.filter-options button').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-options button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.filter;
                updateCanvas();
                saveToHistory();
            });
        });
        
        // Brush size
        const brushSizeSlider = document.getElementById('brush-size');
        brushSizeSlider.addEventListener('input', () => {
            state.brushSize = parseInt(brushSizeSlider.value);
            document.getElementById('brush-size-value').textContent = `${state.brushSize}px`;
        });
        
        // Brush color
        const brushColorPicker = document.getElementById('brush-color');
        brushColorPicker.addEventListener('input', () => {
            state.brushColor = brushColorPicker.value;
        });
    }
    
    // Initialize the application
    function init() {
        initLayers();
        initEventListeners();
        updateUndoRedoButtons();
    }
    
    // Start the application
    init();
});
