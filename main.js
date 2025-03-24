var current_equation = 'z^2';
var IMG1_OBJ;
var GRID_CANVA;

var CONFIG = {
    canvas : {
        width : 900,
        height : 720,
    },
    image : {
        default_height : 200,
        border_color: '#15c3e6',
        default_x_pos: 180,
        default_y_pos: 260,
    },
    grid : {
        pixel_step: 100,
        math_step: 1,
        text_step: 1,
    },
    animation : {
        duration : 800,
    }
}

function preload()
{
    IMG1_OBJ = new IMG_class("image.png");
}

function setup()
{
    let canvas = createCanvas(CONFIG.canvas.width, CONFIG.canvas.height);
    canvas.parent("canva_parent");

    GRID_CANVA = createGraphics(CONFIG.canvas.width, CONFIG.canvas.height);
    drawGridOnGraphics(GRID_CANVA);

    // Setup slider event listeners
    setupSliderListeners();
}

function setupSliderListeners() {
    // Get slider elements
    const pixelStepSlider = document.getElementById('pixel-step');
    const mathStepSlider = document.getElementById('math-step');
    const imageSizeSlider = document.getElementById('image-size');
    const pixelStepValue = document.getElementById('pixel-step-value');
    const mathStepValue = document.getElementById('math-step-value');
    const imageSizeValue = document.getElementById('image-size-value');

    // Update values and redraw when pixel step changes
    pixelStepSlider.addEventListener('input', (e) => {
        CONFIG.grid.pixel_step = parseInt(e.target.value);
        pixelStepValue.textContent = e.target.value;
        updateGridAndImage();
    });

    // Update values and redraw when math step changes
    mathStepSlider.addEventListener('input', (e) => {
        CONFIG.grid.math_step = parseFloat(e.target.value);
        mathStepValue.textContent = parseFloat(e.target.value).toFixed(1);
        updateGridAndImage();
    });

    // Update values and redraw when image size changes
    imageSizeSlider.addEventListener('input', (e) => {
        CONFIG.image.default_height = parseInt(e.target.value);
        imageSizeValue.textContent = e.target.value;
        if (IMG1_OBJ) {
            IMG1_OBJ.updateImageSize();
            updateGridAndImage();
        }
    });
}

function updateGridAndImage() {
    // Redraw grid
    GRID_CANVA.clear();
    drawGridOnGraphics(GRID_CANVA);

    // Recompute image if it exists and has been processed
    if (IMG1_OBJ && !IMG1_OBJ.isDragging) {
        IMG1_OBJ.compute_output_image();
    }

    // Update preview if currently dragging
    if (IMG1_OBJ && IMG1_OBJ.isDragging) {
        IMG1_OBJ.preview_perimeter();
    }
}

function draw()
{
    background(0);
    image(GRID_CANVA, 0, 0);
    IMG1_OBJ.draw();
}

function mousePressed() {
    IMG1_OBJ.mousePressed();
}

function mouseDragged() {
    IMG1_OBJ.mouseDragged();
}

function mouseReleased() {
    IMG1_OBJ.mouseReleased();
}

function pixel_to_complex(pixel_x, pixel_y)
{
    let re = (pixel_x - CONFIG.canvas.width / 2) * CONFIG.grid.math_step / CONFIG.grid.pixel_step;
    let im = (pixel_y - CONFIG.canvas.height / 2) * CONFIG.grid.math_step / CONFIG.grid.pixel_step;

    return math.complex(re, -im);
}

function complex_to_pixel(complex)
{
    let pixel_x = (complex.re * CONFIG.grid.pixel_step / CONFIG.grid.math_step) + CONFIG.canvas.width / 2;
    let pixel_y = CONFIG.canvas.height / 2 - (complex.im * CONFIG.grid.pixel_step / CONFIG.grid.math_step);

    return [Math.floor(pixel_x), Math.floor(pixel_y)];
}

function pixel_to_fpixel(pixel_x, pixel_y)
{
    let complex = pixel_to_complex(pixel_x, pixel_y);

    let complex_f = math.evaluate(current_equation, {z: complex});

    return complex_to_pixel(complex_f);
}


class IMG_class
{
    constructor(path)
    {
        this.img = loadImage(path, () => {this.setup()});
    }

    setup()
    {
        this.img_height = CONFIG.image.default_height;
        this.img_width = Math.floor(this.img.width * this.img_height / this.img.height);

        // Create output graphics with willReadFrequently flag
        this.output_img = createGraphics(CONFIG.canvas.width, CONFIG.canvas.height);
        this.output_img.canvas.getContext('2d', { willReadFrequently: true });
        
        // Create preview graphics for perimeter
        this.preview_img = createGraphics(CONFIG.canvas.width, CONFIG.canvas.height);

        // Cache the image data
        this.img.resize(this.img_width, this.img_height);
        this.imgData = this.img.canvas.getContext('2d', { willReadFrequently: true })
            .getImageData(0, 0, this.img_width, this.img_height);

        this.pos_x = CONFIG.image.default_x_pos;
        this.pos_y = CONFIG.image.default_y_pos;

        this.compute_output_image();

        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        // Animation properties
        this.isAnimating = true;
        this.animationStartTime = 0;
        this.animationDuration = CONFIG.animation.duration;
        this.fadeInOpacity = 0;
        this.fadeOutOpacity = 255;
        this.showOriginal = true;
    }

    draw()
    {   
        if (this.img && this.output_img) {
            if (this.showOriginal) {
                image(this.img, this.pos_x, this.pos_y);
            }
            // Draw transformed image
            image(this.output_img, 0, 0);
        }

        // Handle animation
        if (this.isAnimating) {
            let currentTime = millis();
            let elapsed = currentTime - this.animationStartTime;
            let progress = elapsed / this.animationDuration;
            
            // Ease in-out function for smoother transition
            progress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            this.fadeInOpacity = map(progress, 0, 1, 0, 255);
            this.fadeOutOpacity = map(progress, 0, 1, 255, 0);
            
            if (elapsed >= this.animationDuration) {
                this.isAnimating = false;
                this.fadeInOpacity = 255;
                this.fadeOutOpacity = 0;
            }
        }

        // Draw preview with fade-out opacity during animation
        if (this.isDragging || this.isAnimating) {
            push();
            tint(255, this.fadeOutOpacity);
            image(this.preview_img, 0, 0);
            pop();
        }
        
        // Draw blue border when dragging
        if (this.isDragging) {
            stroke(CONFIG.image.border_color);
            strokeWeight(5);
            noFill();
            rect(this.pos_x - 2, this.pos_y - 2, this.img_width + 4, this.img_height + 4);
        }
    }

    preview_perimeter() {
        this.preview_img.clear();
        this.preview_img.stroke(255);
        this.preview_img.strokeWeight(1);
        this.preview_img.fill(255, 255, 255, 120);

        // Draw the entire perimeter as one shape
        this.preview_img.beginShape();
        
        // Top edge
        for(let x = 0; x < this.img_width; x++) {
            let pos_f_canva = pixel_to_fpixel(this.pos_x + x, this.pos_y);
            this.preview_img.vertex(pos_f_canva[0], pos_f_canva[1]);
        }
        
        // Right edge
        for(let y = 0; y < this.img_height; y++) {
            let pos_f_canva = pixel_to_fpixel(this.pos_x + this.img_width, this.pos_y + y);
            this.preview_img.vertex(pos_f_canva[0], pos_f_canva[1]);
        }
        
        // Bottom edge
        for(let x = this.img_width; x >= 0; x--) {
            let pos_f_canva = pixel_to_fpixel(this.pos_x + x, this.pos_y + this.img_height);
            this.preview_img.vertex(pos_f_canva[0], pos_f_canva[1]);
        }
        
        // Left edge
        for(let y = this.img_height; y >= 0; y--) {
            let pos_f_canva = pixel_to_fpixel(this.pos_x, this.pos_y + y);
            this.preview_img.vertex(pos_f_canva[0], pos_f_canva[1]);
        }
        
        this.preview_img.endShape(CLOSE);
    }

    compute_output_image()
    {   
        this.output_img.clear();

        let last_pos_arr = new Array(this.img_width);
        const imgData = this.imgData;

        for(let y = 0; y < this.img_height; y++){
            let pos_y_canva = this.pos_y + y;
            let current_pos_arr = [];

            for(let x = 0; x < this.img_width; x++){
                let pos_x_canva = this.pos_x + x;
                let pos_f_canva = pixel_to_fpixel(pos_x_canva, pos_y_canva);

                if (y > 0 && x > 0){
                    // Get color from cached image data
                    const idx = (y * this.img_width + x) * 4;
                    const r = imgData.data[idx];
                    const g = imgData.data[idx + 1];
                    const b = imgData.data[idx + 2];
                    const a = imgData.data[idx + 3];
                    
                    this.output_img.fill(r, g, b, a);
                    this.output_img.stroke(r, g, b, a);

                    this.output_img.beginShape();
                    this.output_img.vertex(last_pos_arr[x-1][0], last_pos_arr[x-1][1]);
                    this.output_img.vertex(last_pos_arr[x][0], last_pos_arr[x][1]);
                    this.output_img.vertex(pos_f_canva[0], pos_f_canva[1]);
                    this.output_img.vertex(current_pos_arr[x-1][0], current_pos_arr[x-1][1]);
                    this.output_img.endShape(CLOSE);
                }

                current_pos_arr.push(pos_f_canva);
            }
            last_pos_arr = current_pos_arr;
        }
    }

    mousePressed() {
        if (mouseX >= this.pos_x && mouseX <= this.pos_x + this.img_width &&
            mouseY >= this.pos_y && mouseY <= this.pos_y + this.img_height) {
            // Stop any ongoing animation
            this.isAnimating = false;
            this.isDragging = true;
            this.offsetX = mouseX - this.pos_x;
            this.offsetY = mouseY - this.pos_y;
            
            // Reset opacities for new drag
            this.fadeInOpacity = 0;
            this.fadeOutOpacity = 255;
            
            // Clear both output and preview
            this.output_img.clear();
            this.preview_img.clear();
            
            // Immediately draw the preview perimeter
            this.preview_perimeter();
        }
    }

    mouseDragged() {
        if (this.isDragging) {
            // Check if mouse is within canvas bounds
            if (mouseX >= 0 && mouseX <= CONFIG.canvas.width && 
                mouseY >= 0 && mouseY <= CONFIG.canvas.height) {
                this.pos_x = mouseX - this.offsetX;
                this.pos_y = mouseY - this.offsetY;
                this.preview_perimeter();
            }
        }
    }

    mouseReleased() {
        // Only process release if we were dragging and mouse is in canvas
        if (this.isDragging && 
            mouseX >= 0 && mouseX <= CONFIG.canvas.width && 
            mouseY >= 0 && mouseY <= CONFIG.canvas.height) {
            this.isDragging = false;
            this.compute_output_image();
            
            // Start the fade animation
            this.isAnimating = true;
            this.animationStartTime = millis();
            this.fadeInOpacity = 0;
            this.fadeOutOpacity = 255;
        }
    }

    updateImageSize() {
        this.img_height = CONFIG.image.default_height;
        this.img_width = Math.floor(this.img.width * this.img_height / this.img.height);
        this.img.resize(this.img_width, this.img_height);
        this.imgData = this.img.canvas.getContext('2d', { willReadFrequently: true })
            .getImageData(0, 0, this.img_width, this.img_height);
    }
}

function drawGridOnGraphics(graphics) {
    //Drawing the secondary grid
    var nb_steps_x_axis = Math.ceil(CONFIG.canvas.width / (2 * CONFIG.grid.pixel_step));
    var nb_steps_y_axis = Math.ceil(CONFIG.canvas.height / (2 * CONFIG.grid.pixel_step));

    graphics.stroke(255);
    graphics.strokeWeight(0.3);

    graphics.textAlign(CENTER);
    graphics.textSize(15);
    graphics.fill(204, 202, 202);

    // X-axis grid lines and labels
    for (let i = 0; i < nb_steps_x_axis; i++) {
        let text_x = (i * CONFIG.grid.math_step).toFixed(1);
        graphics.line(CONFIG.canvas.width / 2 + i * CONFIG.grid.pixel_step, 0, CONFIG.canvas.width / 2 + i * CONFIG.grid.pixel_step, CONFIG.canvas.height);
        graphics.line(CONFIG.canvas.width / 2 - i * CONFIG.grid.pixel_step, 0, CONFIG.canvas.width / 2 - i * CONFIG.grid.pixel_step, CONFIG.canvas.height);
        if (i % CONFIG.grid.text_step == 0 && text_x != 0) {
            graphics.text(text_x, CONFIG.canvas.width / 2 + i * CONFIG.grid.pixel_step, CONFIG.canvas.height / 2 + 20);
            graphics.text(-text_x, CONFIG.canvas.width / 2 - i * CONFIG.grid.pixel_step, CONFIG.canvas.height / 2 + 20);
        }
    }

    // Y-axis grid lines and labels
    for (let i = 0; i < nb_steps_y_axis; i++) {
        let text_y = (i * CONFIG.grid.math_step).toFixed(1);
        graphics.line(0, CONFIG.canvas.height / 2 + i * CONFIG.grid.pixel_step, CONFIG.canvas.width, CONFIG.canvas.height / 2 + i * CONFIG.grid.pixel_step);
        graphics.line(0, CONFIG.canvas.height / 2 - i * CONFIG.grid.pixel_step, CONFIG.canvas.width, CONFIG.canvas.height / 2 - i * CONFIG.grid.pixel_step);
        if (i % CONFIG.grid.text_step == 0 && text_y != 0) {
            graphics.text(-text_y, CONFIG.canvas.width / 2 + 20, CONFIG.canvas.height / 2 + i * CONFIG.grid.pixel_step);
            graphics.text(text_y, CONFIG.canvas.width / 2 + 20, CONFIG.canvas.height / 2 - i * CONFIG.grid.pixel_step);
        }
    }

    //Drawing the main grid
    graphics.stroke(255);
    graphics.strokeWeight(2);

    graphics.line(0, CONFIG.canvas.height / 2, CONFIG.canvas.width, CONFIG.canvas.height / 2);
    graphics.line(CONFIG.canvas.width / 2, 0, CONFIG.canvas.width / 2, CONFIG.canvas.height);
}