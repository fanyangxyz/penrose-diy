/**
 * Penrose tiling generator using pentagrid method
 * Creates rhombus patterns based on intersecting line families
 */

// Mathematical constants
const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio

// Grid configuration
const GRID_SIZE = 800;
const NUM_LINES = 1; // Number of lines per grid family
const SPACING = 450; // Spacing between parallel lines
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
let showTraceCheckbox;
let showTrace = true;
let recordButton;

// Progressive alignment state
let alignmentQueue = [];
let isAligning = false;
let currentlyAligning = null; // Index of rhombus being aligned
let currentOffset = null; // Offset to visualize
let animationStartPositions = null; // Store positions at start of animation
let visualizationFrames = 60; // Frames for movement visualization (higher = slower)
let visualizationProgress = 0; // 0 to visualizationFrames

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
    alignButton = createButton('Drag the rhombuses or automatically align them by clicking here');
    alignButton.position(380, 20);
    alignButton.mousePressed(toggleAlignment);
    alignButton.style('padding', '15px 30px');
    alignButton.style('font-size', '20px');
    alignButton.style('font-weight', 'bold');
    alignButton.style('cursor', 'pointer');
    alignButton.style('background-color', 'transparent');
    alignButton.style('color', 'black');
    alignButton.style('border', 'none');
    alignButton.style('border-radius', '8px');
    alignButton.style('box-shadow', 'none');
    alignButton.style('transition', 'all 0.3s');

    // Create checkbox for trace visualization
    showTraceCheckbox = createCheckbox('Show Trace (slower animation, uncheck for faster alignment)', true);
    showTraceCheckbox.position(380, 55);
    showTraceCheckbox.style('font-size', '18px');
    showTraceCheckbox.style('font-weight', 'bold');
    showTraceCheckbox.style('color', 'black');
    showTraceCheckbox.style('background-color', 'transparent');
    showTraceCheckbox.style('padding', '12px 16px');
    showTraceCheckbox.style('border-radius', '8px');
    showTraceCheckbox.style('box-shadow', 'none');
    showTraceCheckbox.style('cursor', 'pointer');
    showTraceCheckbox.changed(updateTraceMode);

    // Create record button
    recordButton = createButton('Record GIF');
    recordButton.position(380, 100);
    recordButton.mousePressed(() => saveGif('penrose-alignment', 12));
    recordButton.style('padding', '12px 24px');
    recordButton.style('font-size', '18px');
    recordButton.style('background-color', '#ff4444');
    recordButton.style('color', 'white');
    recordButton.style('border', 'none');
    recordButton.style('border-radius', '8px');

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

    // Process alignment visualization
    if (isAligning) {
        if (showTrace && currentlyAligning !== null && visualizationProgress < visualizationFrames) {
            // Animate the rhombus movement
            const rhomb = rhombPoints[currentlyAligning];
            const progress = (visualizationProgress + 1) / visualizationFrames;

            // Interpolate position from start to final
            for (let i = 0; i < rhomb.points.length; i++) {
                rhomb.points[i][0] = animationStartPositions[i][0] + currentOffset.x * progress;
                rhomb.points[i][1] = animationStartPositions[i][1] + currentOffset.y * progress;
            }

            // Increment visualization progress
            visualizationProgress++;
            if (visualizationProgress >= visualizationFrames) {
                // Visualization complete, move to next
                visualizationProgress = 0;
                currentlyAligning = null;
                currentOffset = null;
                animationStartPositions = null;
            }
        } else {
            // Start next alignment (skip visualization if showTrace is false)
            if (!showTrace && currentlyAligning !== null) {
                currentlyAligning = null;
                currentOffset = null;
                visualizationProgress = 0;
                animationStartPositions = null;
            }
            stepAlignment();
        }
    }

    // Translate to center for all drawing operations
    push();
    translate(centerX, centerY);

    // Draw all visual elements
    drawGrid();
    drawIntersections();
    drawRhomb();
    drawMovementPath();

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
 * Update trace visualization mode
 */
function updateTraceMode() {
    showTrace = showTraceCheckbox.checked();
}

/**
 * Toggle alignment of rhombuses
 */
function toggleAlignment() {
    if (!isAligned && !isAligning) {
        // Start progressive alignment
        startProgressiveAlignment();
        alignButton.html('Aligning...');
    } else if (isAligned) {
        // Reset to original positions
        resetRhombuses();
        isAligned = false;
        isAligning = false;
        alignmentQueue = [];
        alignButton.html('Drag the rhombuses or automatically align them by clicking here');
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
    currentlyAligning = null;
    currentOffset = null;
    visualizationProgress = 0;
    loop(); // Start the draw loop
}

/**
 * Process one alignment step
 */
function stepAlignment() {
    if (alignmentQueue.length === 0) {
        // Alignment complete
        isAligning = false;
        isAligned = true;
        currentlyAligning = null;
        currentOffset = null;
        alignButton.html('Reset to Original');
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

        // Set for visualization
        currentlyAligning = adjacentIndex;
        visualizationProgress = 0;

        // Skip if this rhombus is locked (manually moved)
        if (!adjacentTile.locked) {
            // Calculate offset for visualization
            currentOffset = calculateAlignmentOffset(startingTile, adjacentTile, sharedLine, direction);

            if (showTrace) {
                // Store starting positions for animation
                animationStartPositions = adjacentTile.points.map(p => [p[0], p[1]]);
                // Don't apply offset yet - will be animated in draw loop
            } else {
                // Apply offset immediately if not visualizing
                realignRhombus(adjacentTile, currentOffset);
            }
            console.log(`Aligned rhombus ${adjacentIndex} to ${startingTileIndex}`);
        } else {
            currentOffset = { x: 0, y: 0 };
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

/**
 * Draw the movement path from original to final position
 */
function drawMovementPath() {
    if (!showTrace || currentlyAligning === null || currentOffset === null) return;

    const rhomb = rhombPoints[currentlyAligning];
    const progress = visualizationProgress / visualizationFrames;

    // Calculate start and end positions
    const startCenterX = (animationStartPositions[0][0] + animationStartPositions[2][0]) / 2;
    const startCenterY = (animationStartPositions[0][1] + animationStartPositions[2][1]) / 2;
    const finalCenterX = startCenterX + currentOffset.x;
    const finalCenterY = startCenterY + currentOffset.y;
    const currentCenterX = (rhomb.points[0][0] + rhomb.points[2][0]) / 2;
    const currentCenterY = (rhomb.points[0][1] + rhomb.points[2][1]) / 2;

    // Draw original position with dotted contour
    drawingContext.setLineDash([5, 5]); // Set dashed line pattern
    fill(150, 150, 150, 50);
    stroke(150, 150, 150, 200);
    strokeWeight(2);
    beginShape();
    for (const point of animationStartPositions) {
        vertex(point[0], point[1]);
    }
    endShape(CLOSE);
    drawingContext.setLineDash([]); // Reset to solid line

    // Draw movement arrow from start to final
    stroke(200, 200, 200, 150);
    strokeWeight(2);
    line(startCenterX, startCenterY, finalCenterX, finalCenterY);

    // Draw arrowhead at final position
    const angle = Math.atan2(finalCenterY - startCenterY, finalCenterX - startCenterX);
    const arrowSize = 12;
    fill(200, 200, 200, 150);
    noStroke();
    push();
    translate(finalCenterX, finalCenterY);
    rotate(angle);
    triangle(0, 0, -arrowSize, -arrowSize/2, -arrowSize, arrowSize/2);
    pop();

    // Draw trail from start to current position
    stroke(255, 100, 0, 200);
    strokeWeight(3);
    line(startCenterX, startCenterY, currentCenterX, currentCenterY);

    // Highlight the moving rhombus
    fill(255, 150, 0, 150);
    stroke(255, 100, 0, 255);
    strokeWeight(3);
    beginShape();
    for (const point of rhomb.points) {
        vertex(point[0], point[1]);
    }
    endShape(CLOSE);
}
