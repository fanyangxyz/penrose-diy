// De Bruijn's Pentagrid Method for Penrose Tilings
// Proper implementation: find regions formed by line intersections

/**
 * Configuration constants for the Penrose tiling generation
 */
const CONFIG = {
    // Mathematical constants
    PHI: (1 + Math.sqrt(5)) / 2, // Golden ratio
    TAU: 2 * Math.PI,

    // Grid parameters
    GRID_SIZE: 1200,
    SPACING: 80,
    NUM_LINES: 8, // Reduced for better performance

    // Colors
    GRID_COLORS: [
        [255, 100, 100, 80],  // Red
        [100, 255, 100, 80],  // Green
        [100, 100, 255, 80],  // Blue
        [255, 255, 100, 80],  // Yellow
        [255, 100, 255, 80]   // Magenta
    ],

    RHOMB_COLORS: [
        [200, 150, 100, 220], // Thick rhomb
        [100, 150, 200, 220]  // Thin rhomb
    ]
};

/**
 * Application state management
 */
class PenroseState {
    constructor() {
        this.gammas = [0, 0.15, 0.35, 0.65, 0.85];
        this.gridLines = [];
        this.intersections = [];
        this.regions = [];
        this.rhombs = [];
        this.showGrid = true;
        this.showRhombs = true;
    }

    randomizeGammas() {
        this.gammas = this.gammas.map(() => Math.random());
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
    }

    toggleRhombs() {
        this.showRhombs = !this.showRhombs;
    }
}

// Global state instance
let appState = new PenroseState();

/**
 * P5.js setup function - initializes canvas and generates initial tiling
 */
function setup() {
    createCanvas(CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);

    const penroseGenerator = new PenroseGenerator(appState);
    penroseGenerator.generateTiling();

    console.log(`Found ${appState.intersections.length} intersections`);
    console.log(`Found ${appState.regions.length} regions`);
    console.log(`Generated ${appState.rhombs.length} rhombs`);
}

/**
 * P5.js draw function - renders the current frame
 */
function draw() {
    background(250);
    translate(width / 2, height / 2);

    const renderer = new PenroseRenderer(appState);
    renderer.render();

    drawInstructions();
}

/**
 * Draws user instruction text
 */
function drawInstructions() {
    fill(0);
    noStroke();
    textAlign(LEFT);
    text("Press 'g' to toggle grid", -width / 2 + 10, -height / 2 + 20);
    text("Press 'r' to toggle rhombs", -width / 2 + 10, -height / 2 + 40);
    text("Press SPACE to regenerate", -width / 2 + 10, -height / 2 + 60);
}

/**
 * Penrose tiling generator class
 */
class PenroseGenerator {
    constructor(state) {
        this.state = state;
    }

    /**
     * Generates the complete Penrose tiling
     */
    generateTiling() {
        this.generatePentagrid();
        this.findAllIntersections();
        this.findRegions();
        this.convertRegionsToRhombs();
    }

    /**
     * Generates the pentagrid - 5 families of parallel lines
     */
    generatePentagrid() {
        this.state.gridLines = [];

        for (let family = 0; family < 5; family++) {
            const familyLines = [];
            const angle = family * CONFIG.TAU / 5;
            const nx = Math.cos(angle);
            const ny = Math.sin(angle);

            for (let i = -CONFIG.NUM_LINES; i <= CONFIG.NUM_LINES; i++) {
                const offset = i * CONFIG.SPACING + this.state.gammas[family] * CONFIG.SPACING;

                // Store line in normal form: nx*x + ny*y = offset
                familyLines.push({
                    family,
                    nx,
                    ny,
                    offset,
                    index: i
                });
            }

            this.state.gridLines.push(familyLines);
        }
    }

    /**
     * Finds all intersections between grid lines with performance optimizations
     */
    findAllIntersections() {
        this.state.intersections = [];
        const intersections = [];

        // Find intersections between all pairs of families
        for (let f1 = 0; f1 < 5; f1++) {
            for (let f2 = f1 + 1; f2 < 5; f2++) {
                const lines1 = this.state.gridLines[f1];
                const lines2 = this.state.gridLines[f2];

                for (let i = 0; i < lines1.length; i++) {
                    for (let j = 0; j < lines2.length; j++) {
                        const intersection = this.calculateLineIntersection(lines1[i], lines2[j]);
                        if (intersection && this.isInBounds(intersection)) {
                            intersection.families = [f1, f2];
                            intersection.lines = [lines1[i], lines2[j]];
                            intersections.push(intersection);
                        }
                    }
                }
            }
        }

        this.state.intersections = intersections;
    }

    /**
     * Calculates intersection point between two lines with error handling
     * @param {Object} line1 - First line in normal form
     * @param {Object} line2 - Second line in normal form
     * @returns {p5.Vector|null} - Intersection point or null if parallel/invalid
     */
    calculateLineIntersection(line1, line2) {
        try {
            // Validate input
            if (!line1 || !line2 ||
                typeof line1.nx !== 'number' || typeof line1.ny !== 'number' ||
                typeof line2.nx !== 'number' || typeof line2.ny !== 'number') {
                return null;
            }

            // Solve: line1.nx*x + line1.ny*y = line1.offset
            //        line2.nx*x + line2.ny*y = line2.offset
            const det = line1.nx * line2.ny - line1.ny * line2.nx;
            if (Math.abs(det) < 1e-10) return null; // Parallel lines

            const x = (line1.offset * line2.ny - line2.offset * line1.ny) / det;
            const y = (line2.offset * line1.nx - line1.offset * line2.nx) / det;

            // Validate result
            if (!isFinite(x) || !isFinite(y)) return null;

            return createVector(x, y);
        } catch (error) {
            console.warn('Error calculating line intersection:', error);
            return null;
        }
    }

    /**
     * Checks if a point is within the canvas bounds
     * @param {p5.Vector} point - Point to check
     * @returns {boolean} - True if point is in bounds
     */
    isInBounds(point) {
        const margin = CONFIG.SPACING;
        return Math.abs(point.x) < width / 2 - margin &&
               Math.abs(point.y) < height / 2 - margin;
    }

    /**
     * Finds regions that can be converted to rhombs with optimized sampling
     */
    findRegions() {
        this.state.regions = [];
        const regions = [];

        // Adaptive resolution based on grid complexity
        const resolution = Math.max(20, Math.min(40, CONFIG.NUM_LINES));
        const step = CONFIG.GRID_SIZE / resolution;
        const halfGrid = CONFIG.GRID_SIZE / 2;

        try {
            // Use batch processing for better performance
            for (let x = -halfGrid; x < halfGrid; x += step) {
                for (let y = -halfGrid; y < halfGrid; y += step) {
                    const point = createVector(x, y);
                    const signature = this.getPointSignature(point);

                    if (signature && this.isValidRhombSignature(signature)) {
                        const rhombType = this.getRhombType(signature);

                        if (rhombType !== 'unknown') {
                            regions.push({
                                center: point,
                                signature,
                                type: rhombType
                            });
                        }
                    }
                }
            }

            this.state.regions = regions;
        } catch (error) {
            console.error('Error finding regions:', error);
            this.state.regions = [];
        }
    }

    /**
     * Gets the signature of a point relative to all grid lines
     * @param {p5.Vector} point - Point to analyze
     * @returns {Array} - Multi-dimensional signature array
     */
    getPointSignature(point) {
        const signature = [];

        for (let family = 0; family < 5; family++) {
            const familySignature = [];

            for (const line of this.state.gridLines[family]) {
                // Check which side of the line the point is on
                const value = line.nx * point.x + line.ny * point.y - line.offset;
                familySignature.push(value > 0 ? 1 : 0);
            }

            signature.push(familySignature);
        }

        return signature;
    }

    /**
     * Validates if a signature represents a valid rhomb region
     * @param {Array} signature - Point signature to validate
     * @returns {boolean} - True if signature is valid for rhomb
     */
    isValidRhombSignature(signature) {
        // A valid rhomb region should be bounded by exactly 4 lines
        // (2 from one family, 2 from another family)

        let activeFamilies = 0;
        let totalTransitions = 0;

        for (let family = 0; family < 5; family++) {
            let transitions = 0;
            const familySig = signature[family];

            for (let i = 1; i < familySig.length; i++) {
                if (familySig[i] !== familySig[i - 1]) {
                    transitions++;
                }
            }

            if (transitions === 2) {
                activeFamilies++;
            }
            totalTransitions += transitions;
        }

        // Should have exactly 2 active families with 2 transitions each
        return activeFamilies === 2 && totalTransitions === 4;
    }

    /**
     * Determines the type of rhomb based on signature
     * @param {Array} signature - Point signature to analyze
     * @returns {string} - 'thick', 'thin', or 'unknown'
     */
    getRhombType(signature) {
        // Determine which families are active
        const activeFamilies = [];

        for (let family = 0; family < 5; family++) {
            let transitions = 0;
            const familySig = signature[family];

            for (let i = 1; i < familySig.length; i++) {
                if (familySig[i] !== familySig[i - 1]) {
                    transitions++;
                }
            }

            if (transitions === 2) {
                activeFamilies.push(family);
            }
        }

        if (activeFamilies.length === 2) {
            const diff = Math.abs(activeFamilies[1] - activeFamilies[0]);
            const minDiff = Math.min(diff, 5 - diff);

            // Adjacent families (diff=1) -> thick rhomb
            // Families with diff=2 -> thin rhomb
            return minDiff === 1 ? 'thick' : 'thin';
        }

        return 'unknown';
    }

    /**
     * Converts valid regions to rhomb shapes with error handling
     */
    convertRegionsToRhombs() {
        this.state.rhombs = [];
        const rhombs = [];

        try {
            for (const region of this.state.regions) {
                if (!region || !region.type || !region.center) {
                    continue;
                }

                if (region.type === 'thick' || region.type === 'thin') {
                    const rhomb = this.createRhombFromRegion(region);
                    if (rhomb && this.validateRhomb(rhomb)) {
                        rhombs.push(rhomb);
                    }
                }
            }

            // Remove overlapping rhombs with performance optimization
            this.state.rhombs = this.filterOverlappingRhombs(rhombs);
        } catch (error) {
            console.error('Error converting regions to rhombs:', error);
            this.state.rhombs = [];
        }
    }

    /**
     * Creates a rhomb shape from a region
     * @param {Object} region - Region data
     * @returns {Object|null} - Rhomb object or null if invalid
     */
    createRhombFromRegion(region) {
        const isThick = region.type === 'thick';
        const size = CONFIG.SPACING * 0.4;

        // Calculate rhomb orientation based on active families
        const activeFamilies = [];
        for (let family = 0; family < 5; family++) {
            let transitions = 0;
            const familySig = region.signature[family];

            for (let i = 1; i < familySig.length; i++) {
                if (familySig[i] !== familySig[i - 1]) {
                    transitions++;
                }
            }

            if (transitions === 2) {
                activeFamilies.push(family);
            }
        }

        if (activeFamilies.length !== 2) return null;

        // Calculate rhomb vertices
        const angle1 = activeFamilies[0] * CONFIG.TAU / 5;
        const angle2 = activeFamilies[1] * CONFIG.TAU / 5;
        const avgAngle = (angle1 + angle2) / 2;

        const acuteAngle = isThick ? Math.PI / 5 : 2 * Math.PI / 5; // 36° or 72°
        const longDiag = 2 * size / Math.sin(acuteAngle / 2);
        const shortDiag = 2 * size * Math.sin(acuteAngle / 2);

        const vertices = [];
        for (let i = 0; i < 4; i++) {
            const angle = avgAngle + i * Math.PI / 2;
            const radius = (i % 2 === 0) ? longDiag / 2 : shortDiag / 2;

            vertices.push({
                x: region.center.x + radius * Math.cos(angle),
                y: region.center.y + radius * Math.sin(angle)
            });
        }

        return {
            center: region.center,
            vertices,
            type: region.type,
            families: activeFamilies
        };
    }

    /**
     * Validates rhomb geometry
     * @param {Object} rhomb - Rhomb object to validate
     * @returns {boolean} - True if rhomb is valid
     */
    validateRhomb(rhomb) {
        if (!rhomb || !rhomb.vertices || !Array.isArray(rhomb.vertices)) {
            return false;
        }

        if (rhomb.vertices.length !== 4) {
            return false;
        }

        // Check that all vertices have valid coordinates
        return rhomb.vertices.every(vertex =>
            vertex &&
            typeof vertex.x === 'number' &&
            typeof vertex.y === 'number' &&
            isFinite(vertex.x) &&
            isFinite(vertex.y)
        );
    }

    /**
     * Filters out overlapping rhombs using optimized spatial partitioning
     * @param {Array} rhombList - Array of rhomb objects
     * @returns {Array} - Filtered array without overlaps
     */
    filterOverlappingRhombs(rhombList) {
        if (!Array.isArray(rhombList) || rhombList.length === 0) {
            return [];
        }

        const filtered = [];
        const minDistance = CONFIG.SPACING * 0.6;
        const minDistanceSquared = minDistance * minDistance;

        // Sort by x-coordinate for faster spatial queries
        const sorted = [...rhombList].sort((a, b) => a.center.x - b.center.x);

        for (let i = 0; i < sorted.length; i++) {
            const rhomb = sorted[i];
            let isOverlapping = false;

            // Early termination using spatial partitioning
            for (let j = 0; j < filtered.length; j++) {
                const existing = filtered[j];

                // Quick x-axis check
                if (Math.abs(rhomb.center.x - existing.center.x) > minDistance) {
                    continue;
                }

                // Calculate squared distance (avoid expensive sqrt)
                const dx = rhomb.center.x - existing.center.x;
                const dy = rhomb.center.y - existing.center.y;
                const distSquared = dx * dx + dy * dy;

                if (distSquared < minDistanceSquared) {
                    isOverlapping = true;
                    break;
                }
            }

            if (!isOverlapping) {
                filtered.push(rhomb);
            }
        }

        return filtered;
    }
}

/**
 * Penrose tiling renderer class
 */
class PenroseRenderer {
    constructor(state) {
        this.state = state;
    }

    /**
     * Main render method with error handling
     */
    render() {
        try {
            if (this.state.showGrid && this.state.gridLines.length > 0) {
                this.drawGrid();
            }

            if (this.state.showRhombs && this.state.rhombs.length > 0) {
                this.drawRhombs();
            }
        } catch (error) {
            console.error('Rendering error:', error);
            // Fallback: draw error message
            fill(255, 0, 0);
            text('Rendering Error - Press SPACE to regenerate', 0, 0);
        }
    }

    /**
     * Draws the pentagrid lines
     */
    drawGrid() {
        strokeWeight(1);

        for (let family = 0; family < 5; family++) {
            stroke(CONFIG.GRID_COLORS[family]);

            for (const line of this.state.gridLines[family]) {
                this.drawLine(line);
            }
        }
    }

    /**
     * Draws a single grid line across the canvas
     * @param {Object} gridLine - Line object with normal form parameters
     */
    drawLine(gridLine) {
        // Draw infinite line across canvas
        const size = CONFIG.GRID_SIZE;

        // Find two points on the line
        let x1, y1, x2, y2;

        if (Math.abs(gridLine.nx) > Math.abs(gridLine.ny)) {
            // More vertical line
            y1 = -size;
            y2 = size;
            x1 = (gridLine.offset - gridLine.ny * y1) / gridLine.nx;
            x2 = (gridLine.offset - gridLine.ny * y2) / gridLine.nx;
        } else {
            // More horizontal line
            x1 = -size;
            x2 = size;
            y1 = (gridLine.offset - gridLine.nx * x1) / gridLine.ny;
            y2 = (gridLine.offset - gridLine.nx * x2) / gridLine.ny;
        }

        line(x1, y1, x2, y2);
    }

    /**
     * Draws all rhomb shapes with error handling
     */
    drawRhombs() {
        strokeWeight(1.5);

        for (const rhomb of this.state.rhombs) {
            try {
                if (!rhomb || !rhomb.vertices || rhomb.vertices.length !== 4) {
                    continue;
                }

                // Set colors based on rhomb type
                if (rhomb.type === 'thick') {
                    fill(CONFIG.RHOMB_COLORS[0]);
                    stroke(120, 80, 60);
                } else if (rhomb.type === 'thin') {
                    fill(CONFIG.RHOMB_COLORS[1]);
                    stroke(60, 80, 120);
                } else {
                    continue; // Skip unknown types
                }

                // Draw rhomb shape
                beginShape();
                for (const vertex of rhomb.vertices) {
                    if (vertex && typeof vertex.x === 'number' && typeof vertex.y === 'number') {
                        vertex(vertex.x, vertex.y);
                    }
                }
                endShape(CLOSE);
            } catch (error) {
                console.warn('Error drawing rhomb:', error);
                continue;
            }
        }
    }
}

/**
 * P5.js key press handler
 */
function keyPressed() {
    const keyHandler = new KeyHandler(appState);
    keyHandler.handleKey(key);
}

/**
 * Key input handler class
 */
class KeyHandler {
    constructor(state) {
        this.state = state;
    }

    /**
     * Handles key press events
     * @param {string} pressedKey - The key that was pressed
     */
    handleKey(pressedKey) {
        switch (pressedKey.toLowerCase()) {
            case 'g':
                this.state.toggleGrid();
                break;
            case 'r':
                this.state.toggleRhombs();
                break;
            case ' ':
                this.regenerateTiling();
                break;
        }
    }

    /**
     * Regenerates the entire tiling with new random parameters
     */
    regenerateTiling() {
        this.state.randomizeGammas();
        const generator = new PenroseGenerator(this.state);
        generator.generateTiling();
        console.log('Regenerated tiling');
    }
}