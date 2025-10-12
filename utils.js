// Constants for mathematical calculations
const EPSILON = 0.001;
const RIGHT_ANGLE = 90;
const ANGLE_TOLERANCE = 0.001;

/**
 * Determine the intersection point of two line segments
 * Based on line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
 * @param {Object} line1 - First line segment with x1, y1, x2, y2 properties
 * @param {Object} line2 - Second line segment with x1, y1, x2, y2 properties
 * @returns {Object|boolean} Intersection point with x, y coordinates or false if no intersection
 */
function intersect(line1, line2) {
    const { x1, y1, x2, y2 } = line1;
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

    // Check if either line has zero length
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return false;
    }

    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
  
    // Lines are parallel
    if (denominator === 0) {
        return false;
    }

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

    // Check if intersection is along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return false;
    }

    // Calculate intersection coordinates
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);

    return { x, y, line1, line2 };
}

/**
 * Calculate the angle between two line segments
 * @param {number} x1, y1, x2, y2 - First line coordinates
 * @param {number} x3, y3, x4, y4 - Second line coordinates
 * @returns {number} Angle in degrees (0-90)
 */
function getAngleBetweenLines(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Create direction vectors
    const v1 = { x: x2 - x1, y: y2 - y1 };
    const v2 = { x: x4 - x3, y: y4 - y3 };

    // Calculate dot product
    const dotProduct = v1.x * v2.x + v1.y * v2.y;

    // Calculate magnitudes
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    // Avoid division by zero
    if (mag1 === 0 || mag2 === 0) {
        return 0;
    }

    // Calculate angle in radians, clamping to avoid floating point errors
    const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
    const angleRad = Math.acos(cosAngle);

    // Convert to degrees and return acute angle
    const angleDeg = angleRad * 180 / Math.PI;
    return angleDeg > RIGHT_ANGLE ? 180 - angleDeg : angleDeg;
}

/**
 * Calculate and create a rhombus from line intersection
 * @param {Object} intersection - Intersection object with line1, line2, x, y properties
 */
function findRhomb(intersection) {
    if (!intersection || !intersection.line1 || !intersection.line2) {
        console.warn('Invalid intersection data provided to findRhomb');
        return;
    }

    // Calculate rhombus angles based on family relationships
    const angle1 = intersection.line2.angle;
    const familyDiff = intersection.line2.family - intersection.line1.family;
    const angleMap = {
        1: (3 * PI) / 5,
        2: (1 * PI) / 5,
        3: (4 * PI) / 5,
        4: (2 * PI) / 5
    };

    const angle2 = angle1 + (angleMap[familyDiff] || 0);

    // Create base vectors and calculate rhombus vertices
    const intersectionPoint = createVector(intersection.x, intersection.y);
    const halfScale = SCALE / 2;

    // Direction vectors
    const dir1Vector = createVector(cos(angle1), sin(angle1)).mult(SCALE);
    const dir2Vector = createVector(cos(angle2), sin(angle2)).mult(SCALE);

    // Shift vectors for rhombus positioning
    const shift1 = createVector(cos(angle1), sin(angle1)).mult(halfScale);
    const shift2 = createVector(cos(angle2), sin(angle2)).mult(halfScale);

    // Calculate rhombus vertices
    const start = p5.Vector.sub(intersectionPoint, p5.Vector.add(shift1, shift2));
    const dir1 = p5.Vector.add(dir1Vector, intersectionPoint).sub(shift1).sub(shift2);
    const dir2 = p5.Vector.add(dir2Vector, intersectionPoint).sub(shift1).sub(shift2);
    const dir3 = p5.Vector.add(dir2, dir1).sub(intersectionPoint).add(shift1).add(shift2);

    const points = [
        [start.x, start.y],
        [dir1.x, dir1.y],
        [dir3.x, dir3.y],
        [dir2.x, dir2.y]
    ];

    // Validate rhombus perpendicularity
    const angleBetweenPoint01Line2 = getAngleBetweenLines(
        points[0][0], points[0][1], points[1][0], points[1][1],
        intersection.line2.x1, intersection.line2.y1, intersection.line2.x2, intersection.line2.y2
    );
    const angleBetweenPoint12Line1 = getAngleBetweenLines(
        points[1][0], points[1][1], points[2][0], points[2][1],
        intersection.line1.x1, intersection.line1.y1, intersection.line1.x2, intersection.line1.y2
    );

    const isPerpendicular =
        Math.abs(angleBetweenPoint01Line2 - RIGHT_ANGLE) < ANGLE_TOLERANCE &&
        Math.abs(angleBetweenPoint12Line1 - RIGHT_ANGLE) < ANGLE_TOLERANCE;

    if (isPerpendicular) {
        console.log('perpendicular', intersection.line1.family, intersection.line2.family);
    } else {
        console.log('not perpendicular', intersection.line1.family, intersection.line2.family);
        console.log(angleBetweenPoint01Line2, angleBetweenPoint12Line1);
    }

    // Save original points for reset functionality
    const originalPoints = points.map(p => [p[0], p[1]]);

    rhombPoints.push({ points, intersection, aligned: false, originalPoints });
}

/**
 * Draw the grid lines with family-specific colors
 */
function drawGrid() {
    strokeWeight(1);

    for (const familyLines of gridLines) {
        for (const gridLine of familyLines) {
            const color = colors[gridLine.family];
            if (color && color.length >= 3) {
                stroke(color[0], color[1], color[2], 100);
                line(gridLine.x1, gridLine.y1, gridLine.x2, gridLine.y2);
            }
        }
    }
}

/**
 * Generate a family of parallel grid lines
 * @param {number} k - Family index (0-4)
 * @returns {Array} Array of line objects
 */
function findGridFamily(k) {
    if (k < 0 || k >= 5) {
        console.warn(`Invalid family index: ${k}. Expected 0-4.`);
        return [];
    }

    const angle = (k * TWO_PI) / 5;
    const cosAngle = cos(angle);
    const sinAngle = sin(angle);

    const familyLines = [];

    // Generate parallel lines for this family
    for (let n = -NUM_LINES; n <= NUM_LINES; n++) {
        const d = n * SPACING + GAMMAS[k] * SPACING;

        // Calculate line endpoints using parametric form
        const x1 = -GRID_SIZE * sinAngle + cosAngle * d;
        const y1 = GRID_SIZE * cosAngle + sinAngle * d;
        const x2 = GRID_SIZE * sinAngle + cosAngle * d;
        const y2 = -GRID_SIZE * cosAngle + sinAngle * d;

        // Store line in standard form ax + by = c
        familyLines.push({
            a: sinAngle,       // coefficient of x
            b: -cosAngle,      // coefficient of y
            c: d,              // constant term
            angle,             // line angle
            family: k,         // family index
            n,                 // line number within family
            x1, y1, x2, y2     // endpoints
        });
    }

    return familyLines;
}

/**
 * Find all intersections between grid line families
 */
function findIntersections() {
    if (!gridLines || gridLines.length === 0) {
        console.warn('No grid lines available for intersection calculation');
        return;
    }

    // Clear previous intersections
    intersections.length = 0;

    // Check all pairs of different families
    for (let i = 0; i < gridLines.length; i++) {
        for (let j = i + 1; j < gridLines.length; j++) {
            const family1 = gridLines[i];
            const family2 = gridLines[j];

            // Find intersections between lines from different families
            for (const line1 of family1) {
                for (const line2 of family2) {
                    const intersection = intersect(line1, line2);
                    if (intersection) {
                        intersections.push(intersection);
                    }
                }
            }
        }
    }
}

/**
 * Draw intersection points as small circles
 */
function drawIntersections() {
    fill(0);
    strokeWeight(3);

    for (const intersection of intersections) {
        ellipse(intersection.x, intersection.y, 2, 2);
    }
}

/**
 * Draw all rhombus shapes
 */
function drawRhomb() {
    noFill();
    stroke(0);
    strokeWeight(1);

    for (const rhomb of rhombPoints) {
        if (!rhomb.points || rhomb.points.length === 0) {
            continue;
        }

        beginShape();
        for (const point of rhomb.points) {
            vertex(point[0], point[1]);
        }
        endShape(CLOSE);
    }
}

/**
 * Draw the adjacency graph showing connections between rhombuses
 */
function drawGraph() {
    stroke(255, 0, 255); // Bright magenta
    strokeWeight(3);

    let edgeCount = 0;

    // Draw edges between adjacent rhombuses
    for (let i = 0; i < rhombPoints.length; i++) {
        const rhomb = rhombPoints[i];
        const neighbors = rhombGraph.get(i) || [];

        // Get center of current rhombus
        const centerX = rhomb.intersection.x;
        const centerY = rhomb.intersection.y;

        // Draw line to each neighbor
        for (const neighborIdx of neighbors) {
            // Only draw each edge once (from lower index to higher index)
            if (neighborIdx > i) {
                const neighbor = rhombPoints[neighborIdx];
                const neighborCenterX = neighbor.intersection.x;
                const neighborCenterY = neighbor.intersection.y;

                line(centerX, centerY, neighborCenterX, neighborCenterY);
                edgeCount++;
            }
        }
    }

    console.log(`Drew ${edgeCount} graph edges`);
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {number} x - Point x coordinate
 * @param {number} y - Point y coordinate
 * @param {Object} polygon - Polygon object with points array
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(x, y, polygon) {
    if (!polygon || !polygon.points || polygon.points.length < 3) {
        return false;
    }

    let inside = false;
    const points = polygon.points;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0];
        const yi = points[i][1];
        const xj = points[j][0];
        const yj = points[j][1];

        const intersectsRay = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersectsRay) {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * Build adjacency graph for rhombuses
 * Two rhombuses are adjacent if they share an edge on the same grid line
 * For each rhombus at intersection (line_i, line_j), find neighbors by looking at
 * adjacent intersections along line_i and line_j
 */
function buildRhombGraph() {
    rhombGraph.clear();

    // Initialize adjacency list for each rhombus
    for (let i = 0; i < rhombPoints.length; i++) {
        rhombGraph.set(i, []);
    }

    // For each rhombus, find its 4 neighbors by looking at intersections
    // on the same grid lines
    for (let i = 0; i < rhombPoints.length; i++) {
        const rhomb = rhombPoints[i];
        const line1 = rhomb.intersection.line1;
        const line2 = rhomb.intersection.line2;

        // Find all intersections on line1 and line2
        const intersectionsOnLine1 = [];
        const intersectionsOnLine2 = [];

        for (let j = 0; j < rhombPoints.length; j++) {
            if (i === j) continue;

            const otherRhomb = rhombPoints[j];
            const otherLine1 = otherRhomb.intersection.line1;
            const otherLine2 = otherRhomb.intersection.line2;

            // Check if other rhombus shares line1
            if ((otherLine1.family === line1.family && otherLine1.n === line1.n) ||
                (otherLine2.family === line1.family && otherLine2.n === line1.n)) {
                intersectionsOnLine1.push({
                    index: j,
                    x: otherRhomb.intersection.x,
                    y: otherRhomb.intersection.y
                });
            }

            // Check if other rhombus shares line2
            if ((otherLine1.family === line2.family && otherLine1.n === line2.n) ||
                (otherLine2.family === line2.family && otherLine2.n === line2.n)) {
                intersectionsOnLine2.push({
                    index: j,
                    x: otherRhomb.intersection.x,
                    y: otherRhomb.intersection.y
                });
            }
        }

        // Find the closest neighbor on line1 (in both directions along the line)
        const neighborsOnLine1 = findClosestNeighborsOnLine(
            rhomb.intersection.x, rhomb.intersection.y, line1, intersectionsOnLine1
        );

        // Find the closest neighbor on line2 (in both directions along the line)
        const neighborsOnLine2 = findClosestNeighborsOnLine(
            rhomb.intersection.x, rhomb.intersection.y, line2, intersectionsOnLine2
        );

        // Add neighbors on line1 with shared line info and direction
        for (const neighborData of neighborsOnLine1) {
            rhombGraph.get(i).push({
                neighborIndex: neighborData.index,
                sharedLine: line1,
                direction: neighborData.direction  // 'forward' or 'backward' relative to this rhombus
            });
        }

        // Add neighbors on line2 with shared line info and direction
        for (const neighborData of neighborsOnLine2) {
            rhombGraph.get(i).push({
                neighborIndex: neighborData.index,
                sharedLine: line2,
                direction: neighborData.direction
            });
        }
    }

    console.log(`Built graph with ${rhombPoints.length} vertices`);
    // Log degree distribution
    let totalDegree = 0;
    for (let i = 0; i < rhombPoints.length; i++) {
        totalDegree += rhombGraph.get(i).length;
    }
    console.log(`Average degree: ${(totalDegree / rhombPoints.length).toFixed(2)}`);
}

/**
 * Find the closest neighbors along a line in both directions
 * @param {number} x - Current intersection x
 * @param {number} y - Current intersection y
 * @param {Object} line - Grid line object
 * @param {Array} candidates - Array of candidate intersections on the same line
 * @returns {Array} Array of objects with {index, direction} where direction is 'forward' or 'backward'
 */
function findClosestNeighborsOnLine(x, y, line, candidates) {
    if (candidates.length === 0) {
        return [];
    }

    // Calculate direction along the line using the actual line endpoints
    const lineDx = line.x2 - line.x1;
    const lineDy = line.y2 - line.y1;
    const lineLength = Math.sqrt(lineDx * lineDx + lineDy * lineDy);

    // Normalize to get unit direction vector
    const lineDir = {
        x: lineDx / lineLength,
        y: lineDy / lineLength
    };

    // Classify candidates as "forward" or "backward" along the line
    const forward = [];
    const backward = [];

    for (const candidate of candidates) {
        const dx = candidate.x - x;
        const dy = candidate.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Skip if same point
        if (distance < EPSILON) {
            continue;
        }

        // Project onto line direction to determine which side
        const projection = dx * lineDir.x + dy * lineDir.y;

        if (projection > EPSILON) {
            forward.push({ index: candidate.index, distance });
        } else if (projection < -EPSILON) {
            backward.push({ index: candidate.index, distance });
        }
    }

    const neighbors = [];

    // Find closest in forward direction
    if (forward.length > 0) {
        forward.sort((a, b) => a.distance - b.distance);
        neighbors.push({ index: forward[0].index, direction: 'forward' });
    }

    // Find closest in backward direction
    if (backward.length > 0) {
        backward.sort((a, b) => a.distance - b.distance);
        neighbors.push({ index: backward[0].index, direction: 'backward' });
    }

    return neighbors;
}

/**
 * Get unaligned adjacent rhombuses for a given rhombus
 * @param {number} rhombIndex - Index of the rhombus
 * @returns {Array} Array of {neighborIndex, sharedLine} objects for unaligned neighbors
 */
function getUnalignedAdjacentTiles(rhombIndex) {
    const adjacentData = rhombGraph.get(rhombIndex) || [];
    return adjacentData.filter(data => !rhombPoints[data.neighborIndex].aligned);
}

/**
 * Calculate alignment offset using shared line information
 * @param {Object} startRhomb - Starting rhombus (already aligned)
 * @param {Object} adjacentRhomb - Adjacent rhombus to align
 * @param {Object} sharedLine - The grid line they both share
 * @param {string} direction - 'forward' or 'backward' - which direction the neighbor is relative to start
 * @returns {Object} Offset vector {x, y}
 */
function calculateAlignmentOffset(startRhomb, adjacentRhomb, sharedLine, direction) {
    // Find which edges are on the shared line (perpendicular to it)
    // Start rhombus uses the edge in the direction of the neighbor
    // Adjacent rhombus uses the edge in the opposite direction (toward start)
    const startEdge = findEdgeOnLine(startRhomb, sharedLine, direction);
    const adjEdge = findEdgeOnLine(adjacentRhomb, sharedLine, direction === 'forward' ? 'backward' : 'forward');

    if (!startEdge || !adjEdge) {
        console.warn('Could not find edges on shared line');
        return { x: 0, y: 0 };
    }

    // Calculate offset to align the two edges
    // Average the offsets needed for both vertices of the edge
    const offset1 = {
        x: startEdge.v1[0] - adjEdge.v1[0],
        y: startEdge.v1[1] - adjEdge.v1[1]
    };
    const offset2 = {
        x: startEdge.v2[0] - adjEdge.v2[0],
        y: startEdge.v2[1] - adjEdge.v2[1]
    };

    return {
        x: (offset1.x + offset2.x) / 2,
        y: (offset1.y + offset2.y) / 2
    };
}

/**
 * Find the edge of a rhombus that lies on (is perpendicular to) a given grid line
 * @param {Object} rhomb - The rhombus
 * @param {Object} line - The grid line
 * @param {string} direction - 'forward' or 'backward' - which perpendicular edge to pick
 * @returns {Object} Edge with v1 and v2 vertices, or null
 */
function findEdgeOnLine(rhomb, line, direction) {
    const points = rhomb.points;
    const perpEdges = [];

    // Calculate line direction vector
    const lineDx = line.x2 - line.x1;
    const lineDy = line.y2 - line.y1;
    const lineLength = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
    const lineDir = {
        x: lineDx / lineLength,
        y: lineDy / lineLength
    };

    // Find all edges perpendicular to the line
    for (let i = 0; i < 4; i++) {
        const v1 = points[i];
        const v2 = points[(i + 1) % 4];

        // Check if this edge is perpendicular to the line
        const angle = getAngleBetweenLines(
            v1[0], v1[1], v2[0], v2[1],
            line.x1, line.y1, line.x2, line.y2
        );

        if (Math.abs(angle - RIGHT_ANGLE) < ANGLE_TOLERANCE) {
            // Calculate edge center
            const edgeCenterX = (v1[0] + v2[0]) / 2;
            const edgeCenterY = (v1[1] + v2[1]) / 2;

            // Calculate projection of edge center relative to rhombus intersection
            const dx = edgeCenterX - rhomb.intersection.x;
            const dy = edgeCenterY - rhomb.intersection.y;
            const projection = dx * lineDir.x + dy * lineDir.y;

            perpEdges.push({ v1, v2, projection });
        }
    }

    if (perpEdges.length !== 2) {
        console.warn(`Expected 2 perpendicular edges, found ${perpEdges.length}`);
        return perpEdges[0] || null;
    }

    // Pick the edge based on direction
    // 'forward' means pick the edge with positive projection
    // 'backward' means pick the edge with negative projection
    if (direction === 'forward') {
        return perpEdges[0].projection > perpEdges[1].projection ? perpEdges[0] : perpEdges[1];
    } else {
        return perpEdges[0].projection < perpEdges[1].projection ? perpEdges[0] : perpEdges[1];
    }
}

/**
 * Realign a rhombus by applying an offset to all its points
 * @param {Object} rhomb - Rhombus to realign
 * @param {Object} offset - Offset vector {x, y}
 */
function realignRhombus(rhomb, offset) {
    for (const point of rhomb.points) {
        point[0] += offset.x;
        point[1] += offset.y;
    }
}

/**
 * Align all rhombuses using BFS algorithm
 */
function alignRhombuses() {
    if (rhombPoints.length === 0) {
        console.warn('No rhombuses to align');
        return;
    }

    // Start with the first rhombus
    const queue = [0];
    rhombPoints[0].aligned = true;

    let alignedCount = 1;

    while (queue.length > 0) {
        // Get the front element of the queue
        const startingTileIndex = queue.shift();
        const startingTile = rhombPoints[startingTileIndex];

        // Find the (up to 4) tiles that are adjacent to it and unaligned
        const adjacentTileData = getUnalignedAdjacentTiles(startingTileIndex);

        // For each tile we found
        for (const data of adjacentTileData) {
            const adjacentIndex = data.neighborIndex;
            const sharedLine = data.sharedLine;
            const direction = data.direction;
            const adjacentTile = rhombPoints[adjacentIndex];

            // Move it to touch this tile using the shared line information and direction
            const offset = calculateAlignmentOffset(startingTile, adjacentTile, sharedLine, direction);
            realignRhombus(adjacentTile, offset);

            // Mark it as aligned
            adjacentTile.aligned = true;
            alignedCount++;

            // Add it to the queue
            queue.push(adjacentIndex);
        }
    }

    console.log(`Aligned ${alignedCount} out of ${rhombPoints.length} rhombuses`);
}

/**
 * Reset all rhombuses to their original positions
 */
function resetRhombuses() {
    for (const rhomb of rhombPoints) {
        // Restore original points
        for (let i = 0; i < rhomb.points.length; i++) {
            rhomb.points[i][0] = rhomb.originalPoints[i][0];
            rhomb.points[i][1] = rhomb.originalPoints[i][1];
        }
        // Reset aligned flag
        rhomb.aligned = false;
    }

    console.log('Reset all rhombuses to original positions');
}