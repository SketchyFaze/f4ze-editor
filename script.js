// F4ZE Editor - Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    const app = new F4ZEEditor();
    app.init();
});

class F4ZEEditor {
    constructor() {
        // Canvas elements
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Default settings
        this.currentTool = 'select';
        this.currentLayer = null;
        this.layers = [];
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySteps = 20;
        
        // Tool settings
        this.brushSize = 5;
        this.primaryColor = '#000000';
        this.secondaryColor = '#ffffff';
        this.currentShape = 'rectangle';
        this.fontFamily = 'Arial';
        this.fontSize = 16;
        this.fontBold = false;
        this.fontItalic = false;
        this.fontUnderline = false;
        
        // Adjustments
        this.brightness = 0;
        this.contrast = 0;
        this.saturation = 0;
        this.currentFilter = 'none';
        
        // Canvas state
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.zoomLevel = 1;
        this.isDragging = false;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;
        
        // Temporary canvas for drawing operations
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        // Selected objects
        this.selectedObject = null;
        this.selectionRect = null;
        
        // Text input state
        this.textInputActive = false;
        this.pendingTextAction = null;
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.showWelcomeModal();
    }
    
    setupCanvas() {
        // Set initial canvas size
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Set temp canvas size
        this.tempCanvas.width = this.canvasWidth;
        this.tempCanvas.height = this.canvasHeight;
        
        // Initialize with a blank white background layer
        this.addLayer('Background', true);
        this.fillLayer(this.layers[0], '#ffffff');
        
        // Update UI
        this.updateCanvasInfo();
    }
    
    setupEventListeners() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(button => {
            button.addEventListener('click', e => {
                this.setActiveTool(e.currentTarget.id.replace('-tool', ''));
            });
        });
        
        // Shape buttons
        document.querySelectorAll('.shape-btn').forEach(button => {
            button.addEventListener('click', e => {
                this.setActiveShape(e.currentTarget.id.replace('-shape', ''));
            });
        });
        
        // Canvas event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Color pickers
        document.getElementById('primary-color-picker').addEventListener('input', e => {
            this.primaryColor = e.target.value;
            document.getElementById('primary-color').style.backgroundColor = this.primaryColor;
        });
        
        document.getElementById('secondary-color-picker').addEventListener('input', e => {
            this.secondaryColor = e.target.value;
            document.getElementById('secondary-color').style.backgroundColor = this.secondaryColor;
        });
        
        // Color swatches
        document.querySelectorAll('.palette .color-swatch').forEach(swatch => {
            swatch.addEventListener('click', e => {
                this.primaryColor = e.target.dataset.color;
                document.getElementById('primary-color').style.backgroundColor = this.primaryColor;
                document.getElementById('primary-color-picker').value = this.primaryColor;
            });
            
            swatch.addEventListener('contextmenu', e => {
                e.preventDefault();
                this.secondaryColor = e.target.dataset.color;
                document.getElementById('secondary-color').style.backgroundColor = this.secondaryColor;
                document.getElementById('secondary-color-picker').value = this.secondaryColor;
            });
        });
        
        // Brush size slider
        document.getElementById('brush-size').addEventListener('input', e => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brush-size-value').textContent = `${this.brushSize}px`;
        });
        
        // Adjustment sliders
        document.getElementById('brightness').addEventListener('input', e => {
            this.brightness = parseInt(e.target.value);
            document.getElementById('brightness-value').textContent = this.brightness;
            this.applyAdjustments();
        });
        
        document.getElementById('contrast').addEventListener('input', e => {
            this.contrast = parseInt(e.target.value);
            document.getElementById('contrast-value').textContent = this.contrast;
            this.applyAdjustments();
        });
        
        document.getElementById('saturation').addEventListener('input', e => {
            this.saturation = parseInt(e.target.value);
            document.getElementById('saturation-value').textContent = this.saturation;
            this.applyAdjustments();
        });
        
        // Filter items
        document.querySelectorAll('.filter-item').forEach(item => {
            item.addEventListener('click', e => {
                const filter = e.currentTarget.dataset.filter;
                this.setFilter(filter);
            });
        });
        
        // Zoom controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.zoom(0.1);
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.zoom(-0.1);
        });
        
        // Layer controls
        document.getElementById('add-layer-btn').addEventListener('click', () => {
            this.addLayer(`Layer ${this.layers.length + 1}`);
        });
        
        document.getElementById('delete-layer-btn').addEventListener('click', () => {
            if (this.currentLayer && this.layers.length > 1) {
                this.deleteLayer(this.currentLayer);
            }
        });
        
        // Text controls
        document.getElementById('font-family').addEventListener('change', e => {
            this.fontFamily = e.target.value;
            if (this.selectedObject && this.selectedObject.type === 'text') {
                this.selectedObject.fontFamily = this.fontFamily;
                this.renderLayers();
            }
        });
        
        document.getElementById('font-size').addEventListener('input', e => {
            this.fontSize = parseInt(e.target.value);
            if (this.selectedObject && this.selectedObject.type === 'text') {
                this.selectedObject.fontSize = this.fontSize;
                this.renderLayers();
            }
        });
        
        document.getElementById('bold-text').addEventListener('click', e => {
            this.fontBold = !this.fontBold;
            e.currentTarget.classList.toggle('active');
            if (this.selectedObject && this.selectedObject.type === 'text') {
                this.selectedObject.bold = this.fontBold;
                this.renderLayers();
            }
        });
        
        document.getElementById('italic-text').addEventListener('click', e => {
            this.fontItalic = !this.fontItalic;
            e.currentTarget.classList.toggle('active');
            if (this.selectedObject && this.selectedObject.type === 'text') {
                this.selectedObject.italic = this.fontItalic;
                this.renderLayers();
            }
        });
        
        document.getElementById('underline-text').addEventListener('click', e => {
            this.fontUnderline = !this.fontUnderline;
            e.currentTarget.classList.toggle('active');
            if (this.selectedObject && this.selectedObject.type === 'text') {
                this.selectedObject.underline = this.fontUnderline;
                this.renderLayers();
            }
        });
        
        // File operations
        document.getElementById('new-project-btn').addEventListener('click', () => {
            this.showWelcomeModal();
        });
        
        document.getElementById('create-new-canvas').addEventListener('click', () => {
            const width = parseInt(document.getElementById('canvas-width').value);
            const height = parseInt(document.getElementById('canvas-height').value);
            const background = document.getElementById('canvas-background').value;
            
            if (width && height) {
                this.createNewCanvas(width, height, background);
                document.getElementById('welcome-modal').style.display = 'none';
            }
        });
        
        document.getElementById('open-file-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('open-existing-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
            document.getElementById('welcome-modal').style.display = 'none';
        });
        
        document.getElementById('file-input').addEventListener('change', e => {
            if (e.target.files.length > 0) {
                this.loadImageFromFile(e.target.files[0]);
            }
        });
        
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveToLocalStorage();
        });
        
        document.getElementById('export-png').addEventListener('click', () => {
            this.exportImage('png');
        });
        
        document.getElementById('export-jpg').addEventListener('click', () => {
            this.exportImage('jpeg');
        });
        
        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            this.redo();
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', e => {
                e.currentTarget.closest('.modal').style.display = 'none';
            });
        });
        
        // Text input modal
        document.getElementById('confirm-text-btn').addEventListener('click', () => {
            const text = document.getElementById('text-input').value;
            if (text && this.pendingTextAction) {
                this.pendingTextAction(text);
                this.pendingTextAction = null;
                document.getElementById('text-input-modal').style.display = 'none';
            }
        });
        
        document.getElementById('cancel-text-btn').addEventListener('click', () => {
            this.pendingTextAction = null;
            document.getElementById('text-input-modal').style.display = 'none';
        });
        
        // Keyboard shortcuts
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    showWelcomeModal() {
        document.getElementById('welcome-modal').style.display = 'block';
    }
    
    createNewCanvas(width, height, backgroundColor) {
        // Save history state before changing canvas
        this.saveHistoryState();
        
        // Update canvas dimensions
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
        
        // Reset zoom
        this.zoomLevel = 1;
        this.updateZoomDisplay();
        
        // Clear layers
        this.layers = [];
        
        // Create background layer
        this.addLayer('Background', true);
        this.fillLayer(this.layers[0], backgroundColor);
        
        // Update UI
        this.updateCanvasInfo();
        this.renderLayers();
    }
    
    addLayer(name, isBackground = false) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = this.canvasWidth;
        layerCanvas.height = this.canvasHeight;
        
        const layer = {
            id: Date.now(),
            name: name,
            canvas: layerCanvas,
            ctx: layerCanvas.getContext('2d'),
            visible: true,
            objects: [],
            isBackground: isBackground,
            adjustments: {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                filter: 'none'
            }
        };
        
        // Add to layers array
        this.layers.push(layer);
        
        // Set as current layer
        this.currentLayer = layer;
        
        // Update layers UI
        this.updateLayersUI();
        this.renderLayers();
        
        // Save to history
        this.saveHistoryState();
        
        return layer;
    }
    
    fillLayer(layer, color) {
        layer.ctx.fillStyle = color;
        layer.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.renderLayers();
    }
    
    deleteLayer(layer) {
        if (this.layers.length <= 1) return; // Don't delete the last layer
        
        // Save history state before deleting
        this.saveHistoryState();
        
        // Find index of the layer
        const index = this.layers.findIndex(l => l.id === layer.id);
        if (index === -1) return;
        
        // Remove the layer
        this.layers.splice(index, 1);
        
        // Set new current layer
        if (this.currentLayer.id === layer.id) {
            this.currentLayer = this.layers[Math.max(0, index - 1)];
        }
        
        // Update UI
        this.updateLayersUI();
        this.renderLayers();
    }
    
    updateLayersUI() {
        const layersContainer = document.getElementById('layers-container');
        layersContainer.innerHTML = '';
        
        // Create layer items in reverse order (top layer first)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (this.currentLayer && layer.id === this.currentLayer.id) {
                layerItem.classList.add('active');
            }
            
            layerItem.innerHTML = `
                <div class="layer-visibility">
                    <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </div>
                <div class="layer-name">${layer.name}</div>
            `;
            
            // Set click event to select layer
            layerItem.addEventListener('click', () => {
                this.setCurrentLayer(layer);
            });
            
            // Set click event for visibility toggle
            layerItem.querySelector('.layer-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                e.currentTarget.innerHTML = `<i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
                this.renderLayers();
            });
            
            layersContainer.appendChild(layerItem);
        }
    }
    
    setCurrentLayer(layer) {
        this.currentLayer = layer;
        this.updateLayersUI();
        
        // Update adjustment controls to reflect current layer
        document.getElementById('brightness').value = layer.adjustments.brightness;
        document.getElementById('brightness-value').textContent = layer.adjustments.brightness;
        document.getElementById('contrast').value = layer.adjustments.contrast;
        document.getElementById('contrast-value').textContent = layer.adjustments.contrast;
        document.getElementById('saturation').value = layer.adjustments.saturation;
        document.getElementById('saturation-value').textContent = layer.adjustments.saturation;
        
        // Update filter selection
        this.currentFilter = layer.adjustments.filter;
        document.querySelectorAll('.filter-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === this.currentFilter);
        });
    }
    
    renderLayers() {
        // Clear the main canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Render each visible layer from bottom to top
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            if (layer.visible) {
                // Render the layer's canvas content
                this.ctx.drawImage(layer.canvas, 0, 0);
                
                // Render layer objects
                this.renderLayerObjects(layer);
            }
        }
        
        // Draw selection if any
        if (this.selectedObject) {
            this.drawSelectionBox(this.selectedObject);
        }
    }
    
    renderLayerObjects(layer) {
        if (!layer.objects.length) return;
        
        for (const obj of layer.objects) {
            if (obj.type === 'shape') {
                this.drawShape(this.ctx, obj);
            } else if (obj.type === 'text') {
                this.drawText(this.ctx, obj);
            }
        }
    }
    
    drawShape(ctx, shapeObj) {
        ctx.fillStyle = shapeObj.fill;
        ctx.strokeStyle = shapeObj.stroke;
        ctx.lineWidth = shapeObj.lineWidth;
        
        switch (shapeObj.shape) {
            case 'rectangle':
                if (shapeObj.fill) {
                    ctx.fillRect(shapeObj.x, shapeObj.y, shapeObj.width, shapeObj.height);
                }
                if (shapeObj.stroke) {
                    ctx.strokeRect(shapeObj.x, shapeObj.y, shapeObj.width, shapeObj.height);
                }
                break;
                
            case 'circle':
                ctx.beginPath();
                const radius = Math.max(shapeObj.width, shapeObj.height) / 2;
                ctx.arc(
                    shapeObj.x + shapeObj.width / 2,
                    shapeObj.y + shapeObj.height / 2,
                    radius,
                    0, 2 * Math.PI
                );
                if (shapeObj.fill) ctx.fill();
                if (shapeObj.stroke) ctx.stroke();
                break;
                
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(shapeObj.x + shapeObj.width / 2, shapeObj.y);
                ctx.lineTo(shapeObj.x, shapeObj.y + shapeObj.height);
                ctx.lineTo(shapeObj.x + shapeObj.width, shapeObj.y + shapeObj.height);
                ctx.closePath();
                if (shapeObj.fill) ctx.fill();
                if (shapeObj.stroke) ctx.stroke();
                break;
                
            case 'line':
                ctx.beginPath();
                ctx.moveTo(shapeObj.x, shapeObj.y);
                ctx.lineTo(shapeObj.x + shapeObj.width, shapeObj.y + shapeObj.height);
                ctx.stroke();
                break;
        }
    }
    
    drawText(ctx, textObj) {
        ctx.fillStyle = textObj.color;
        
        // Set font properties
        let fontString = '';
        if (textObj.italic) fontString += 'italic ';
        if (textObj.bold) fontString += 'bold ';
        fontString += `${textObj.fontSize}px ${textObj.fontFamily}`;
        ctx.font = fontString;
        
        // Draw text
        ctx.fillText(textObj.text, textObj.x, textObj.y + textObj.fontSize);
        
        // Underline if needed
        if (textObj.underline) {
            const textWidth = ctx.measureText(textObj.text).width;
            ctx.beginPath();
            ctx.moveTo(textObj.x, textObj.y + textObj.fontSize + 3);
            ctx.lineTo(textObj.x + textWidth, textObj.y + textObj.fontSize + 3);
            ctx.stroke();
        }
    }
    
    drawSelectionBox(object) {
        const padding = 5;
        let x, y, width, height;
        
        if (object.type === 'shape') {
            x = object.x - padding;
            y = object.y - padding;
            width = object.width + padding * 2;
            height = object.height + padding * 2;
        } else if (object.type === 'text') {
            // Measure text width
            this.ctx.font = `${object.fontSize}px ${object.fontFamily}`;
            const textWidth = this.ctx.measureText(object.text).width;
            
            x = object.x - padding;
            y = object.y - padding;
            width = textWidth + padding * 2;
            height = object.fontSize + padding * 2;
        }
        
        // Draw selection rectangle
        this.ctx.strokeStyle = '#0099ff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
        
        // Draw control handles
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#0099ff';
        this.ctx.lineWidth = 1;
        
        // Top-left handle
        this.ctx.fillRect(x - 4, y - 4, 8, 8);
        this.ctx.strokeRect(x - 4, y - 4, 8, 8);
        
        // Top-right handle
        this.ctx.fillRect(x + width - 4, y - 4, 8, 8);
        this.ctx.strokeRect(x + width - 4, y - 4, 8, 8);
        
        // Bottom-left handle
        this.ctx.fillRect(x - 4, y + height - 4, 8, 8);
        this.ctx.strokeRect(x - 4, y + height - 4, 8, 8);
        
        // Bottom-right handle
        this.ctx.fillRect(x + width - 4, y + height - 4, 8, 8);
        this.ctx.strokeRect(x + width - 4, y + height - 4, 8, 8);
    }
    
    setActiveTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${tool}-tool`);
        });
        
        // Show/hide shape options if shape tool is selected
        document.querySelector('.shape-options').style.display = 
            tool === 'shape' ? 'grid' : 'none';
            
        // Show/hide text properties if text is selected
        document.querySelector('.text-properties').style.display = 
            (tool === 'text' || (this.selectedObject && this.selectedObject.type === 'text')) 
            ? 'block' : 'none';
        
        // Update cursor style
        switch (tool) {
            case 'brush':
            case 'eraser':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'eyedropper':
                this.canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M2 12h20\'/%3E%3Cpath d=\'M12 2v20\'/%3E%3C/svg%3E") 12 12, crosshair';
                break;
            case 'move':
                this.canvas.style.cursor = 'move';
                break;
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }
    
    setActiveShape(shape) {
        this.currentShape = shape;
        
        // Update UI
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${shape}-shape`);
        });
    }
    
    setFilter(filter) {
        if (!this.currentLayer) return;
        
        // Update UI
        document.querySelectorAll('.filter-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === filter);
        });
        
        // Update current filter
        this.currentFilter = filter;
        this.currentLayer.adjustments.filter = filter;
        
        // Apply the filter
        this.applyAdjustments();
    }
    
    applyAdjustments() {
        if (!this.currentLayer) return;
        
        // Save the current adjustments to the layer
        this.currentLayer.adjustments.brightness = this.brightness;
        this.currentLayer.adjustments.contrast = this.contrast;
        this.currentLayer.adjustments.saturation = this.saturation;
        this.currentLayer.adjustments.filter = this.currentFilter;
        
        // Save history state
        this.saveHistoryState();
        
        // Re-render layers
        this.renderLayers();
    }
    
    handleMouseDown(e) {
        // Get mouse coordinates relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoomLevel;
        const y = (e.clientY - rect.top) / this.zoomLevel;
        
        this.isDragging = true;
        this.startX = x;
        this.startY = y;
        this.lastX = x;
        this.lastY = y;
        
        switch (this.currentTool) {
            case 'brush':
                this.isDrawing = true;
                this.ctx.lineJoin = 'round';
                this.ctx.lineCap = 'round';
                this.ctx.strokeStyle = this.primaryColor;
                this.ctx.lineWidth = this.brushSize;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                
                // Start drawing on the current layer
                if (this.currentLayer) {
                    this.currentLayer.ctx.lineJoin = 'round';
                    this.currentLayer.ctx.lineCap = 'round';
                    this.currentLayer.ctx.strokeStyle = this.primaryColor;
                    this.currentLayer.ctx.lineWidth = this.brushSize;
                    this.currentLayer.ctx.beginPath();
                    this.currentLayer.ctx.moveTo(x, y);
                }
                break;
                
            case 'eraser':
                this.isDrawing = true;
                this.ctx.lineJoin = 'round';
                this.ctx.lineCap = 'round';
                this.ctx.strokeStyle = '#ffffff'; // Use white for erasing
                this.ctx.lineWidth = this.brushSize;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                
                // Start erasing on the current layer
                if (this.currentLayer) {
                    this.currentLayer.ctx.lineJoin = 'round';
                    this.currentLayer.ctx.lineCap = 'round';
                    this.currentLayer.ctx.strokeStyle = '#ffffff';
                    this.currentLayer.ctx.lineWidth = this.brushSize;
                    this.currentLayer.ctx.globalCompositeOperation = 'destination-out';
                    this.currentLayer.ctx.beginPath();
                    this.currentLayer.ctx.moveTo(x, y);
                }
                break;
                
            case 'eyedropper':
                this.pickColor(x, y);
                break;
                
            case 'shape':
                // Prepare for shape drawing
                this.isDrawing = true;
                // Clear temp canvas
                this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                break;
                
            case 'text':
                // Show text input dialog
                this.showTextInputDialog(x, y);
                break;
                
            case 'select':
                // Check if clicking on a selected object
                if (this.selectedObject) {
                    const isInside = this.isPointInObject(x, y, this.selectedObject);
                    if (!isInside) {
                        // Deselect if clicking outside
                        this.selectedObject = null;
                        this.renderLayers();
                    }
                }
                
                // If no selection, check if clicking on an object
                if (!this.selectedObject) {
                    this.selectObjectAt(x, y);
                }
                break;
                
            case 'move':
                if (this.selectedObject) {
                    // Start moving the selected object
                    this.isDragging = true;
                } else {
                    // Try to select an object first
                    this.selectObjectAt(x, y);
                }
                break;
                
            case 'crop':
                // Start drawing crop rectangle
                this.isDrawing = true;
                this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                break;
                
            case 'fill':
                if (this.currentLayer) {
                    this.floodFill(x, y, this.primaryColor);
                }
                break;
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoomLevel;
        const y = (e.clientY - rect.top) / this.zoomLevel;
        
        if (!this.isDragging) return;
        
        switch (this.currentTool) {
            case 'brush':
                if (this.isDrawing && this.currentLayer) {
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                    
                    this.currentLayer.ctx.lineTo(x, y);
                    this.currentLayer.ctx.stroke();
                }
                break;
                
            case 'eraser':
                if (this.isDrawing && this.currentLayer) {
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                    
                    this.currentLayer.ctx.lineTo(x, y);
                    this.currentLayer.ctx.stroke();
                }
                break;
                
            case 'shape':
                if (this.isDrawing) {
                    // Clear temp canvas
                    this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                    
                    // Draw shape preview
                    this.drawShapePreview(this.startX, this.startY, x, y);
                    
                    // Draw on main canvas for preview
                    this.renderLayers();
                    this.ctx.drawImage(this.tempCanvas, 0, 0);
                }
                break;
                
            case 'move':
                if (this.isDragging && this.selectedObject) {
                    // Move the selected object
                    const dx = x - this.lastX;
                    const dy = y - this.lastY;
                    
                    this.selectedObject.x += dx;
                    this.selectedObject.y += dy;
                    
                    this.renderLayers();
                }
                break;
                
            case 'crop':
                if (this.isDrawing) {
                    // Clear temp canvas
                    this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                    
                    // Draw crop rectangle preview
                    const width = x - this.startX;
                    const height = y - this.startY;
                    
                    this.tempCtx.strokeStyle = '#000000';
                    this.tempCtx.lineWidth = 2;
                    this.tempCtx.setLineDash([5, 5]);
                    this.tempCtx.strokeRect(this.startX, this.startY, width, height);
                    this.tempCtx.setLineDash([]);
                    
                    // Darken outside areas
                    this.tempCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    
                    // Top
                    this.tempCtx.fillRect(0, 0, this.canvasWidth, this.startY);
                    // Left
                    this.tempCtx.fillRect(0, this.startY, this.startX, height);
                    // Right
                    this.tempCtx.fillRect(this.startX + width, this.startY, this.canvasWidth - (this.startX + width), height);
                    // Bottom
                    this.tempCtx.fillRect(0, this.startY + height, this.canvasWidth, this.canvasHeight - (this.startY + height));
                    
                    // Draw on main canvas for preview
                    this.renderLayers();
                    this.ctx.drawImage(this.tempCanvas, 0, 0);
                }
                break;
        }
        
        this.lastX = x;
        this.lastY = y;
    }
    
    handleMouseUp(e) {
        if (this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.zoomLevel;
            const y = (e.clientY - rect.top) / this.zoomLevel;
            
            switch (this.currentTool) {
                case 'brush':
                case 'eraser':
                    if (this.isDrawing && this.currentLayer) {
                        this.ctx.closePath();
                        this.currentLayer.ctx.closePath();
                        
                        // Reset composite operation if eraser was used
                        if (this.currentTool === 'eraser') {
                            this.currentLayer.ctx.globalCompositeOperation = 'source-over';
                        }
                        
                        // Save history state
                        this.saveHistoryState();
                    }
                    break;
                    
                case 'shape':
                    if (this.isDrawing && this.currentLayer) {
                        // Create a new shape object
                        const width = x - this.startX;
                        const height = y - this.startY;
                        
                        // Only add if the shape has some size
                        if (Math.abs(width) > 5 || Math.abs(height) > 5) {
                            const newShape = {
                                type: 'shape',
                                shape: this.currentShape,
                                x: this.startX,
                                y: this.startY,
                                width: width,
                                height: height,
                                fill: this.primaryColor,
                                stroke: this.secondaryColor,
                                lineWidth: 2
                            };
                            
                            this.currentLayer.objects.push(newShape);
                            this.selectedObject = newShape;
                            
                            // Save history state
                            this.saveHistoryState();
                        }
                        
                        // Clear temp canvas
                        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                        
                        // Re-render layers with the new shape
                        this.renderLayers();
                    }
                    break;
                    
                case 'crop':
                    if (this.isDrawing) {
                        const width = Math.abs(x - this.startX);
                        const height = Math.abs(y - this.startY);
                        
                        // Only crop if the selection has some size
                        if (width > 10 && height > 10) {
                            // Get crop coordinates (ensure positive width/height)
                            const cropX = Math.min(this.startX, x);
                            const cropY = Math.min(this.startY, y);
                            
                            // Apply crop to all layers
                            this.cropAllLayers(cropX, cropY, width, height);
                        }
                        
                        // Clear temp canvas
                        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
                        
                        // Re-render layers
                        this.renderLayers();
                    }
                    break;
                    
                case 'move':
                    if (this.selectedObject) {
                        // Save history state after moving
                        this.saveHistoryState();
                    }
                    break;
            }
        }
        
        this.isDragging = false;
        this.isDrawing = false;
    }
    
    handleMouseLeave() {
        if (this.isDrawing) {
            // Similar to mouseup if we're drawing
            this.isDragging = false;
            this.isDrawing = false;
            
            if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
                this.ctx.closePath();
                if (this.currentLayer) {
                    this.currentLayer.ctx.closePath();
                    if (this.currentTool === 'eraser') {
                        this.currentLayer.ctx.globalCompositeOperation = 'source-over';
                    }
                }
                
                // Save history state
                this.saveHistoryState();
            }
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseDown(mouseEvent);
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseMove(mouseEvent);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }
    
    handleKeyDown(e) {
        // Handle keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    if (e.shiftKey) {
                        // Ctrl+Shift+Z = Redo
                        this.redo();
                    } else {
                        // Ctrl+Z = Undo
                        this.undo();
                    }
                    e.preventDefault();
                    break;
                    
                case 'y':
                    // Ctrl+Y = Redo
                    this.redo();
                    e.preventDefault();
                    break;
                    
                case 's':
                    // Ctrl+S = Save
                    this.saveToLocalStorage();
                    e.preventDefault();
                    break;
                    
                case 'o':
                    // Ctrl+O = Open
                    document.getElementById('file-input').click();
                    e.preventDefault();
                    break;
            }
        } else {
            // Tool shortcuts (without modifiers)
            switch (e.key.toLowerCase()) {
                case 'v':
                    this.setActiveTool('select');
                    break;
                case 'm':
                    this.setActiveTool('move');
                    break;
                case 'b':
                    this.setActiveTool('brush');
                    break;
                case 'e':
                    this.setActiveTool('eraser');
                    break;
                case 't':
                    this.setActiveTool('text');
                    break;
                case 'c':
                    this.setActiveTool('crop');
                    break;
                case 'i':
                    this.setActiveTool('eyedropper');
                    break;
                case 'f':
                    this.setActiveTool('fill');
                    break;
                case 'delete':
                case 'backspace':
                    // Delete selected object
                    if (this.selectedObject && this.currentLayer) {
                        this.deleteSelectedObject();
                    }
                    break;
            }
        }
    }
    
    drawShapePreview(startX, startY, endX, endY) {
        const width = endX - startX;
        const height = endY - startY;
        
        this.tempCtx.fillStyle = this.primaryColor;
        this.tempCtx.strokeStyle = this.secondaryColor;
        this.tempCtx.lineWidth = 2;
        
        switch (this.currentShape) {
            case 'rectangle':
                if (this.primaryColor !== 'transparent') {
                    this.tempCtx.fillRect(startX, startY, width, height);
                }
                this.tempCtx.strokeRect(startX, startY, width, height);
                break;
                
            case 'circle':
                this.tempCtx.beginPath();
                const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
                this.tempCtx.arc(
                    startX + width / 2,
                    startY + height / 2,
                    radius,
                    0, 2 * Math.PI
                );
                if (this.primaryColor !== 'transparent') {
                    this.tempCtx.fill();
                }
                this.tempCtx.stroke();
                break;
                
            case 'triangle':
                this.tempCtx.beginPath();
                this.tempCtx.moveTo(startX + width / 2, startY);
                this.tempCtx.lineTo(startX, startY + height);
                this.tempCtx.lineTo(startX + width, startY + height);
                this.tempCtx.closePath();
                if (this.primaryColor !== 'transparent') {
                    this.tempCtx.fill();
                }
                this.tempCtx.stroke();
                break;
                
            case 'line':
                this.tempCtx.beginPath();
                this.tempCtx.moveTo(startX, startY);
                this.tempCtx.lineTo(endX, endY);
                this.tempCtx.stroke();
                break;
        }
    }
    
    showTextInputDialog(x, y) {
        // Show the text input modal
        document.getElementById('text-input').value = '';
        document.getElementById('text-input-modal').style.display = 'block';
        document.getElementById('text-input').focus();
        
        // Set the callback for when text is confirmed
        this.pendingTextAction = (text) => {
            if (this.currentLayer) {
                const newText = {
                    type: 'text',
                    text: text,
                    x: x,
                    y: y,
                    fontFamily: this.fontFamily,
                    fontSize: this.fontSize,
                    color: this.primaryColor,
                    bold: this.fontBold,
                    italic: this.fontItalic,
                    underline: this.fontUnderline
                };
                
                this.currentLayer.objects.push(newText);
                this.selectedObject = newText;
                
                // Make text properties panel visible
                document.querySelector('.text-properties').style.display = 'block';
                
                // Save history state
                this.saveHistoryState();
                
                // Re-render layers with the new text
                this.renderLayers();
            }
        };
    }
    
    pickColor(x, y) {
        // Get the pixel data at the clicked position
        const imageData = this.ctx.getImageData(x, y, 1, 1).data;
        
        // Convert RGB to HEX
        const hexColor = '#' + 
            ('0' + imageData[0].toString(16)).slice(-2) +
            ('0' + imageData[1].toString(16)).slice(-2) +
            ('0' + imageData[2].toString(16)).slice(-2);
        
        // Set as primary color
        this.primaryColor = hexColor;
        document.getElementById('primary-color').style.backgroundColor = hexColor;
        document.getElementById('primary-color-picker').value = hexColor;
    }
    
    selectObjectAt(x, y) {
        if (!this.currentLayer) return;
        
        // Check in reverse order (top-most first)
        for (let i = this.currentLayer.objects.length - 1; i >= 0; i--) {
            const obj = this.currentLayer.objects[i];
            if (this.isPointInObject(x, y, obj)) {
                this.selectedObject = obj;
                
                // Show text properties if it's a text object
                document.querySelector('.text-properties').style.display = 
                    obj.type === 'text' ? 'block' : 'none';
                
                // Update text properties UI if needed
                if (obj.type === 'text') {
                    document.getElementById('font-family').value = obj.fontFamily;
                    document.getElementById('font-size').value = obj.fontSize;
                    document.getElementById('bold-text').classList.toggle('active', obj.bold);
                    document.getElementById('italic-text').classList.toggle('active', obj.italic);
                    document.getElementById('underline-text').classList.toggle('active', obj.underline);
                }
                
                this.renderLayers();
                return;
            }
        }
        
        // If no object was found, clear selection
        this.selectedObject = null;
        document.querySelector('.text-properties').style.display = 'none';
        this.renderLayers();
    }
    
    isPointInObject(x, y, obj) {
        if (obj.type === 'shape') {
            // For most shapes, use the bounding box
            if (obj.shape !== 'circle' && obj.shape !== 'triangle') {
                return x >= obj.x && x <= obj.x + obj.width &&
                       y >= obj.y && y <= obj.y + obj.height;
            }
            
            if (obj.shape === 'circle') {
                const radius = Math.max(obj.width, obj.height) / 2;
                const centerX = obj.x + obj.width / 2;
                const centerY = obj.y + obj.height / 2;
                
                // Calculate distance from center
                const distance = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                
                return distance <= radius;
            }
            
            if (obj.shape === 'triangle') {
                // Check if point is inside the triangle
                // This is a simplified approach - might not be perfect for all triangles
                const x1 = obj.x + obj.width / 2;
                const y1 = obj.y;
                const x2 = obj.x;
                const y2 = obj.y + obj.height;
                const x3 = obj.x + obj.width;
                const y3 = obj.y + obj.height;
                
                // Using barycentric coordinates to check
                const A = 0.5 * (-y2 * x3 + y1 * (-x2 + x3) + x1 * (y2 - y3) + x2 * y3);
                const sign = A < 0 ? -1 : 1;
                const s = (y1 * x3 - x1 * y3 + (y3 - y1) * x + (x1 - x3) * y) * sign;
                const t = (x1 * y2 - y1 * x2 + (y1 - y2) * x + (x2 - x1) * y) * sign;
                
                return s > 0 && t > 0 && (s + t) < 2 * A * sign;
            }
        } else if (obj.type === 'text') {
            // For text, use a rectangular bounding box
            this.ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
            const textWidth = this.ctx.measureText(obj.text).width;
            
            return x >= obj.x && x <= obj.x + textWidth &&
                   y >= obj.y && y <= obj.y + obj.fontSize;
        }
        
        return false;
    }
    
    deleteSelectedObject() {
        if (!this.selectedObject || !this.currentLayer) return;
        
        // Save history state before deleting
        this.saveHistoryState();
        
        // Find and remove the object
        const index = this.currentLayer.objects.findIndex(obj => obj === this.selectedObject);
        if (index !== -1) {
            this.currentLayer.objects.splice(index, 1);
            this.selectedObject = null;
            
            // Hide text properties panel
            document.querySelector('.text-properties').style.display = 'none';
            
            this.renderLayers();
        }
    }
    
    cropAllLayers(x, y, width, height) {
        // Save history state before cropping
        this.saveHistoryState();
        
        // Create new canvas for each layer with the cropped dimensions
        for (const layer of this.layers) {
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = width;
            croppedCanvas.height = height;
            const croppedCtx = croppedCanvas.getContext('2d');
            
            // Draw only the cropped portion
            croppedCtx.drawImage(
                layer.canvas,
                x, y, width, height,
                0, 0, width, height
            );
            
            // Update layer's canvas
            layer.canvas.width = width;
            layer.canvas.height = height;
            layer.ctx = layer.canvas.getContext('2d');
            layer.ctx.drawImage(croppedCanvas, 0, 0);
            
            // Adjust object positions
            for (const obj of layer.objects) {
                obj.x -= x;
                obj.y -= y;
            }
        }
        
        // Update canvas dimensions
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
        
        // Update UI
        this.updateCanvasInfo();
    }
    
    floodFill(x, y, fillColor) {
        if (!this.currentLayer) return;
        
        // Save history state before filling
        this.saveHistoryState();
        
        const ctx = this.currentLayer.ctx;
        const imageData = ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
        const data = imageData.data;
        
        // Get the color at the target position
        const targetPos = (y * this.canvasWidth + x) * 4;
        const targetR = data[targetPos];
        const targetG = data[targetPos + 1];
        const targetB = data[targetPos + 2];
        const targetA = data[targetPos + 3];
        
        // Convert fill color from hex to RGBA
        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);
        const fillA = 255;
        
        // Don't fill if already the same color
        if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) {
            return;
        }
        
        // Stack-based flood fill algorithm
        const stack = [[x, y]];
        const pixelsChecked = new Set();
        const tolerance = 10; // Color tolerance
        
        while (stack.length > 0) {
            const [curX, curY] = stack.pop();
            const pos = (curY * this.canvasWidth + curX) * 4;
            
            // Skip if out of bounds
            if (curX < 0 || curY < 0 || curX >= this.canvasWidth || curY >= this.canvasHeight) {
                continue;
            }
            
            // Skip if already checked
            const pixelKey = `${curX},${curY}`;
            if (pixelsChecked.has(pixelKey)) {
                continue;
            }
            pixelsChecked.add(pixelKey);
            
            // Check if color is similar to target
            const r = data[pos];
            const g = data[pos + 1];
            const b = data[pos + 2];
            const a = data[pos + 3];
            
            if (
                Math.abs(r - targetR) <= tolerance &&
                Math.abs(g - targetG) <= tolerance &&
                Math.abs(b - targetB) <= tolerance &&
                Math.abs(a - targetA) <= tolerance
            ) {
                // Fill this pixel
                data[pos] = fillR;
                data[pos + 1] = fillG;
                data[pos + 2] = fillB;
                data[pos + 3] = fillA;
                
                // Add adjacent pixels to stack
                stack.push([curX + 1, curY]);
                stack.push([curX - 1, curY]);
                stack.push([curX, curY + 1]);
                stack.push([curX, curY - 1]);
            }
            
            // Limit the number of pixels to process
            if (pixelsChecked.size > 500000) {
                break;
            }
        }
        
        // Update the canvas with filled area
        ctx.putImageData(imageData, 0, 0);
        this.renderLayers();
    }
    
    saveHistoryState() {
        // Create a snapshot of the current state
        const state = {
            layers: this.layers.map(layer => {
                // Create a copy of the layer canvas
                const canvasCopy = document.createElement('canvas');
                canvasCopy.width = layer.canvas.width;
                canvasCopy.height = layer.canvas.height;
                canvasCopy.getContext('2d').drawImage(layer.canvas, 0, 0);
                
                return {
                    id: layer.id,
                    name: layer.name,
                    canvas: canvasCopy,
                    visible: layer.visible,
                    objects: JSON.parse(JSON.stringify(layer.objects)),
                    isBackground: layer.isBackground,
                    adjustments: { ...layer.adjustments }
                };
            }),
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            currentLayerId: this.currentLayer ? this.currentLayer.id : null
        };
        
        // If we've gone back in history and now create a new action,
        // remove the "future" states
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add the new state to history
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
        }
        
        // Update current index
        this.historyIndex = this.history.length - 1;
    }
    
    undo() {
        if (this.historyIndex <= 0) return;
        
        // Go back one step
        this.historyIndex--;
        this.restoreFromHistory(this.history[this.historyIndex]);
    }
    
    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        
        // Go forward one step
        this.historyIndex++;
        this.restoreFromHistory(this.history[this.historyIndex]);
    }
    
    restoreFromHistory(state) {
        // Restore canvas dimensions
        this.canvasWidth = state.canvasWidth;
        this.canvasHeight = state.canvasHeight;
        this.canvas.width = state.canvasWidth;
        this.canvas.height = state.canvasHeight;
        this.tempCanvas.width = state.canvasWidth;
        this.tempCanvas.height = state.canvasHeight;
        
        // Restore layers
        this.layers = state.layers.map(layerState => {
            const layer = {
                id: layerState.id,
                name: layerState.name,
                canvas: document.createElement('canvas'),
                visible: layerState.visible,
                objects: layerState.objects,
                isBackground: layerState.isBackground,
                adjustments: { ...layerState.adjustments }
            };
            
            layer.canvas.width = this.canvasWidth;
            layer.canvas.height = this.canvasHeight;
            layer.ctx = layer.canvas.getContext('2d');
            layer.ctx.drawImage(layerState.canvas, 0, 0);
            
            return layer;
        });
        
        // Restore current layer
        if (state.currentLayerId) {
            this.currentLayer = this.layers.find(layer => layer.id === state.currentLayerId);
        } else {
            this.currentLayer = this.layers[0];
        }
        
        // Clear selection
        this.selectedObject = null;
        
        // Update UI
        this.updateLayersUI();
        this.updateCanvasInfo();
        this.renderLayers();
    }
    
    loadImageFromFile(file) {
        if (!file.type.match('image.*')) {
            alert('Please select an image file.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize canvas to image dimensions if needed
                let newWidth = img.width;
                let newHeight = img.height;
                
                // Limit to a reasonable size
                const maxDimension = 2000;
                if (newWidth > maxDimension || newHeight > maxDimension) {
                    const ratio = Math.min(maxDimension / newWidth, maxDimension / newHeight);
                    newWidth = Math.floor(newWidth * ratio);
                    newHeight = Math.floor(newHeight * ratio);
                }
                
                // Create new canvas with image dimensions
                this.createNewCanvas(newWidth, newHeight, '#ffffff');
                
                // Draw the image on the background layer
                this.currentLayer.ctx.drawImage(img, 0, 0, newWidth, newHeight);
                this.renderLayers();
                
                // Save to history
                this.saveHistoryState();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    saveToLocalStorage() {
        try {
            // Create a data object with all important information
            const projectData = {
                name: 'F4ZE Editor Project',
                date: new Date().toISOString(),
                canvasWidth: this.canvasWidth,
                canvasHeight: this.canvasHeight,
                layers: this.layers.map(layer => {
                    return {
                        id: layer.id,
                        name: layer.name,
                        visible: layer.visible,
                        imageData: layer.canvas.toDataURL('image/png'),
                        objects: layer.objects,
                        isBackground: layer.isBackground,
                        adjustments: layer.adjustments
                    };
                })
            };
            
            // Save to localStorage
            localStorage.setItem('f4zeEditorProject', JSON.stringify(projectData));
            
            alert('Project saved to browser storage.');
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Failed to save project. The project might be too large for browser storage.');
        }
    }
    
    loadFromLocalStorage() {
        try {
            const projectDataStr = localStorage.getItem('f4zeEditorProject');
            if (!projectDataStr) {
                alert('No saved project found.');
                return;
            }
            
            const projectData = JSON.parse(projectDataStr);
            
            // Create new canvas with saved dimensions
            this.createNewCanvas(
                projectData.canvasWidth,
                projectData.canvasHeight,
                '#ffffff'
            );
            
            // Clear existing layers
            this.layers = [];
            
            // Load layers
            const loadPromises = projectData.layers.map(layerData => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        // Create the layer
                        const layer = this.addLayer(layerData.name, layerData.isBackground);
                        layer.id = layerData.id;
                        layer.visible = layerData.visible;
                        layer.objects = layerData.objects;
                        layer.adjustments = layerData.adjustments;
                        
                        // Draw the saved image data
                        layer.ctx.drawImage(img, 0, 0);
                        
                        resolve();
                    };
                    img.src = layerData.imageData;
                });
            });
            
            // When all layers are loaded
            Promise.all(loadPromises).then(() => {
                // Set current layer to the top one
                this.currentLayer = this.layers[this.layers.length - 1];
                
                // Update UI
                this.updateLayersUI();
                this.renderLayers();
                
                // Save to history
                this.saveHistoryState();
                
                alert('Project loaded from browser storage.');
            });
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Failed to load project.');
        }
    }
    
    exportImage(format = 'png') {
        // Create a temporary canvas for flattening all layers
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvasWidth;
        exportCanvas.height = this.canvasHeight;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Draw white background (for transparent PNGs)
        if (format === 'jpeg') {
            exportCtx.fillStyle = '#ffffff';
            exportCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        // Render all visible layers
        for (const layer of this.layers) {
            if (layer.visible) {
                exportCtx.drawImage(layer.canvas, 0, 0);
                this.renderLayerObjects(layer, exportCtx);
            }
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = `f4ze-editor-export.${format}`;
        link.href = exportCanvas.toDataURL(`image/${format}`);
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    renderLayerObjects(layer, ctx = this.ctx) {
        if (!layer.objects.length) return;
        
        for (const obj of layer.objects) {
            if (obj.type === 'shape') {
                this.drawShape(ctx, obj);
            } else if (obj.type === 'text') {
                this.drawText(ctx, obj);
            }
        }
    }
    
    zoom(delta) {
        // Calculate new zoom level
        const newZoom = Math.max(0.1, Math.min(5, this.zoomLevel + delta));
        
        // Apply zoom
        this.zoomLevel = newZoom;
        
        // Update canvas display
        const canvasContainer = document.querySelector('.canvas-container');
        canvasContainer.style.transform = `scale(${this.zoomLevel})`;
        
        // Update zoom display
        this.updateZoomDisplay();
    }
    
    updateZoomDisplay() {
        document.getElementById('zoom-level').textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
    
    updateCanvasInfo() {
        document.getElementById('canvas-dimensions').textContent = 
            `Canvas: ${this.canvasWidth} × ${this.canvasHeight}`;
    }
}
