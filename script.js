const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL wird von Ihrem Browser nicht unterstützt.");
}

const vertexShaderSource = `
    attribute vec2 aPosition;
    attribute vec3 aColor;
    varying vec3 vColor;
    void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vColor = aColor;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Fehler beim Kompilieren des Shaders:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Fehler beim Verlinken des Programms:", gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

gl.useProgram(program);

function createStarVertices(radius, innerRadius, numPoints, offsetX = 0, offsetY = 0) {
    let vertices = [];
    const angleStep = Math.PI / numPoints;

    for (let i = 0; i < numPoints * 2; i++) {
        const angle = i * angleStep;
        const r = i % 2 === 0 ? radius : innerRadius;
        const x = r * Math.cos(angle) + offsetX;
        const y = r * Math.sin(angle) + offsetY;
        vertices.push(x, y);
    }
    return vertices;
}

// Stern-Geometrie mit 5 Spitzen
const outerRadius = 0.5;
const innerRadius = 0.2;
const numPoints = 5;

const starVertices1 = createStarVertices(outerRadius, innerRadius, numPoints);
const starVertices2 = createStarVertices(outerRadius * 0.5, innerRadius * 0.5, numPoints);

const colors1 = [
    [1.0, 1.0, 0.0],
];

const colors2 = [
    [1.0, 0.0, 1.0], // Magenta
    [0.0, 0.0, 1.0], // Blau
];

const centerColor1 = [1.0, 1.0, 0.0]; 
const centerColor2 = [1.0, 1.0, 1.0];

let vertices = [];
let starColors = [];

for (let i = 0; i < numPoints * 2; i++) {
    const nextIndex = (i + 1) % (numPoints * 2);
    vertices.push(0.0, 0.0); // Zent
    vertices.push(starVertices1[i * 2], starVertices1[i * 2 + 1]);
    vertices.push(starVertices1[nextIndex * 2], starVertices1[nextIndex * 2 + 1]);

    starColors.push(...centerColor1);
    starColors.push(...colors1[0]); 
    starColors.push(...colors1[0]);
}

// Innerer Stern (Magenta-Blau)
for (let i = 0; i < numPoints * 2; i++) {
    const nextIndex = (i + 1) % (numPoints * 2);
    vertices.push(0.0, 0.0);
    vertices.push(starVertices2[i * 2], starVertices2[i * 2 + 1]);
    vertices.push(starVertices2[nextIndex * 2], starVertices2[nextIndex * 2 + 1]);

    starColors.push(...centerColor2);
    starColors.push(...colors2[i % 2]); 
    starColors.push(...colors2[nextIndex % 2]); 
}

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starColors), gl.STATIC_DRAW);

const aColor = gl.getAttribLocation(program, 'aColor');
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aColor);

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
