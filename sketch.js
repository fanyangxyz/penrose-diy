// Constants for the pentagrid
const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
const GRID_SIZE = 1200;
const NUM_LINES = 2; // Number of lines per grid family
const SPACING = 200; // Spacing between parallel lines
const SCALE = 55;
let GAMMAS15i
const colors = [
    [255, 0, 0],    // Red
    [0, 255, 0],    // Green
    [0, 0, 255],    // Blue
    [255, 165, 0],  // Orange
    [128, 0, 128]   // Purple
];
// Store line equations for intersection calculation
let gridLines = [];
let rhombPoints = [];
let intersections = [];
let selected = null;

function setup() {
    randomSeed(0);
    createCanvas(GRID_SIZE, GRID_SIZE);
    background(240);
    translate(width/2, height/2);
    GAMMAS = [0.17, 0.21, 0.28, 0.3];
    GAMMAS.push(1. - GAMMAS[0] - GAMMAS[1] - GAMMAS[2] - GAMMAS[3]);
        
    // Draw five families of parallel lines and store their equations
    for (let k = 0; k < 5; k++) {
        gridLines.push(findGridFamily(k));
    }
    
    // Find and draw intersections
    findIntersections();

    for (let intersection of intersections) {
      findRhomb(intersection);
    }
    console.log('total number of rhombs', rhombPoints.length);
    moveRhombs();
  }

function moveRhombs() {
  let queue = [];
  let visited = new Set();
  const index = 0;
  rhombPoints[index].final_points.push([rhombPoints[index].points[0][0], rhombPoints[index].points[0][1]]);
  rhombPoints[index].final_points.push([rhombPoints[index].points[1][0], rhombPoints[index].points[1][1]]);
  rhombPoints[index].final_points.push([rhombPoints[index].points[2][0], rhombPoints[index].points[2][1]]);
  rhombPoints[index].final_points.push([rhombPoints[index].points[3][0], rhombPoints[index].points[3][1]]);
  queue.push(rhombPoints[index]);
  visited.add(index);
  while (queue.length > 0) {
    let rhomb = queue.shift();
    let min_distance = Infinity;
    let target_i = null;
    let target = null;

    for (let i = 0; i < rhombPoints.length; i++) {
      if (rhomb == rhombPoints[i]) continue;
      if (visited.has(i)) continue;
      if (rhombPoints[i].intersection.line1.family == rhomb.intersection.line1.family || rhombPoints[i].intersection.line2.family == rhomb.intersection.line2.family || rhombPoints[i].intersection.line1.family == rhomb.intersection.line2.family || rhombPoints[i].intersection.line2.family == rhomb.intersection.line1.family) {
        const distance = dist(rhomb.intersection.x, rhomb.intersection.y, rhombPoints[i].intersection.x, rhombPoints[i].intersection.y);
        if (distance < min_distance) {
          min_distance = distance;
          target_i = i;
          target = rhombPoints[i];
        }
      }
    }
    if (target == null) break;
    
    let move_vector = null;
    let min_segments_distance = Infinity;
    for (let m = 0; m < rhomb.points.length; m++) {
      for (let n = 0; n < target.points.length; n++) {
        const side_m = createVector(rhomb.points[m][0] - rhomb.points[(m + 1) % 4][0], rhomb.points[m][1] - rhomb.points[(m + 1) % 4][1]);
        const side_n = createVector(target.points[n][0] - target.points[(n + 1) % 4][0], target.points[n][1] - target.points[(n + 1) % 4][1]);
        if (areVectorsParallel(side_m, side_n)) {
          const segments_distance = lineSegmentDistance(rhomb.points[m][0], rhomb.points[m][1], rhomb.points[(m + 1) % 4][0], rhomb.points[(m + 1) % 4][1], target.points[n][0], target.points[n][1], target.points[(n + 1) % 4][0], target.points[(n + 1) % 4][1]);
          if (segments_distance < min_segments_distance) {
            move_vector = calculateShiftVector(rhomb.final_points[m][0], rhomb.final_points[m][1], rhomb.final_points[(m + 1) % 4][0], rhomb.final_points[(m + 1) % 4][1], target.points[n][0], target.points[n][1], target.points[(n + 1) % 4][0], target.points[(n + 1) % 4][1]);
            min_segments_distance = segments_distance;
          }
        }
      }
    }
    
    if (visited.size == 10) {
      console.log(move_vector.x, move_vector.y);
      // move_vector.x = 0;
      // move_vector.y = 0;
    }
    target.final_points.push([target.points[0][0] -  move_vector.x,  target.points[0][1] - move_vector.y]);
    target.final_points.push([target.points[1][0] -  move_vector.x,  target.points[1][1] - move_vector.y]);
    target.final_points.push([target.points[2][0] -  move_vector.x,  target.points[2][1] - move_vector.y]);
    target.final_points.push([target.points[3][0] -  move_vector.x,  target.points[3][1] - move_vector.y]);

    queue.push(target);
    visited.add(target_i);

    if (visited.size == 11) {
      break;
    }
  }
}

function draw() {
    background(255);
    translate(width/2, height/2);
    drawGrid();
    drawIntersections();
    drawRhomb();
}

function mousePressed() {
  for (let rhomb of rhombPoints) {
    const is_in = isPointInPolygon(mouseX - width/2, mouseY - height/2, rhomb);
    if (is_in) {
      console.log('in');
      selected = rhomb;
      return;
    }
  }
  selected = null;
}

function mouseDragged() {
  if (selected) {
    let dx = mouseX - pmouseX;
    let dy = mouseY - pmouseY;

    for (let point of selected.points) {
      point[0] += dx;
      point[1] += dy;
    }
  }
}

function mouseReleased() {
  selected = null;
}