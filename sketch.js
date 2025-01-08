// Constants for the pentagrid
const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
const GRID_SIZE = 1200;
const NUM_LINES = 1; // Number of lines per grid family
const SPACING = 400; // Spacing between parallel lines
const SCALE = 55;
let GAMMAS;
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