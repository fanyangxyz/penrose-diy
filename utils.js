/**
 * Utility functions for Penrose tiling generation
 * Contains specialized geometry and math functions not available in p5.js
 */

/**
 * GeometryUtils class for advanced geometric operations
 */
class GeometryUtils {
    /**
     * Check if a point is inside a polygon using the ray casting algorithm
     * @param {number} x - x coordinate of the point
     * @param {number} y - y coordinate of the point
     * @param {Array} vertices - Array of vertices [{x, y}, ...]
     * @returns {boolean} - True if point is inside polygon
     */
    static isPointInPolygon(x, y, vertices) {
        let inside = false;

        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x;
            const yi = vertices[i].y;
            const xj = vertices[j].x;
            const yj = vertices[j].y;

            const intersect = ((yi > y) !== (yj > y)) &&
                              (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Calculate the angle between two vectors
     * @param {number} x1 - x component of first vector
     * @param {number} y1 - y component of first vector
     * @param {number} x2 - x component of second vector
     * @param {number} y2 - y component of second vector
     * @returns {number} - Angle in radians
     */
    static angleBetweenVectors(x1, y1, x2, y2) {
        const dot = x1 * x2 + y1 * y2;
        const mag1 = Math.sqrt(x1 * x1 + y1 * y1);
        const mag2 = Math.sqrt(x2 * x2 + y2 * y2);

        if (mag1 === 0 || mag2 === 0) return 0;

        const cosAngle = dot / (mag1 * mag2);
        return Math.acos(Math.max(-1, Math.min(1, cosAngle))); // Clamp to prevent NaN
    }

    /**
     * Normalize an angle to be between 0 and 2π
     * @param {number} angle - Angle in radians
     * @returns {number} - Normalized angle
     */
    static normalizeAngle(angle) {
        const TWO_PI = 2 * Math.PI;
        let normalizedAngle = angle % TWO_PI;
        return normalizedAngle < 0 ? normalizedAngle + TWO_PI : normalizedAngle;
    }

    /**
     * Calculates the centroid of a polygon
     * @param {Array} vertices - Array of vertex objects {x, y}
     * @returns {Object} - Centroid coordinates {x, y}
     */
    static calculateCentroid(vertices) {
        if (vertices.length === 0) return { x: 0, y: 0 };

        const centroid = vertices.reduce(
            (acc, vertex) => ({
                x: acc.x + vertex.x,
                y: acc.y + vertex.y
            }),
            { x: 0, y: 0 }
        );

        return {
            x: centroid.x / vertices.length,
            y: centroid.y / vertices.length
        };
    }

    /**
     * Calculates the area of a polygon using the shoelace formula
     * @param {Array} vertices - Array of vertex objects {x, y}
     * @returns {number} - Polygon area
     */
    static calculatePolygonArea(vertices) {
        if (vertices.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }
        return Math.abs(area) / 2;
    }

    /**
     * Checks if two line segments intersect
     * @param {Object} line1 - First line {start: {x, y}, end: {x, y}}
     * @param {Object} line2 - Second line {start: {x, y}, end: {x, y}}
     * @returns {boolean} - True if lines intersect
     */
    static doLinesIntersect(line1, line2) {
        const { start: p1, end: q1 } = line1;
        const { start: p2, end: q2 } = line2;

        const orientation = (p, q, r) => {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (val === 0) return 0; // collinear
            return val > 0 ? 1 : 2; // clockwise or counterclockwise
        };

        const o1 = orientation(p1, q1, p2);
        const o2 = orientation(p1, q1, q2);
        const o3 = orientation(p2, q2, p1);
        const o4 = orientation(p2, q2, q1);

        // General case
        if (o1 !== o2 && o3 !== o4) return true;

        return false;
    }
}

/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
    constructor() {
        this.timers = new Map();
    }

    /**
     * Start timing an operation
     * @param {string} label - Operation label
     */
    start(label) {
        this.timers.set(label, performance.now());
    }

    /**
     * End timing and log result
     * @param {string} label - Operation label
     * @returns {number} - Elapsed time in milliseconds
     */
    end(label) {
        const startTime = this.timers.get(label);
        if (startTime) {
            const elapsed = performance.now() - startTime;
            console.log(`${label}: ${elapsed.toFixed(2)}ms`);
            this.timers.delete(label);
            return elapsed;
        }
        return 0;
    }

    /**
     * Measure function execution time
     * @param {string} label - Operation label
     * @param {Function} fn - Function to measure
     * @returns {*} - Function result
     */
    measure(label, fn) {
        this.start(label);
        const result = fn();
        this.end(label);
        return result;
    }
}