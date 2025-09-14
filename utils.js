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

    rhombPoints.push({ points, intersection });
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