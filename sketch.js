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

    // Align rhombuses using BFS
    alignRhombuses();

    console.log(`Generated ${rhombPoints.length} rhombi from ${intersections.length} intersections`);

    // Stop draw loop from running continuously
    noLoop();
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
}

/**
 * Handle mouse release events
 */
function mouseReleased() {
    selectedRhomb = null;
}