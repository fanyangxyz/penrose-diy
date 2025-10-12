/**
 * Penrose tiling generator using pentagrid method
 * Creates rhombus patterns based on intersecting line families
 */

// Mathematical constants
const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio

// Grid configuration
const GRID_SIZE = 1200;
const NUM_LINES = 1; // Number of lines per grid family
const SPACING = 400; // Spacing between parallel lines
const SCALE = 55;

// Visual constants
const BACKGROUND_LIGHT = 240;
const BACKGROUND_WHITE = 255;

// Color palette for grid families
const colors = [
    [255, 0, 0],    // Red
    [0, 255, 0],    // Green
    [0, 0, 255],    // Blue
    [255, 165, 0],  // Orange
    [128, 0, 128]   // Purple
];

// Gamma values for line positioning
let GAMMAS;

// Global state arrays
let gridLines = [];
let rhombPoints = [];
let intersections = [];
let selectedRhomb = null;

// Graph structure for adjacency
// Each entry maps rhomb index to array of {neighborIndex, sharedLine} objects
let rhombGraph = new Map();

// Canvas center coordinates (calculated once)
let centerX, centerY;

// Alignment state
let isAligned = false;
let alignButton;

// Progressive alignment state
let alignmentQueue = [];
let isAligning = false;

/**
 * Initialize the Penrose tiling
 * Sets up canvas, generates grid families, finds intersections, and creates rhombi
 */
function setup() {
    randomSeed(0);
    createCanvas(GRID_SIZE, GRID_SIZE);
    background(BACKGROUND_LIGHT);

    // Calculate center coordinates once
    centerX = width / 2;
    centerY = height / 2;

    // Initialize gamma values for pentagrid positioning
    initializeGammas();

    // Generate all grid line families
    generateGridFamilies();

    // Calculate intersections and create rhombi
    findIntersections();
    generateRhombi();

    // Build adjacency graph
    buildRhombGraph();

    console.log(`Generated ${rhombPoints.length} rhombi from ${intersections.length} intersections`);

    // Create align button
    alignButton = createButton('Align Rhombuses');
    alignButton.position(20, 20);
    alignButton.mousePressed(toggleAlignment);
    alignButton.style('padding', '15px 30px');
    alignButton.style('font-size', '20px');
    alignButton.style('font-weight', 'bold');
    alignButton.style('cursor', 'pointer');
    alignButton.style('background-color', '#4CAF50');
    alignButton.style('color', 'white');
    alignButton.style('border', 'none');
    alignButton.style('border-radius', '8px');
    alignButton.style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    alignButton.style('transition', 'all 0.3s');
}

/**
 * Initialize gamma values for pentagrid line positioning
 */
function initializeGammas() {
    GAMMAS = [0.17, 0.21, 0.28, 0.3];
    // Calculate fifth gamma to ensure sum equals 1
    const sumOfFirst4 = GAMMAS.reduce((sum, gamma) => sum + gamma, 0);
    GAMMAS.push(1 - sumOfFirst4);
}

/**
 * Generate all five families of parallel grid lines
 */
function generateGridFamilies() {
    gridLines = [];
    for (let familyIndex = 0; familyIndex < 5; familyIndex++) {
        gridLines.push(findGridFamily(familyIndex));
    }
}

/**
 * Generate rhombi from all intersections
 */
function generateRhombi() {
    for (const intersection of intersections) {
        findRhomb(intersection);
    }
}

/**
 * Main draw loop - renders the Penrose tiling
 */
function draw() {
    background(BACKGROUND_WHITE);

    // Process one alignment step per frame if aligning
    if (isAligning) {
        stepAlignment();
    }

    // Translate to center for all drawing operations
    push();
    translate(centerX, centerY);

    // Draw all visual elements
    drawGrid();
    drawIntersections();
    drawRhomb();

    pop();
}

/**
 * Handle mouse press events for rhombus selection
 */
function mousePressed() {
    // Convert mouse coordinates to canvas center-relative coordinates
    const canvasX = mouseX - centerX;
    const canvasY = mouseY - centerY;

    // Check if mouse is within canvas bounds
    if (!isWithinBounds(mouseX, mouseY)) {
        selectedRhomb = null;
        return;
    }

    // Find the first rhombus containing the mouse position
    for (const rhomb of rhombPoints) {
        if (isPointInPolygon(canvasX, canvasY, rhomb)) {
            console.log('Rhombus selected');
            selectedRhomb = rhomb;
            return;
        }
    }

    // No rhombus found at mouse position
    selectedRhomb = null;
}

/**
 * Check if coordinates are within canvas bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if within bounds
 */
function isWithinBounds(x, y) {
    return x >= 0 && x <= width && y >= 0 && y <= height;
}

/**
 * Handle mouse drag events for moving selected rhombus
 */
function mouseDragged() {
    if (!selectedRhomb) {
        return;
    }

    // Calculate mouse movement delta
    const deltaX = mouseX - pmouseX;
    const deltaY = mouseY - pmouseY;

    // Move all points of the selected rhombus
    for (const point of selectedRhomb.points) {
        point[0] += deltaX;
        point[1] += deltaY;
    }

    // Mark as locked so alignment won't move it
    selectedRhomb.locked = true;
    selectedRhomb.aligned = true; // Also mark as aligned to act as an anchor
}

/**
 * Handle mouse release events
 */
function mouseReleased() {
    selectedRhomb = null;
}

/**
 * Toggle alignment of rhombuses
 */
function toggleAlignment() {
    if (!isAligned && !isAligning) {
        // Start progressive alignment
        startProgressiveAlignment();
        alignButton.html('Aligning...');
        alignButton.style('background-color', '#FF9800');
    } else if (isAligned) {
        // Reset to original positions
        resetRhombuses();
        isAligned = false;
        isAligning = false;
        alignmentQueue = [];
        alignButton.html('Align Rhombuses');
        alignButton.style('background-color', '#4CAF50');
    }
}

/**
 * Start the progressive alignment process
 */
function startProgressiveAlignment() {
    // Count how many rhombuses are already locked
    const lockedCount = rhombPoints.filter(r => r.locked).length;
    console.log(`Starting alignment with ${lockedCount} locked rhombuses`);

    // If there are locked rhombuses, start from all of them
    // Otherwise start from rhombus 0
    if (lockedCount > 0) {
        alignmentQueue = [];
        for (let i = 0; i < rhombPoints.length; i++) {
            if (rhombPoints[i].locked) {
                alignmentQueue.push(i);
                console.log(`Using locked rhombus ${i} as seed`);
            }
        }
    } else {
        alignmentQueue = [0];
        rhombPoints[0].aligned = true;
    }

    isAligning = true;
    loop(); // Start the draw loop
}

/**
 * Process one alignment step per frame
 */
function stepAlignment() {
    if (alignmentQueue.length === 0) {
        // Alignment complete
        isAligning = false;
        isAligned = true;
        alignButton.html('Reset to Original');
        alignButton.style('background-color', '#f44336');
        console.log('Alignment complete!');
        return;
    }

    // Get the next rhombus to process
    const startingTileIndex = alignmentQueue.shift();
    const startingTile = rhombPoints[startingTileIndex];

    // Find the (up to 4) tiles that are adjacent to it and unaligned
    const adjacentTileData = getUnalignedAdjacentTiles(startingTileIndex);

    // Align one neighbor per step
    if (adjacentTileData.length > 0) {
        const data = adjacentTileData[0]; // Take only the first neighbor
        const adjacentIndex = data.neighborIndex;
        const sharedLine = data.sharedLine;
        const direction = data.direction;
        const adjacentTile = rhombPoints[adjacentIndex];

        // Skip if this rhombus is locked (manually moved)
        if (!adjacentTile.locked) {
            // Move it to touch this tile using the shared line information and direction
            const offset = calculateAlignmentOffset(startingTile, adjacentTile, sharedLine, direction);
            realignRhombus(adjacentTile, offset);
            console.log(`Aligned rhombus ${adjacentIndex} to ${startingTileIndex}`);
        } else {
            console.log(`Skipped locked rhombus ${adjacentIndex}`);
        }

        // Mark it as aligned (whether locked or not)
        adjacentTile.aligned = true;

        // Add it to the queue
        alignmentQueue.push(adjacentIndex);

        // Add remaining neighbors back to the front of the queue for next frames
        for (let i = 1; i < adjacentTileData.length; i++) {
            alignmentQueue.unshift(startingTileIndex);
        }
    }
}