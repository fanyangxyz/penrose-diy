// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect(line1, line2) {
    let x1 = line1.x1;
    let y1 = line1.y1;
    let x2 = line1.x2;
    let y2 = line1.y2;
    let x3 = line2.x1;
    let y3 = line2.y1;
    let x4 = line2.x2;
    let y4 = line2.y2;
  
    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return false
    }
  
    denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
  
    // Lines are parallel
    if (denominator === 0) {
        return false
    }
  
    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator
  
    // is the intersection along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return false
    }
  
    // Return a object with the x and y coordinates of the intersection
    let x = x1 + ua * (x2 - x1)
    let y = y1 + ua * (y2 - y1)
  
    return {x, y, line1, line2}
}

function getAngleBetweenLines(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Get vectors
  let v1 = {x: x2 - x1, y: y2 - y1};
  let v2 = {x: x4 - x3, y: y4 - y3};
  
  // Calculate dot product
  let dotProduct = v1.x * v2.x + v1.y * v2.y;
  
  // Calculate magnitudes
  let mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  let mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  // Calculate angle in radians
  let angleRad = Math.acos(dotProduct / (mag1 * mag2));

  // Convert to degrees and return smaller angle
  let angleDeg = angleRad * 180 / Math.PI;
  return angleDeg > 90 ? 180 - angleDeg : angleDeg;
}

function findRhomb(intersection) {
  // Calculate vertices of the rhomb
  let  angle1 = intersection.line2.angle;
  let angle2;
  if (intersection.line1.family + 1 == intersection.line2.family) {
    angle2 = (3 * PI) / 5;
  } else if (intersection.line1.family + 2 == intersection.line2.family) {
    angle2 = (1 * PI) / 5;
  } else if (intersection.line1.family + 3 == intersection.line2.family) {
    angle2 = (4 * PI) / 5;
  } else if (intersection.line1.family + 4 == intersection.line2.family) {
    angle2 = (2 * PI) / 5;
  }
  angle2 += angle1;

  const intrsction = createVector(intersection.x, intersection.y)
  let dir1 = createVector(cos(angle1), sin(angle1)).mult(SCALE).add(intrsction);
  let dir2 = createVector(cos(angle2), sin(angle2)).mult(SCALE).add(intrsction);
  let start = createVector(0, 0).add(intrsction);
  const shift1 = createVector(cos(angle1), sin(angle1)).mult(SCALE/2);
  const shift2 = createVector(cos(angle2), sin(angle2)).mult(SCALE/2);
  dir1.sub(shift1).sub(shift2); 
  dir2.sub(shift1).sub(shift2);
  start.sub(shift1).sub(shift2);
  const dir3 = p5.Vector.add(dir2, dir1).sub(intrsction).add(shift1).add(shift2);

  let points = [];
  points.push(
    [start.x, start.y],
    [dir1.x, dir1.y],
    [dir3.x, dir3.y],
    [dir2.x, dir2.y],
  );
  
  const angle_between_point_01_line_2 = getAngleBetweenLines(points[0][0], points[0][1], points[1][0], points[1][1], intersection.line2.x1, intersection.line2.y1, intersection.line2.x2, intersection.line2.y2);
  const angle_between_point_12_line_1 = getAngleBetweenLines(points[1][0], points[1][1], points[2][0], points[2][1], intersection.line1.x1, intersection.line1.y1, intersection.line1.x2, intersection.line1.y2);
  if (abs(angle_between_point_01_line_2 - 90) < 0.001 && abs(angle_between_point_12_line_1 - 90) < 0.001) {
     console.log('perpendicular', intersection.line1.family, intersection.line2.family);
  } else {
     console.log('not perpendicular', intersection.line1.family, intersection.line2.family);
     console.log(angle_between_point_01_line_2, angle_between_point_12_line_1);
  }

  rhombPoints.push({points: points, intersection: intersection});
}

function drawGrid() {
  strokeWeight(1);
  for (let familyLines of gridLines) {
    for (let l of familyLines) {
      stroke(colors[l.family][0], colors[l.family][1], colors[l.family][2], 100);
      line(l.x1, l.y1, l.x2, l.y2);
    }
  }
}

function findGridFamily(k) {
    const angle = (k * TWO_PI) / 5;
    const c = cos(angle);
    const s = sin(angle);
    
    let familyLines = [];
    
    // Draw parallel lines and store their equations
    for (let n = -NUM_LINES; n <= NUM_LINES; n++) {
        const d = n * SPACING + GAMMAS[k] * SPACING;
        
        // Calculate line endpoints using parametric form
        const x1 = -GRID_SIZE * s + c * d;
        const y1 = GRID_SIZE * c + s * d;
        const x2 = GRID_SIZE * s + c * d;
        const y2 = -GRID_SIZE * c + s * d;
        
        // Store line equation in ax + by = c format
        familyLines.push({
            a: s,              // coefficient of x
            b: -c,             // coefficient of y
            c: d,              // right hand side constant
            angle: angle,      // store angle for reference
            family: k,         // store family index
            n: n,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
        });
    }
    
    return familyLines;
}

function findIntersections() {
    // Iterate through all pairs of grid families
    for (let i = 0; i < gridLines.length; i++) {
        for (let j = i + 1; j < gridLines.length; j++) {
            // Iterate through all pairs of lines from different families
            for (let line1 of gridLines[i]) {
                for (let line2 of gridLines[j]) {
                    const intersection = intersect(line1, line2);
                    if (intersection) {
                        intersections.push(intersection);
                    }
                }
            }
        }
    }
}

function drawIntersections() {
  for (let intersection of intersections) {
    // noStroke();
    fill(0);
    strokeWeight(3);
    ellipse(intersection.x, intersection.y, 2, 2);
  }
}

function drawRhomb() {
  noFill();
  stroke(0);
  strokeWeight(1);  
  for (let i = 0; i < rhombPoints.length; i ++) {
    const points = rhombPoints[i].points;
    beginShape();
    for (let i = 0; i < points.length; i++) {
      vertex(points[i][0], points[i][1]);
    }
    endShape(CLOSE);
  }
}

function isPointInPolygon(x, y, polygon) {
  let inside = false;
  let points = polygon.points;
  
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let xi = points[i][0], yi = points[i][1];
    let xj = points[j][0], yj = points[j][1];
    
    let intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}