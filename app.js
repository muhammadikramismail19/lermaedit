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
    fabric.Image.fromURL(url, function(img) {
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
        
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            scaleX: scale,
            scaleY: scale,
            originX: 'left',
            originY: 'top',
            crossOrigin: 'anonymous'
        });
    });
}

// Upload Custom Background
uploadTemplate.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(f) {
        const data = f.target.result;
        setCanvasBackground(data);
        
        // Add to gallery visually as selected
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
    const textStr = textInput.value || "نیا متن"; // default Urdu text
    const textObj = new fabric.Textbox(textStr, {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        fontFamily: fontFamily.value,
        fill: textColor.value,
        fontSize: parseInt(textSize.value, 10),
        originX: 'center',
        originY: 'center',
        textAlign: 'center',
        direction: 'rtl',
        width: 400
    });
    
    // Some Urdu fonts require proper letter spacing
    if(fontFamily.value === 'Noto Nastaliq Urdu' || fontFamily.value === 'Gulzar') {
        textObj.set({ 'lineHeight': 1.5 });
    }

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
});

// Elements / Images
uploadImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(f) {
        const data = f.target.result;
        fabric.Image.fromURL(data, function(img) {
            img.scaleToWidth(200); // default scale
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

// Layer Ordering
bringForwardBtn.addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if(activeObj) canvas.bringForward(activeObj);
});

sendBackwardBtn.addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if(activeObj) canvas.sendBackward(activeObj);
});

// Delete
deleteBtn.addEventListener('click', () => {
    const activeObjs = canvas.getActiveObjects();
    if (activeObjs.length) {
        canvas.discardActiveObject();
        activeObjs.forEach(function(object) {
            canvas.remove(object);
        });
    }
});

// Keyboard delete shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if we aren't typing inside a text box/input out of canvas
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            deleteBtn.click();
        }
    }
});

// Handle Object Selection to map to Editor
canvas.on('selection:created', updateEditPanel);
canvas.on('selection:updated', updateEditPanel);
canvas.on('selection:cleared', clearEditPanel);

function updateEditPanel(e) {
    const activeObj = e.selected[0];
    if (activeObj && activeObj.type === 'textbox') {
        // Reveal text editor
        editControls.innerHTML = `
            <textarea id="editTextInput" dir="rtl">${activeObj.text}</textarea>
            <div class="control-row">
                <div class="control-group">
                    <label>Color</label>
                    <input type="color" id="editTextColor" value="${activeObj.fill}">
                </div>
            </div>
            <div class="control-group" style="margin-top:10px">
                <label>Font Size</label>
                <input type="range" id="editTextSize" min="10" max="250" value="${activeObj.fontSize}">
            </div>
        `;
        
        // Add Listeners
        document.getElementById('editTextInput').addEventListener('input', function() {
            activeObj.set('text', this.value);
            canvas.renderAll();
        });
        
        document.getElementById('editTextColor').addEventListener('input', function() {
            activeObj.set('fill', this.value);
            canvas.renderAll();
        });

        document.getElementById('editTextSize').addEventListener('input', function() {
            activeObj.set('fontSize', parseInt(this.value, 10));
            canvas.renderAll();
        });

    } else if(activeObj && activeObj.type === 'image') {
        editControls.innerHTML = `<p class="muted-text">Image selected. You can drag, resize or rotate it.</p>`;
    } else {
        clearEditPanel();
    }
}

function clearEditPanel() {
    editControls.innerHTML = `<p class="muted-text">Select text on canvas to edit properties.</p>`;
}

// Top Bar Actions
resetCanvas.addEventListener('click', () => {
    if(confirm('Are you sure you want to clear the canvas?')) {
        canvas.clear();
        // re-apply background
        const selected = document.querySelector('.template-card.selected img');
        if(selected) {
            setCanvasBackground(selected.src);
        } else {
            setCanvasBackground(defaultTemplates[0].url);
        }
    }
});

downloadBtn.addEventListener('click', () => {
    // Clear selection before saving
    canvas.discardActiveObject();
    canvas.renderAll();

    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2 // High Resolution export
    });

    const docName = document.getElementById('posterName').value || 'Poster';
    
    // Auto Download
    const link = document.createElement('a');
    link.download = docName + '.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Initialize
initGallery();

// Wait for fonts to load before first render to avoid missing Nastaliq
document.fonts.ready.then(function () {
    canvas.renderAll();
});
