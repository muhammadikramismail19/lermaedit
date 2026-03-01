// Init Canvas
const canvasWidth = 800;
const canvasHeight = 1000;

const canvas = new fabric.Canvas('posterCanvas', {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true
});

// Templates Data
const defaultTemplates = [
    { id: 1, name: 'Abstract School', url: 'assets/bg_abstract.png' },
    { id: 2, name: 'Cute Kids', url: 'assets/bg_kids.png' },
    { id: 3, name: 'Tech Institute', url: 'assets/bg_tech.png' }
];

// Elements
const tabsBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const gallery = document.getElementById('templateGallery');
const uploadTemplate = document.getElementById('uploadTemplate');

const textInput = document.getElementById('textInput');
const fontFamily = document.getElementById('fontFamily');
const customFontName = document.getElementById('customFontName');
const textColor = document.getElementById('textColor');
const textSize = document.getElementById('textSize');
const addTextBtn = document.getElementById('addTextBtn');

const editControls = document.getElementById('editControls');
const bringForwardBtn = document.getElementById('bringForward');
const sendBackwardBtn = document.getElementById('sendBackward');
const deleteBtn = document.getElementById('deleteElement');
const uploadImage = document.getElementById('uploadImage');

const resetBtn = document.getElementById('resetCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

// Canvas Background Color
const canvasBgColor = document.getElementById('canvasBgColor');

// Layer Action Elements
const duplicateElement = document.getElementById('duplicateElement');
const flipX = document.getElementById('flipX');
const flipY = document.getElementById('flipY');

// New Draw & Shapes Elements
const toggleDrawMode = document.getElementById('toggleDrawMode');
const drawSettings = document.getElementById('drawSettings');
const drawColor = document.getElementById('drawColor');
const drawSize = document.getElementById('drawSize');
const shapeBtns = document.querySelectorAll('.shape-btn');
const shapeColor = document.getElementById('shapeColor');
const shapeOutlineColor = document.getElementById('shapeOutlineColor');

// New Filter Elements
const objOpacity = document.getElementById('objOpacity');
const imageFilters = document.getElementById('imageFilters');
const imgBrightness = document.getElementById('imgBrightness');
const imgContrast = document.getElementById('imgContrast');
const imgSaturation = document.getElementById('imgSaturation');
const imgBlur = document.getElementById('imgBlur');

// Photoshop Tools State
let currentTool = 'select'; // select, brush, eraser, pen, hand, zoom, crop, healing, eyedropper, blur, text, shape
let isPanning = false;
let isPenDrawing = false;
let penPoints = [];
let penLine;
let lastPanX, lastPanY;
let cropZone;

// Global Colors
const fgColor = document.getElementById('fgColor');
const bgColor = document.getElementById('bgColor');
const cropOverlay = document.getElementById('cropOverlay');
const confirmCropBtn = document.getElementById('confirmCropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');

const toolBtns = document.querySelectorAll('.tool-btn');
const flyoutBtns = document.querySelectorAll('.flyout-btn');
const toolGroups = document.querySelectorAll('.tool-group');

// Position flyouts dynamically to bypass CSS overflow hidden bounds
toolGroups.forEach(group => {
    const flyout = group.querySelector('.flyout-menu');
    if (flyout) {
        group.addEventListener('mouseenter', () => {
            const rect = group.getBoundingClientRect();
            flyout.style.display = 'flex';
            flyout.style.top = rect.top + 'px';
            flyout.style.left = rect.right + 'px';
        });
        group.addEventListener('mouseleave', () => {
            flyout.style.display = 'none';
        });
    }
});

function swapGroupIcon(parentBtn, childBtn) {
    const parentIcon = parentBtn.querySelector('i');
    const childIcon = childBtn.querySelector('i');

    // Swap classes but keep fa-solid/fa-regular base if needed, simpler to just clone className
    parentIcon.className = childIcon.className;
    parentBtn.title = childBtn.title;
    parentBtn.id = childBtn.id; // temporally swap ID so activeTool reads it correctly
}

function showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

toolBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active class from all
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const toolId = btn.id.replace('tool-', '');
        activateTool(toolId);
    });
});

flyoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent parent tool-btn click if bubbled

        // Find parent group
        const group = btn.closest('.tool-group');
        const parentBtn = group.querySelector('.tool-btn');

        // Swap icon & title to make this the active primary tool for the group
        swapGroupIcon(parentBtn, btn);

        // Trigger a click on the parent to activate it and apply active styling
        parentBtn.click();
    });
});

function activateTool(tool) {
    currentTool = tool;

    // Reset canvas states
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.forEachObject(o => o.selectable = true);

    if (isPenDrawing) {
        isPenDrawing = false;
        if (penLine) canvas.remove(penLine);
        penPoints = [];
    }

    // Optional specific tool warnings regarding browser limitations
    const warnings = {
        'lasso-magnetic': 'Magnetic Lasso: Pixel-edge detection is not supported in vector canvases. Simulated via standard object selection.',
        'quick-select': 'Quick Select: Pixel-edge detection not supported. Simulating via standard object selection.',
        'magic-wand': 'Magic Wand: Pixel-edge detection not supported. Simulating via standard object selection.',
        'content-aware': 'Content-Aware Move: AI processing not supported locally. Simulated via standard copy/move.',
        'healing': 'Spot Healing: Simulated using a low-opacity blending brush overlay.',
        'healing-brush': 'Healing Brush: Simulated using a low-opacity blending brush overlay.',
        'patch': 'Patch Tool: Simulated using a low-opacity blending brush overlay.',
        'clone-stamp': 'Clone Stamp: True pattern stamping not supported across vectors. Simulated via semi-transparent brush.',
        'bg-eraser': 'Background Eraser: Pixel erasing destroys vectors. Simulated via object deletion.',
        'magic-eraser': 'Magic Eraser: Simulated via full object deletion.',
        'dodge': 'Dodge Tool: Simulated by drawing semi-transparent white strokes.',
        'burn': 'Burn Tool: Simulated by drawing semi-transparent black strokes.',
        'smudge': 'Smudge/Blur: Simulated using a soft localized drop-shadow brush.',
        'blur': 'Smudge/Blur: Simulated using a soft localized drop-shadow brush.',
        '3d-material': '3D Material Drop: 3D context not available. Reverting to standard Eyedropper.',
        'color-sampler': 'Color Sampler: Simulated via singular Eyedropper.'
    };

    if (warnings[tool]) {
        showToast(warnings[tool]);
    }

    switch (tool) {
        // Selection Group
        case 'select':
        case 'select-direct':
        case 'select-path':
            break;
        case 'marquee-rect':
        case 'marquee-ellipse':
        case 'marquee-single-row':
        case 'marquee-single-col':
        case 'lasso':
        case 'lasso-poly':
        case 'lasso-magnetic':
        case 'quick-select':
        case 'magic-wand':
        case 'object-select':
            // Fabric JS handles grouping via multiselect natively, so we just revert to normal select
            // and maybe change cursor to crosshair as visual feedback
            canvas.defaultCursor = 'crosshair';
            canvas.selection = true;
            break;

        // Crop Group
        case 'crop':
        case 'perspective-crop':
        case 'slice':
        case 'slice-select':
            startCropMode();
            break;

        // Measurement Group
        case 'eyedropper':
        case '3d-material':
        case 'color-sampler':
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false;
            break;
        case 'ruler':
        case 'note':
        case 'count':
            // Measurements & Annotations not fully supported, act as select
            break;

        // Brushes & Retouching Group
        case 'brush':
        case 'pencil':
        case 'color-replace':
        case 'mixer-brush':
        case 'healing':
        case 'healing-brush':
        case 'patch':
        case 'content-aware':
        case 'red-eye':
        case 'clone-stamp':
        case 'pattern-stamp':
        case 'history':
        case 'art-history':
        case 'blur':
        case 'sharpen':
        case 'smudge':
        case 'dodge':
        case 'burn':
        case 'sponge':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);

            const size = drawSize ? parseInt(drawSize.value, 10) : 5;
            canvas.freeDrawingBrush.width = size;

            // Customize brush behavior based on tool simulation
            if (['blur', 'smudge'].includes(tool)) {
                canvas.freeDrawingBrush.color = 'rgba(0,0,0,0.05)';
                canvas.freeDrawingBrush.shadow = new fabric.Shadow({
                    blur: size * 2, offsetX: 0, offsetY: 0, affectStroke: true, color: 'rgba(0,0,0,0.3)',
                });
            } else if (['dodge', 'sharpen'].includes(tool)) {
                canvas.freeDrawingBrush.color = 'rgba(255,255,255,0.2)'; // Lightening simulation
            } else if (['burn', 'sponge'].includes(tool)) {
                canvas.freeDrawingBrush.color = 'rgba(0,0,0,0.2)'; // Darkening simulation
            } else if (['healing', 'healing-brush', 'patch', 'clone-stamp', 'history'].includes(tool)) {
                canvas.freeDrawingBrush.color = fgColor.value + '30'; // 20% opacity clone/heal
            } else if (tool === 'pencil') {
                canvas.freeDrawingBrush.color = fgColor.value; // Hard edge
                canvas.freeDrawingBrush.width = 1; // Strict 1px for classic pencil feel
            } else {
                canvas.freeDrawingBrush.color = fgColor.value; // Standard brush
            }
            break;

        // Eraser Group
        case 'eraser':
        case 'bg-eraser':
        case 'magic-eraser':
            canvas.defaultCursor = 'cell';
            canvas.selection = false;
            break;

        // Gradient & Bucket
        case 'gradient':
        case 'paint-bucket':
        case '3d-drop':
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false;
            break;

        // Vector Pen Group
        case 'pen':
        case 'freeform-pen':
        case 'curvature-pen':
        case 'add-anchor':
        case 'delete-anchor':
        case 'convert-point':
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false;
            canvas.forEachObject(o => o.selectable = false);
            break;

        // Type Text Group
        case 'text':
        case 'text-vert':
        case 'text-mask-horiz':
        case 'text-mask-vert':
            document.querySelector('[data-target="text"]').click();
            document.getElementById('addTextBtn').click();
            activateTool('select');
            break;

        // Shape Group
        case 'shape':
        case 'shape-rounded':
        case 'shape-ellipse':
        case 'shape-triangle':
        case 'shape-polygon':
        case 'shape-line':
        case 'shape-custom':
            document.querySelector('[data-target="shapes"]').click();

            // Auto-trigger insertion based on exact tool
            const map = {
                'shape-rounded': 'rect', 'shape-ellipse': 'circle',
                'shape-triangle': 'triangle', 'shape-line': 'line'
            };
            const shapeToMake = map[tool] || 'rect';

            // Find the btn
            const btn = Array.from(shapeBtns).find(b => b.dataset.shape === shapeToMake);
            if (btn) btn.click();
            activateTool('select');
            break;

        // Hand & Viewport
        case 'hand':
        case 'rotate-view':
            canvas.defaultCursor = 'grab';
            canvas.selection = false;
            canvas.forEachObject(o => o.selectable = false);
            break;

        // Zoom
        case 'zoom':
            canvas.defaultCursor = 'zoom-in';
            canvas.selection = false;
            canvas.forEachObject(o => o.selectable = false);
            break;
    }
}

// Crop Logic
function startCropMode() {
    canvas.selection = false;
    canvas.forEachObject(o => o.selectable = false);

    cropOverlay.style.display = 'block';

    // Create dark overlay
    cropZone = new fabric.Rect({
        left: 50,
        top: 50,
        width: canvas.width - 100,
        height: canvas.height - 100,
        fill: 'rgba(0,0,0,0.3)',
        transparentCorners: false,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        borderColor: '#3b82f6',
        cornerSize: 12,
        padding: 0,
        cornerStyle: 'circle',
        borderDashArray: [5, 5]
    });

    canvas.add(cropZone);
    canvas.setActiveObject(cropZone);
    canvas.renderAll();
}

function endCropMode(apply) {
    cropOverlay.style.display = 'none';

    if (apply && cropZone) {
        const rect = cropZone.getBoundingRect();

        // Calculate new scale based on physical canvas vs logical size (simplified crop)
        canvas.setWidth(rect.width);
        canvas.setHeight(rect.height);

        // Offset all objects
        const objects = canvas.getObjects();
        objects.forEach(obj => {
            if (obj !== cropZone) {
                obj.set({
                    left: obj.left - rect.left,
                    top: obj.top - rect.top
                });
                obj.setCoords();
            }
        });
        saveHistory();
    }

    if (cropZone) {
        canvas.remove(cropZone);
        cropZone = null;
    }

    activateTool('select');
    document.getElementById('tool-select').classList.add('active');
    document.getElementById('tool-crop').classList.remove('active');
}

confirmCropBtn.addEventListener('click', () => endCropMode(true));
cancelCropBtn.addEventListener('click', () => endCropMode(false));

// Global Canvas Mouse Events for Tools
canvas.on('mouse:down', function (opt) {
    const evt = opt.e;

    if (currentTool === 'hand') {
        isPanning = true;
        canvas.defaultCursor = 'grabbing';
        lastPanX = evt.clientX;
        lastPanY = evt.clientY;
    }
    else if (currentTool === 'zoom') {
        let zoom = canvas.getZoom();
        zoom *= evt.shiftKey ? 0.9 : 1.1; // Shift to zoom out
        if (zoom > 5) zoom = 5;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint({ x: evt.offsetX, y: evt.offsetY }, zoom);
        evt.preventDefault();
        evt.stopPropagation();
    }
    else if (['eraser', 'bg-eraser', 'magic-eraser'].includes(currentTool) && opt.target) {
        // If an eraser variant is active and we clicked an object, delete it
        canvas.remove(opt.target);
        saveHistory();
    }
    else if (['gradient', 'paint-bucket', '3d-drop'].includes(currentTool) && opt.target) {
        // Recolor target
        opt.target.set('fill', fgColor.value);
        canvas.renderAll();
        saveHistory();
    }
    else if (currentTool.includes('pen')) {
        isPenDrawing = true;
        const pointer = canvas.getPointer(opt.e);
        const points = [pointer.x, pointer.y, pointer.x, pointer.y];
        penLine = new fabric.Line(points, {
            strokeWidth: parseInt(drawSize.value) || 5,
            fill: fgColor.value,
            stroke: fgColor.value,
            originX: 'center',
            originY: 'center'
        });
        canvas.add(penLine);
    }
    else if (['eyedropper', '3d-material', 'color-sampler'].includes(currentTool)) {
        const pointer = canvas.getPointer(opt.e);
        const ctx = canvas.getContext('2d');
        const p = ctx.getImageData(opt.e.offsetX, opt.e.offsetY, 1, 1).data;
        // Note: getImageData might fail on cross-origin images, ignoring errors implicitly here
        if (p[3] > 0) { // If not completely transparent
            const hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
            fgColor.value = hex;
            if (drawColor) drawColor.value = hex;
            if (textColor) textColor.value = hex;
            if (shapeColor) shapeColor.value = hex;
        }
    }
});

function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

canvas.on('mouse:move', function (opt) {
    if (isPanning && currentTool === 'hand') {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - lastPanX;
        vpt[5] += e.clientY - lastPanY;
        canvas.requestRenderAll();
        lastPanX = e.clientX;
        lastPanY = e.clientY;
    }
    else if (isPenDrawing && currentTool === 'pen') {
        const pointer = canvas.getPointer(opt.e);
        penLine.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
    }
});

canvas.on('mouse:up', function (opt) {
    if (currentTool === 'hand') {
        isPanning = false;
        canvas.defaultCursor = 'grab';
    }
    else if (currentTool === 'pen' && isPenDrawing) {
        isPenDrawing = false;
        penLine.setCoords();
        saveHistory();
    }
});

// Zoom with Mouse Wheel (Global)
canvas.on('mouse:wheel', function (opt) {
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 5) zoom = 5;
    if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
});

// Remove old drawing mode toggle logic and link to brush tool
toggleDrawMode.addEventListener('click', () => {
    document.getElementById('tool-brush').click();
    drawSettings.style.display = 'grid'; // ensure settings are visible
});

// Tabs Logic
tabsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabsBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// Load Templates
function initGallery() {
    defaultTemplates.forEach((template, index) => {
        const div = document.createElement('div');
        div.className = 'template-card';
        if (index === 0) div.classList.add('selected'); // Default template

        div.innerHTML = `<img src="${template.url}" alt="${template.name}">`;

        div.addEventListener('click', () => {
            document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
            div.classList.add('selected');
            setCanvasBackground(template.url);
        });

        gallery.appendChild(div);
    });

    // Load first by default
    setCanvasBackground(defaultTemplates[0].url);
}

// Set Canvas Background
function setCanvasBackground(url) {
    if (!url) {
        canvas.backgroundImage = null;
        canvas.backgroundColor = canvasBgColor.value;
        canvas.renderAll();
        saveHistory();
        return;
    }
    fabric.Image.fromURL(url, function (img) {
        const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            scaleX: scale,
            scaleY: scale,
            originX: 'left',
            originY: 'top',
            crossOrigin: 'anonymous'
        });
        saveHistory();
    });
}

// Set Solid Color BG
canvasBgColor.addEventListener('input', function () {
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
    setCanvasBackground(null);
});

// Upload Custom Background
uploadTemplate.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (f) {
        const data = f.target.result;
        setCanvasBackground(data);

        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        const div = document.createElement('div');
        div.className = 'template-card selected';
        div.innerHTML = `<img src="${data}" alt="Custom Template">`;
        gallery.prepend(div);
    };
    reader.readAsDataURL(file);
});

// Text Tools
addTextBtn.addEventListener('click', () => {
    const textStr = textInput.value || "نیا متن";
    let selectedFont = customFontName.value.trim() !== '' ? customFontName.value : fontFamily.value;

    const textObj = new fabric.Textbox(textStr, {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        fontFamily: selectedFont,
        fill: textColor.value,
        fontSize: parseInt(textSize.value, 10),
        originX: 'center',
        originY: 'center',
        textAlign: 'center',
        direction: 'rtl',
        width: 400
    });

    if (['Noto Nastaliq Urdu', 'Gulzar', 'Jameel Noori Nastaleeq', 'Nafees Nastaleeq'].includes(selectedFont)) {
        textObj.set({ 'lineHeight': 1.6 });
    }

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
});

// Elements / Images
uploadImage.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (f) {
        const data = f.target.result;
        fabric.Image.fromURL(data, function (img) {
            img.scaleToWidth(200);
            img.set({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: 'center',
                originY: 'center'
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
        });
    };
    reader.readAsDataURL(file);
});

// Draw Mode
toggleDrawMode.addEventListener('click', () => {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    if (canvas.isDrawingMode) {
        toggleDrawMode.classList.replace('secondary-btn', 'primary-btn');
        toggleDrawMode.innerHTML = `<i class="fa-solid fa-pen-slash"></i> Stop Drawing`;
        drawSettings.style.display = 'grid';

        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = drawColor.value;
        canvas.freeDrawingBrush.width = parseInt(drawSize.value, 10);
    } else {
        toggleDrawMode.classList.replace('primary-btn', 'secondary-btn');
        toggleDrawMode.innerHTML = `<i class="fa-solid fa-pen"></i> Enable Free Drawing`;
        drawSettings.style.display = 'none';
    }
});

// Draw Mode Settings Update
drawColor.addEventListener('input', () => {
    fgColor.value = drawColor.value; // Sync with toolbar FG
    if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.color = drawColor.value;
});
fgColor.addEventListener('input', () => {
    if (drawColor) drawColor.value = fgColor.value; // Sync
    if (textColor) textColor.value = fgColor.value;
    if (shapeColor) shapeColor.value = fgColor.value;
    if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.color = fgColor.value;
});
drawSize.addEventListener('input', () => {
    if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.width = parseInt(drawSize.value, 10);
});

// Shapes
shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('tool-select').click(); // Re-activate selection mode automatically when adding shapes

        const shapeType = btn.dataset.shape;
        const fill = shapeColor.value;
        const stroke = shapeOutlineColor.value;
        let shape;

        const commonProps = {
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            fill: fill,
            stroke: stroke,
            strokeWidth: 3,
            originX: 'center',
            originY: 'center'
        };

        switch (shapeType) {
            case 'rect':
                shape = new fabric.Rect({ ...commonProps, width: 150, height: 100 });
                break;
            case 'circle':
                shape = new fabric.Circle({ ...commonProps, radius: 75 });
                break;
            case 'triangle':
                shape = new fabric.Triangle({ ...commonProps, width: 150, height: 150 });
                break;
            case 'line':
                shape = new fabric.Line([0, 0, 200, 0], {
                    ...commonProps,
                    stroke: fill,
                    strokeWidth: 5,
                    fill: ''
                });
                break;
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
        }
    });
});

// Layer Ordering
bringForwardBtn.addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) canvas.bringForward(activeObj);
});

sendBackwardBtn.addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) canvas.sendBackward(activeObj);
});

// Delete
deleteBtn.addEventListener('click', () => {
    const activeObjs = canvas.getActiveObjects();
    if (activeObjs.length) {
        canvas.discardActiveObject();
        activeObjs.forEach(function (object) {
            canvas.remove(object);
        });
    }
});

// Flip and Duplicate
flipX.addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (obj) { obj.set('flipX', !obj.flipX); canvas.renderAll(); }
});
flipY.addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (obj) { obj.set('flipY', !obj.flipY); canvas.renderAll(); }
});

duplicateElement.addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (obj) {
        obj.clone(function (clonedObj) {
            clonedObj.set({
                left: obj.left + 20,
                top: obj.top + 20,
                evented: true
            });
            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject(function (o) { canvas.add(o); });
                clonedObj.setCoords();
            } else {
                canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            canvas.renderAll();
        });
    }
});

// Keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            deleteBtn.click();
        }
    }
});

// Update Edit Panels
canvas.on('selection:created', updatePanels);
canvas.on('selection:updated', updatePanels);
canvas.on('selection:cleared', clearPanels);

function updatePanels(e) {
    const activeObj = e.selected[0];

    // 1. Text Properties Panel
    if (activeObj && activeObj.type === 'textbox') {
        editControls.innerHTML = `
            <textarea id="editTextInput" dir="rtl">${activeObj.text}</textarea>
            
            <div class="control-row" style="margin-top:10px">
                <div class="control-group">
                    <label>Text Align</label>
                    <select id="editTextAlign">
                        <option value="right" ${activeObj.textAlign === 'right' ? 'selected' : ''}>Right</option>
                        <option value="center" ${activeObj.textAlign === 'center' ? 'selected' : ''}>Center</option>
                        <option value="left" ${activeObj.textAlign === 'left' ? 'selected' : ''}>Left</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Font Size</label>
                    <input type="number" id="editTextSize" min="10" max="400" value="${activeObj.fontSize}">
                </div>
            </div>

            <div class="control-row" style="margin-top:10px">
                <div class="control-group">
                    <label>Color</label>
                    <input type="color" id="editTextColor" value="${activeObj.fill}">
                </div>
                <div class="control-group">
                    <label>Background</label>
                    <input type="color" id="editTextBg" value="${activeObj.backgroundColor || '#000000'}">
                </div>
            </div>

            <div class="control-row" style="margin-top:10px">
                <div class="control-group">
                    <label>Stroke Color</label>
                    <input type="color" id="editTextStroke" value="${activeObj.stroke || '#000000'}">
                </div>
                <div class="control-group">
                    <label>Stroke Width</label>
                    <input type="number" id="editTextStrokeWidth" value="${activeObj.strokeWidth || 0}" min="0" max="20">
                </div>
            </div>
            
            <div class="control-group" style="margin-top:10px">
                <label>Drop Shadow</label>
                <div class="control-row">
                    <input type="color" id="editShadowColor" value="${activeObj.shadow ? activeObj.shadow.color : '#000000'}">
                    <input type="number" id="editShadowBlur" placeholder="Blur" value="${activeObj.shadow ? activeObj.shadow.blur : 0}" min="0">
                </div>
            </div>
        `;

        document.getElementById('editTextInput').addEventListener('input', function () {
            activeObj.set('text', this.value);
            canvas.renderAll();
        });
        document.getElementById('editTextAlign').addEventListener('change', function () {
            activeObj.set('textAlign', this.value);
            canvas.renderAll();
        });
        document.getElementById('editTextSize').addEventListener('input', function () {
            activeObj.set('fontSize', parseInt(this.value, 10));
            canvas.renderAll();
        });
        document.getElementById('editTextColor').addEventListener('input', function () {
            activeObj.set('fill', this.value);
            canvas.renderAll();
        });
        document.getElementById('editTextBg').addEventListener('input', function () {
            activeObj.set('backgroundColor', this.value === '#000000' && !this.dataset.changed ? null : this.value);
            this.dataset.changed = true;
            canvas.renderAll();
        });

        document.getElementById('editTextStroke').addEventListener('input', function () {
            activeObj.set({ stroke: this.value, strokeWidth: parseInt(document.getElementById('editTextStrokeWidth').value) || 1 });
            canvas.renderAll();
        });
        document.getElementById('editTextStrokeWidth').addEventListener('input', function () {
            activeObj.set({ strokeWidth: parseInt(this.value) || 0 });
            canvas.renderAll();
        });

        const updateShadow = () => {
            const blur = parseInt(document.getElementById('editShadowBlur').value) || 0;
            if (blur > 0) {
                activeObj.set('shadow', new fabric.Shadow({
                    color: document.getElementById('editShadowColor').value,
                    blur: blur,
                    offsetX: blur / 2,
                    offsetY: blur / 2
                }));
            } else {
                activeObj.set('shadow', null);
            }
            canvas.renderAll();
        };

        document.getElementById('editShadowColor').addEventListener('input', updateShadow);
        document.getElementById('editShadowBlur').addEventListener('input', updateShadow);
        editControls.innerHTML = `<p class="muted-text">Select text on canvas to edit properties.</p>`;
    }

    // 2. Adjustments Panel
    if (activeObj) {
        objOpacity.value = activeObj.opacity * 100;

        if (activeObj.type === 'image') {
            imageFilters.style.display = 'block';
            // Reset sliders to 0 for simplicity, or grab existing if mapped
        } else {
            imageFilters.style.display = 'none';
        }
    }
}

function clearPanels() {
    editControls.innerHTML = `<p class="muted-text">Select text on canvas to edit properties.</p>`;
    objOpacity.value = 100;
    imageFilters.style.display = 'none';
}

// Opacity Adjustment
objOpacity.addEventListener('input', function () {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        activeObj.set('opacity', this.value / 100);
        canvas.renderAll();
    }
});

// Image Filters
function applyFilter(index, filter) {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'image') return;

    obj.filters[index] = filter;
    obj.applyFilters();
    canvas.renderAll();
}

imgBrightness.addEventListener('input', function () {
    const val = parseFloat(this.value) / 100;
    applyFilter(0, new fabric.Image.filters.Brightness({ brightness: val }));
});

imgContrast.addEventListener('input', function () {
    const val = parseFloat(this.value) / 100;
    applyFilter(1, new fabric.Image.filters.Contrast({ contrast: val }));
});

imgSaturation.addEventListener('input', function () {
    const val = parseFloat(this.value) / 100;
    applyFilter(2, new fabric.Image.filters.Saturation({ saturation: val }));
});

imgBlur.addEventListener('input', function () {
    const val = parseFloat(this.value) / 100;
    applyFilter(3, new fabric.Image.filters.Blur({ blur: val }));
});


// Top Bar Actions
resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        const selected = document.querySelector('.template-card.selected img');
        if (selected) {
            setCanvasBackground(selected.src);
        }
        saveHistory();
    }
});

// Download
downloadBtn.addEventListener('click', () => {
    canvas.discardActiveObject();
    canvas.renderAll();

    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
    });

    const docName = document.getElementById('posterName').value || 'Poster';
    const link = document.createElement('a');
    link.download = docName + '.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// --- Undo / Redo Mechanism ---
let canvasHistory = [];
let historyIndex = -1;
let historyProcessing = false;

function saveHistory() {
    if (historyProcessing) return;
    const json = JSON.stringify(canvas.toJSON());

    // Don't save if nothing changed
    if (historyIndex >= 0 && canvasHistory[historyIndex] === json) return;

    // Discard any redo history
    canvasHistory = canvasHistory.slice(0, historyIndex + 1);

    canvasHistory.push(json);
    historyIndex++;
}

// Initial state
canvas.on('object:added', saveHistory);
canvas.on('object:modified', saveHistory);
canvas.on('object:removed', saveHistory);

undoBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
        historyProcessing = true;
        historyIndex--;
        canvas.loadFromJSON(canvasHistory[historyIndex], function () {
            canvas.renderAll();
            historyProcessing = false;
        });
    }
});

redoBtn.addEventListener('click', () => {
    if (historyIndex < canvasHistory.length - 1) {
        historyProcessing = true;
        historyIndex++;
        canvas.loadFromJSON(canvasHistory[historyIndex], function () {
            canvas.renderAll();
            historyProcessing = false;
        });
    }
});

// Initialize
initGallery();
document.fonts.ready.then(function () {
    canvas.renderAll();
    setTimeout(saveHistory, 200); // Initial save deferred slightly to allow bg load
});

// Hotkeys for Tools
document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement.tagName;
    if (activeEl === 'INPUT' || activeEl === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
        case 'v': document.getElementById('tool-select').click(); break;
        case 'b': document.getElementById('tool-brush').click(); break;
        case 'e': document.getElementById('tool-eraser').click(); break;
        case 'p': document.getElementById('tool-pen').click(); break;
        case 'h': document.getElementById('tool-hand').click(); break;
        case 'z': document.getElementById('tool-zoom').click(); break;
        case 'c': document.getElementById('tool-crop').click(); break;
        case 'i': document.getElementById('tool-eyedropper').click(); break;
        case 't': document.getElementById('tool-text').click(); break;
        case 'u': document.getElementById('tool-shape').click(); break;
        case 'j': document.getElementById('tool-healing').click(); break;
        case 'y': document.getElementById('tool-history').click(); break;
    }
});
