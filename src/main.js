class AraucariaEngine {
    constructor() {
        let canvas = document.getElementById('canvas');
        let context = canvas.getContext("2d");
        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;
        context.translate(0.5, 0.5);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        this.canvas = canvas;
        this.context = context;
        this.meshCube = { tris: new Array() };
        this.matProj = { m: Array(4).fill(0).map(() => Array(4).fill(0)) };
        this.theta = 0;
    }
    onUserCreate() {
        const point000 = { x: 0, y: 0, z: 0 };
        const point001 = { x: 0, y: 0, z: 1 };
        const point010 = { x: 0, y: 1, z: 0 };
        const point011 = { x: 0, y: 1, z: 1 };
        const point100 = { x: 1, y: 0, z: 0 };
        const point101 = { x: 1, y: 0, z: 1 };
        const point110 = { x: 1, y: 1, z: 0 };
        const point111 = { x: 1, y: 1, z: 1 };
        let triangle0 = { p: new Array() };
        this.populateTriangle(triangle0, point000, point010, point110);
        let triangle1 = { p: new Array() };
        this.populateTriangle(triangle1, point000, point110, point100);
        let triangle2 = { p: new Array() };
        this.populateTriangle(triangle2, point100, point110, point111);
        let triangle3 = { p: new Array() };
        this.populateTriangle(triangle3, point100, point111, point101);
        let triangle4 = { p: new Array() };
        this.populateTriangle(triangle4, point101, point111, point011);
        let triangle5 = { p: new Array() };
        this.populateTriangle(triangle5, point101, point011, point001);
        let triangle6 = { p: new Array() };
        this.populateTriangle(triangle6, point001, point011, point010);
        let triangle7 = { p: new Array() };
        this.populateTriangle(triangle7, point001, point010, point000);
        let triangle8 = { p: new Array() };
        this.populateTriangle(triangle8, point010, point011, point111);
        let triangle9 = { p: new Array() };
        this.populateTriangle(triangle9, point010, point111, point110);
        let triangle10 = { p: new Array() };
        this.populateTriangle(triangle10, point101, point001, point000);
        let triangle11 = { p: new Array() };
        this.populateTriangle(triangle11, point101, point000, point100);
        this.meshCube.tris.push(triangle0, triangle1, triangle2, triangle3, triangle4, triangle5, triangle6, triangle7, triangle8, triangle9, triangle10, triangle11);
        let fNear = 0.1;
        let fFar = 1000;
        let fFov = 90;
        let fAspectRatio = window.innerHeight / window.innerWidth;
        let fFovRad = 1 / Math.tan(fFov * 0.5 / 180 * Math.PI);
        this.matProj.m[0][0] = fAspectRatio * fFovRad;
        this.matProj.m[1][1] = fFovRad;
        this.matProj.m[2][2] = fFar / (fFar - fNear);
        this.matProj.m[3][2] = (-fFar * fNear) / (fFar - fNear);
        this.matProj.m[2][3] = 1;
        this.matProj.m[3][3] = 0;
        return true;
    }
    onUserUpdate(elapsedTime) {
        this.clearScreen();
        let matRotZ, matRotX;
        this.theta += elapsedTime;
        matRotX = { m: Array(4).fill(0).map(() => Array(4).fill(0)) };
        matRotZ = { m: Array(4).fill(0).map(() => Array(4).fill(0)) };
        matRotZ.m[0][0] = Math.cos(this.theta);
        matRotZ.m[0][1] = Math.sin(this.theta);
        matRotZ.m[1][0] = -Math.sin(this.theta);
        matRotZ.m[1][1] = Math.cos(this.theta);
        matRotZ.m[2][2] = 1;
        matRotZ.m[3][3] = 1;
        matRotX.m[0][0] = 1;
        matRotX.m[1][1] = Math.cos(this.theta * 0.5);
        matRotX.m[1][2] = Math.sin(this.theta * 0.5);
        matRotX.m[2][1] = -Math.sin(this.theta * 0.5);
        matRotX.m[2][2] = Math.cos(this.theta * 0.5);
        matRotX.m[3][3] = 1;
        for (let i = 0; i < this.meshCube.tris.length; i++) {
            let tri = { p: [...this.meshCube.tris[i].p] }, triTranslated = { p: new Array }, triRotatedZ = { p: new Array }, triRotatedZX = { p: new Array }, triProjected = { p: new Array };
            this.initializeTriangle(triRotatedZ);
            this.initializeTriangle(triRotatedZX);
            this.initializeTriangle(triTranslated);
            this.initializeTriangle(triProjected);
            //Rotate on Z axis
            this.multiplyMatrixByVector(tri.p[0], triRotatedZ.p[0], matRotZ);
            this.multiplyMatrixByVector(tri.p[1], triRotatedZ.p[1], matRotZ);
            this.multiplyMatrixByVector(tri.p[2], triRotatedZ.p[2], matRotZ);
            //Rotate on X axis
            this.multiplyMatrixByVector(triRotatedZ.p[0], triRotatedZX.p[0], matRotX);
            this.multiplyMatrixByVector(triRotatedZ.p[1], triRotatedZX.p[1], matRotX);
            this.multiplyMatrixByVector(triRotatedZ.p[2], triRotatedZX.p[2], matRotX);
            //Translate
            triTranslated.p = [...triRotatedZX.p];
            triTranslated.p[0].z += 3;
            triTranslated.p[1].z += 3;
            triTranslated.p[2].z += 3;
            this.multiplyMatrixByVector(triTranslated.p[0], triProjected.p[0], this.matProj);
            this.multiplyMatrixByVector(triTranslated.p[1], triProjected.p[1], this.matProj);
            this.multiplyMatrixByVector(triTranslated.p[2], triProjected.p[2], this.matProj);
            //Scale to view
            triProjected.p[0].x += 1;
            triProjected.p[0].y += 1;
            triProjected.p[1].x += 1;
            triProjected.p[1].y += 1;
            triProjected.p[2].x += 1;
            triProjected.p[2].y += 1;
            triProjected.p[0].x *= (window.innerWidth);
            triProjected.p[0].y *= (window.innerHeight);
            triProjected.p[1].x *= (window.innerWidth);
            triProjected.p[1].y *= (window.innerHeight);
            triProjected.p[2].x *= (window.innerWidth);
            triProjected.p[2].y *= (window.innerHeight);
            this.drawTriangle(triProjected.p[0].x, triProjected.p[0].y, triProjected.p[1].x, triProjected.p[1].y, triProjected.p[2].x, triProjected.p[2].y);
        }
        return true;
    }
    drawTriangle(x1, y1, x2, y2, x3, y3) {
        this.drawLine(x1, y1, x2, y2);
        this.drawLine(x2, y2, x3, y3);
        this.drawLine(x3, y3, x1, y1);
    }
    drawLine(x1, y1, x2, y2) {
        this.context.beginPath();
        this.context.lineWidth = 2;
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.stroke();
    }
    clearScreen() {
        this.context.clearRect(-960, -540, 1920 * 2, 1080 * 2);
    }
    multiplyMatrixByVector(inputVector, outputVector, matrix) {
        let x, y, z, w;
        x = inputVector.x * matrix.m[0][0] + inputVector.y * matrix.m[1][0] + inputVector.z * matrix.m[2][0] + matrix.m[3][0];
        y = inputVector.x * matrix.m[0][1] + inputVector.y * matrix.m[1][1] + inputVector.z * matrix.m[2][1] + matrix.m[3][1];
        z = inputVector.x * matrix.m[0][2] + inputVector.y * matrix.m[1][2] + inputVector.z * matrix.m[2][2] + matrix.m[3][2];
        w = inputVector.x * matrix.m[0][3] + inputVector.y * matrix.m[1][3] + inputVector.z * matrix.m[2][3] + matrix.m[3][3];
        if (w != 0) {
            x = x / w;
            y = y / w;
            z = z / w;
        }
        outputVector.x = x;
        outputVector.y = y;
        outputVector.z = z;
    }
    initializeTriangle(triangle) {
        triangle.p[0] = { x: 0, y: 0, z: 0 };
        triangle.p[1] = { x: 0, y: 0, z: 0 };
        triangle.p[2] = { x: 0, y: 0, z: 0 };
    }
    populateTriangle(triangle, vector1, vector2, vector3) {
        triangle.p.push({ ...vector1 });
        triangle.p.push({ ...vector2 });
        triangle.p.push({ ...vector3 });
    }
}
let araucaria = new AraucariaEngine();
araucaria.onUserCreate();
//araucaria.onUserUpdate(0.01);
setInterval(() => {
    araucaria.onUserUpdate(0.05);
}, 50);
