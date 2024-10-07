interface vec3d {
    x: number,
    y: number,
    z: number,
    w: number
}

interface triangle {
    p: Array<vec3d>,
    colour?: string;
}

interface mesh {
    tris: Array<triangle>;
}

interface matrix4x4 {
    m: number[][];
}

class AraucariaEngine {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    private readonly meshCube: mesh

    private matProj: matrix4x4;
    private theta: number;

    private vCamera: vec3d = this.initializeVec3d();
    private vLookDir: vec3d = this.initializeVec3d();
    private fYaw: number = 0;

    private showWireframe = false;

    constructor() {
        let canvas = document.getElementById('canvas') as HTMLCanvasElement;
        let context = canvas.getContext("2d")!;

        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;

        context.translate(0.5, 0.5);

        context.lineWidth = 2;

        this.canvas = canvas;
        this.context = context

        this.meshCube = { tris: new Array<triangle>() };
        this.matProj = {m : Array(4).fill(0).map(() => Array(4).fill(0))}
        
        this.theta = 0;

        
        window.ondragover = function(event) {
            event.preventDefault();
        }

        window.ondrop = (event) => onDrop(event);

        const onDrop = (event: DragEvent) => {
            event.preventDefault();

            if (event.dataTransfer == null) return;

            let file = event.dataTransfer.files[0];
            let reader = new FileReader();

            reader.onloadend = (e) => onloadEnd(e);
            reader.readAsText(file);

            const onloadEnd = (e: ProgressEvent<FileReader>) => {
                if (e.target == null) return;

                const content: string = reader.result as string;

                this.loadFromObjectFile(content)
            }
        }
    }

    onUserCreate(): boolean {
        let fNear = 0.1;
        let fFar = 1000;
        let fFov = 90;
        let fAspectRatio = window.innerHeight / window.innerWidth;

        this.matProj = this.makeProjectionMatrix(fFov, fAspectRatio, fNear, fFar);

        //Load teapot
        fetch("./assets/teapot.obj")
            .then((res) => res.text())
            .then((text) => {
                this.loadFromObjectFile(text);
            })
            .catch((e) => console.error(e));

        return true;
    }

    onUserUpdate(elapsedTime: number): boolean {
        this.clearScreen();

        let vForward = this.vectorMul(this.vLookDir, 8 * elapsedTime);

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") {

            } else if (e.key === "ArrowDown") {
            } else if (e.key === "ArrowLeft") {
            } else if (e.key === "ArrowRight") {
            } else if (e.key === "a") {
            } else if (e.key === "d") {
            } else if (e.key === "w") {
            } else if (e.key === "s") {
            }

            switch (e.key) {
                case "ArrowUp":
                    this.vCamera.y += 8 * elapsedTime;
                    break;
                case "ArrowDown":
                    this.vCamera.y -= 8 * elapsedTime;
                    break;
                case "ArrowLeft":
                    this.vCamera.x += 8 * elapsedTime;
                    break;
                case "ArrowRight":
                    this.vCamera.x -= 8 * elapsedTime;
                    break;
                case "a":
                    this.fYaw -= 2 * elapsedTime;
                    break;
                case "d":
                    this.fYaw += 2 * elapsedTime;
                    break;
                case "w":
                    this.vCamera = this.vectorAdd(this.vCamera, vForward);
                    break;
                case "s":
                    this.vCamera = this.vectorSub(this.vCamera, vForward);
                    break;
                default:
                    return;
            }
        }

        document.onkeydown = (e) => onKeyDown(e);

        let matRotZ: matrix4x4, matRotX: matrix4x4, matTrans: matrix4x4, matWorld: matrix4x4;
        //this.theta += elapsedTime;

        matRotX = this.makeRotationMatrixX(this.theta * 5);
        matRotZ = this.makeRotationMatrixZ(this.theta);

        matTrans = this.makeTranslationMatrix(0, 0, 5);

        matWorld = this.multiplyMatrixByMatrix(matRotZ, matRotX);
        matWorld = this.multiplyMatrixByMatrix(matWorld, matTrans);

        let vecTrianglesToRaster = new Array<triangle>();

        let vUp: vec3d = {x: 0, y: 1, z: 0, w: 1};
        let vTarget: vec3d = {x: 0, y: 0, z: 1, w: 1};
        let matCameraRotate: matrix4x4 = this.makeRotationMatrixY(this.fYaw);
        this.vLookDir = this.multiplyMatrixByVector(matCameraRotate, vTarget);
        vTarget = this.vectorAdd(this.vCamera, this.vLookDir);

        let matCamera: matrix4x4 = this.makePointAtMatrix(this.vCamera, vTarget, vUp);
        let matView: matrix4x4 = this.quickInverseMatrix(matCamera);

        for (let i = 0; i < this.meshCube.tris.length; i++) {
            let tri: triangle = {p: [...this.meshCube.tris[i].p]},
                triProjected: triangle = {p: new Array<vec3d>},
                triTransformed: triangle = {p: new Array<vec3d>},
                triViewed: triangle = {p: new Array<vec3d>};

            triProjected = this.initializeTriangle();
            triTransformed = this.initializeTriangle();

            triTransformed.p[0] = this.multiplyMatrixByVector(matWorld, tri.p[0]);
            triTransformed.p[1] = this.multiplyMatrixByVector(matWorld, tri.p[1]);
            triTransformed.p[2] = this.multiplyMatrixByVector(matWorld, tri.p[2]);

            //Calculate normals
            let normal: vec3d, line1: vec3d, line2: vec3d;

            line1 = this.vectorSub(triTransformed.p[1], triTransformed.p[0]);
            line2 = this.vectorSub(triTransformed.p[2], triTransformed.p[0]);

            normal = this.vectorCrossProduct(line1, line2);

            normal = this.vectorNormalize(normal);

            let vCameraRay = this.vectorSub(triTransformed.p[0], this.vCamera);

            //Cull not visible triangles
            if (this.vectorDotProduct(normal, vCameraRay) > 0) continue;

            //Illumination
            let lightDirection: vec3d = {x: 0, y: 1, z: -1, w: 1};
            lightDirection = this.vectorNormalize(lightDirection);

            let lightDotProduct: number = Math.max(0.1, this.vectorDotProduct(lightDirection, normal));
            triTransformed.colour = this.defineShadeColour(lightDotProduct);

            //Convert World Space into View Space
            triViewed.p[0] = this.multiplyMatrixByVector(matView, triTransformed.p[0]);
            triViewed.p[1] = this.multiplyMatrixByVector(matView, triTransformed.p[1]);
            triViewed.p[2] = this.multiplyMatrixByVector(matView, triTransformed.p[2]);

            let nClippedTriangles = 0;
            let clipped: triangle[] = [this.initializeTriangle(), this.initializeTriangle()]

            let vec1: vec3d = {x: 0, y: 0, z: 0.15, w: 1};
            let vec2: vec3d = {x: 0, y: 0, z: 1, w: 1};
            let res = this.triangleClipAgainstPlane(vec1, vec2, triViewed);

            nClippedTriangles = res.n;
            clipped[0] = res.outTri1;
            clipped[1] = res.outTri2;

            if (nClippedTriangles === -1) {
                console.log("clipping not working!")
                continue;
            }

            for (let j = 0; j < nClippedTriangles; j++) {
                //Translate
                triProjected.p[0] = this.multiplyMatrixByVector(this.matProj, clipped[j].p[0]);
                triProjected.p[1] = this.multiplyMatrixByVector(this.matProj, clipped[j].p[1]);
                triProjected.p[2] = this.multiplyMatrixByVector(this.matProj, clipped[j].p[2]);
                triProjected.colour = triTransformed.colour;

                triProjected.p[0] = this.vectorDiv(triProjected.p[0], triProjected.p[0].w);
                triProjected.p[1] = this.vectorDiv(triProjected.p[1], triProjected.p[1].w);
                triProjected.p[2] = this.vectorDiv(triProjected.p[2], triProjected.p[2].w);

                //Invert X and Y
                triProjected.p[0].x *= -1;
                triProjected.p[1].x *= -1;
                triProjected.p[2].x *= -1;
                triProjected.p[0].y *= -1;
                triProjected.p[1].y *= -1;
                triProjected.p[2].y *= -1;

                //Scale to view and offset
                let vOffsetView: vec3d = {x: 1, y: 1, z: 0, w: 1}
                triProjected.p[0] = this.vectorAdd(triProjected.p[0], vOffsetView);
                triProjected.p[1] = this.vectorAdd(triProjected.p[1], vOffsetView);
                triProjected.p[2] = this.vectorAdd(triProjected.p[2], vOffsetView);

                triProjected.p[0].x *= (window.innerWidth);
                triProjected.p[0].y *= (window.innerHeight);

                triProjected.p[1].x *= (window.innerWidth);
                triProjected.p[1].y *= (window.innerHeight);

                triProjected.p[2].x *= (window.innerWidth);
                triProjected.p[2].y *= (window.innerHeight);

                vecTrianglesToRaster.push(triProjected);
            }
        }

        vecTrianglesToRaster.sort((a, b) => {
            let z1 = (a.p[0].z + a.p[1].z + a.p[2].z) / 3;
            let z2 = (b.p[0].z + b.p[1].z + b.p[2].z) / 3;

            return z2 - z1;
        })

        for (let i = 0; i < vecTrianglesToRaster.length; i++) {
            let triToRaster = vecTrianglesToRaster[i];

            let clipped: triangle[] = [this.initializeTriangle(), this.initializeTriangle()];
            let triangleList: Array<triangle> = new Array<triangle>();

            triangleList.push(triToRaster);
            let nNewTriangles = 1;

            for (let j = 0; j < 4; j++) {
                let nTrisToAdd = 0;
                while (nTrisToAdd > 0) {
                    let test: triangle = triangleList.pop()!;
                    nNewTriangles--;

                    let res1;

                    switch (j) {
                        case 0:
                            res1 = this.triangleClipAgainstPlane({x: 0, y: 0, z: 0, w: 1}, {x: 0, y: 1, z: 0, w: 1}, test);
                            nTrisToAdd = res1.n;
                            clipped[0] = res1.outTri1;
                            clipped[1] = res1.outTri2;
                            break;
                        case 1:
                            res1 = this.triangleClipAgainstPlane({x: 0, y: window.innerHeight - 1, z: 0, w: 1}, {x: 0, y: -1, z: 0, w: 1}, test);
                            nTrisToAdd = res1.n;
                            clipped[0] = res1.outTri1;
                            clipped[1] = res1.outTri2;
                            break;
                        case 2:
                            res1 = this.triangleClipAgainstPlane({x: 0, y: 0, z: 0, w: 1}, {x: 1, y: 1, z: 0, w: 1}, test);
                            nTrisToAdd = res1.n;
                            clipped[0] = res1.outTri1;
                            clipped[1] = res1.outTri2;
                            break;
                        case 3:
                            res1 = this.triangleClipAgainstPlane({x: window.innerWidth - 1, y: 0, z: 0, w: 1}, {x: -1, y: 1, z: 0, w: 1}, test);
                            nTrisToAdd = res1.n;
                            clipped[0] = res1.outTri1;
                            clipped[1] = res1.outTri2;
                            break;
                    }

                    for (let k = 0; k < nTrisToAdd; k++) {
                        triangleList.push(clipped[k]);
                    }
                }

                nNewTriangles = triangleList.length;
            }

            for (let j = 0; j < triangleList.length; j++) {
                this.fillTriangle(triangleList[j]);
            }
        }

        return true;
    }

    loadFromObjectFile(content: string) {
        this.meshCube.tris = new Array<triangle>();

        let verts = new Array<vec3d>();
        let lines = content.split('\n');

        for (let line of lines) {
            if (line.startsWith('v')) {
                let v: vec3d = this.initializeVec3d();

                line = line.substring(line.indexOf('v') + 2, line.length);

                v.x = Number.parseFloat(line.substring(0, line.indexOf(' ')));
                line = line.substring(line.indexOf(' ') + 1, line.length);

                v.y = Number.parseFloat(line.substring(0, line.indexOf(' ')));
                line = line.substring(line.indexOf(' ') + 1, line.length);

                v.z = Number.parseFloat(line.substring(0));

                verts.push(v);
            } else if (line.startsWith('f')) {
                let f: number[] = [];
                let tris: triangle = {p: new Array<vec3d>()};

                line = line.substring(line.indexOf('f') + 2, line.length);

                f[0] = Number.parseFloat(line.substring(0, line.indexOf(' ')));
                line = line.substring(line.indexOf(' ') + 1, line.length);

                f[1] = Number.parseFloat(line.substring(0, line.indexOf(' ')));
                line = line.substring(line.indexOf(' ') + 1, line.length);

                f[2] = Number.parseFloat(line.substring(0));


                this.populateTriangle(tris, verts[f[0] - 1], verts[f[1] - 1], verts[f[2] - 1]);

                this.meshCube.tris.push(tris);
            }
        }
    }

    private make4x4Matrix() {
        let matrix: matrix4x4 = {m: new Array(4).fill(0).map(() => Array(4).fill(0))}
        return matrix;
    }

    private multiplyMatrixByVector(matrix: matrix4x4, vector: vec3d) {
        let res: vec3d = {
            x: vector.x * matrix.m[0][0] + vector.y * matrix.m[1][0] + vector.z * matrix.m[2][0] + vector.w * matrix.m[3][0],
            y: vector.x * matrix.m[0][1] + vector.y * matrix.m[1][1] + vector.z * matrix.m[2][1] + vector.w * matrix.m[3][1],
            z: vector.x * matrix.m[0][2] + vector.y * matrix.m[1][2] + vector.z * matrix.m[2][2] + vector.w * matrix.m[3][2],
            w: vector.x * matrix.m[0][3] + vector.y * matrix.m[1][3] + vector.z * matrix.m[2][3] + vector.w * matrix.m[3][3]
        }

        return res;
    }

    private makeIdentityMatrix() {
        let matrix: matrix4x4 = this.make4x4Matrix();

        matrix.m[0][0] = 1;
        matrix.m[1][1] = 1;
        matrix.m[2][2] = 1;
        matrix.m[3][3] = 1;

        return matrix;
    }

    private makeRotationMatrixX(angleRad: number) {
        let matrix: matrix4x4 = this.make4x4Matrix();
        matrix.m[0][0] = 1;
        matrix.m[1][1] = Math.cos(angleRad);
        matrix.m[1][2] = Math.sin(angleRad);
        matrix.m[2][1] = -Math.sin(angleRad);
        matrix.m[2][2] = Math.cos(angleRad);
        matrix.m[3][3] = 1;
        return matrix;
    }

    private makeRotationMatrixY(angleRad: number) {
        let matrix: matrix4x4 = this.make4x4Matrix();
        matrix.m[0][0] = Math.cos(angleRad);
        matrix.m[0][2] = Math.sin(angleRad);
        matrix.m[2][0] = -Math.sin(angleRad);
        matrix.m[1][1] = 1.0;
        matrix.m[2][2] = Math.cos(angleRad);
        matrix.m[3][3] = 1.0;
        return matrix;
    }

    private makeRotationMatrixZ(angleRad: number) {
        let matrix: matrix4x4 = this.make4x4Matrix();
        matrix.m[0][0] = Math.cos(angleRad);
        matrix.m[0][1] = Math.sin(angleRad);
        matrix.m[1][0] = -Math.sin(angleRad);
        matrix.m[1][1] = Math.cos(angleRad);
        matrix.m[2][2] = 1;
        matrix.m[3][3] = 1;
        return matrix;
    }

    private makeTranslationMatrix(x:number, y:number, z:number) {
        let matrix: matrix4x4 = this.makeIdentityMatrix();
        matrix.m[3][0] = x;
        matrix.m[3][1] = y;
        matrix.m[3][2] = z;
        return matrix;
    }

    private makeProjectionMatrix(fovDegrees: number, aspectRatio: number, fNear: number, fFar: number) {
        let fovRad = 1.0 / Math.tan(fovDegrees * 0.5 / 180.0 * 3.14159);

        let matrix: matrix4x4 = this.make4x4Matrix();
        matrix.m[0][0] = aspectRatio * fovRad;
        matrix.m[1][1] = fovRad;
        matrix.m[2][2] = fFar / (fFar - fNear);
        matrix.m[3][2] = (-fFar * fNear) / (fFar - fNear);
        matrix.m[2][3] = 1;
        matrix.m[3][3] = 0;
        return matrix;
    }

    private multiplyMatrixByMatrix(m1: matrix4x4, m2: matrix4x4) {
        let res: matrix4x4 = this.make4x4Matrix();
        for (let c = 0; c < 4; c++)
            for (let r = 0; r < 4; r++)
                res.m[r][c] = m1.m[r][0] * m2.m[0][c] + m1.m[r][1] * m2.m[1][c] + m1.m[r][2] * m2.m[2][c] + m1.m[r][3] * m2.m[3][c];
        return res;
    }

    private makePointAtMatrix(pos: vec3d, target: vec3d, up: vec3d) {

        //Calculate forward direction
        let newForward = this.vectorSub(target, pos);
        newForward = this.vectorNormalize(newForward);

        //Calculate new up direction
        let a = this.vectorMul(newForward, this.vectorDotProduct(up, newForward));
        let newUp = this.vectorSub(up, a);
        newUp = this.vectorNormalize(newUp);

        //Calculate new right direction
        let newRight = this.vectorCrossProduct(newUp, newForward);

        //Construct Dimensioning and Translation matrix
        let matrix = this.make4x4Matrix();
        matrix.m[0][0] = newRight.x;	matrix.m[0][1] = newRight.y;	matrix.m[0][2] = newRight.z;	matrix.m[0][3] = 0;
        matrix.m[1][0] = newUp.x;		matrix.m[1][1] = newUp.y;		matrix.m[1][2] = newUp.z;		matrix.m[1][3] = 0;
        matrix.m[2][0] = newForward.x;	matrix.m[2][1] = newForward.y;	matrix.m[2][2] = newForward.z;	matrix.m[2][3] = 0;
        matrix.m[3][0] = pos.x;			matrix.m[3][1] = pos.y;			matrix.m[3][2] = pos.z;			matrix.m[3][3] = 1;
        return matrix;
    }

    private quickInverseMatrix(matrix: matrix4x4) {
        let res: matrix4x4 = this.make4x4Matrix();

        res.m[0][0] = matrix.m[0][0]; res.m[0][1] = matrix.m[1][0]; res.m[0][2] = matrix.m[2][0]; res.m[0][3] = 0;
        res.m[1][0] = matrix.m[0][1]; res.m[1][1] = matrix.m[1][1]; res.m[1][2] = matrix.m[2][1]; res.m[1][3] = 0;
        res.m[2][0] = matrix.m[0][2]; res.m[2][1] = matrix.m[1][2]; res.m[2][2] = matrix.m[2][2]; res.m[2][3] = 0;
        res.m[3][0] = -(matrix.m[3][0] * res.m[0][0] + matrix.m[3][1] * res.m[1][0] + matrix.m[3][2] * res.m[2][0]);
        res.m[3][1] = -(matrix.m[3][0] * res.m[0][1] + matrix.m[3][1] * res.m[1][1] + matrix.m[3][2] * res.m[2][1]);
        res.m[3][2] = -(matrix.m[3][0] * res.m[0][2] + matrix.m[3][1] * res.m[1][2] + matrix.m[3][2] * res.m[2][2]);
        res.m[3][3] = 1;
        return res;
    }

    private vectorAdd(v1: vec3d, v2: vec3d) {
        let res: vec3d = {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z, w: 1};
        return res;
    }

    private vectorSub(v1: vec3d, v2: vec3d) {
        let res: vec3d = {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z, w: 1};
        return res;
    }

    private vectorMul(v1: vec3d, k: number) {
        let res: vec3d = {x: v1.x * k, y: v1.y * k, z: v1.z * k, w: 1};
        return res;
    }

    private vectorDiv(v1: vec3d, k: number) {
        let res: vec3d = {x: v1.x / k, y: v1.y / k, z: v1.z / k, w: 1};
        return res;
    }

    private vectorDotProduct(v1: vec3d, v2: vec3d) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    private vectorLength(v1: vec3d) {
        return Math.sqrt(this.vectorDotProduct(v1, v1));
    }

    private vectorNormalize(v1: vec3d) {
        let length = this.vectorLength(v1);
        let res: vec3d = {x: v1.x / length, y: v1.y / length, z: v1.z / length, w: 1};
        return res;
    }

    private vectorCrossProduct(v1: vec3d, v2: vec3d) {
        let res: vec3d = {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x,
            w: 1
        }

        return res;
    }

    private vectorIntersectPlane(planeP: vec3d, planeN: vec3d, lineStart: vec3d, lineEnd: vec3d) {
        planeN = this.vectorNormalize(planeN);
        let planeD = -this.vectorDotProduct(planeN, planeP);
        let ad = this.vectorDotProduct(lineStart, planeN);
        let bd = this.vectorDotProduct(lineEnd, planeN);
        let t = (-planeD - ad) / (bd - ad);
        let lineStartToEnd: vec3d =  this.vectorSub(lineEnd, lineStart);
        let lineToIntersect: vec3d =  this.vectorMul(lineStartToEnd, t);

        return this.vectorAdd(lineStart, lineToIntersect);
    }

    private triangleClipAgainstPlane(planeP: vec3d, planeN: vec3d, inTri: triangle) {
        let outTri1 = this.initializeTriangle()
        let outTri2 = this.initializeTriangle()


        planeN = this.vectorNormalize(planeN);

        const dist = (p: vec3d) => {
            return (planeN.x * p.x + planeN.y * p.y + planeN.z * p.z - this.vectorDotProduct(planeN, planeP));
        }

        let insidePoints: vec3d[] = [this.initializeVec3d(), this.initializeVec3d(), this.initializeVec3d()];
        let outsidePoints: vec3d[] = [this.initializeVec3d(), this.initializeVec3d(), this.initializeVec3d()];

        let nInsidePointsCount = 0, nOutsidePointsCount = 0;

        let d0 = dist(inTri.p[0]);
        let d1 = dist(inTri.p[1]);
        let d2 = dist(inTri.p[2]);

        if (d0 >= 0)
            insidePoints[nInsidePointsCount++] = inTri.p[0];
        else
            outsidePoints[nOutsidePointsCount++] = inTri.p[0];

        if (d1 >= 0)
            insidePoints[nInsidePointsCount++] = inTri.p[1];
        else
            outsidePoints[nOutsidePointsCount++] = inTri.p[1];

        if (d2 >= 0)
            insidePoints[nInsidePointsCount++] = inTri.p[2];
        else
            outsidePoints[nOutsidePointsCount++] = inTri.p[2];


        if (nInsidePointsCount === 0) return {n: 0, outTri1, outTri2};

        if (nInsidePointsCount === 3) {
            outTri1 = inTri;
            return {n: 1, outTri1, outTri2};
        }

        if (nInsidePointsCount == 1 && nOutsidePointsCount == 2) {
            outTri1.colour = inTri.colour;

            outTri1.p[0] = insidePoints[0];
            outTri1.p[1] = this.vectorIntersectPlane(planeP, planeN, insidePoints[0], outsidePoints[1]);
            outTri1.p[2] = this.vectorIntersectPlane(planeP, planeN, insidePoints[0], outsidePoints[2]);

            return {n: 1, outTri1, outTri2};
        }

        if (nInsidePointsCount == 2 && nOutsidePointsCount == 1) {
            outTri1.colour = inTri.colour;
            outTri2.colour = inTri.colour;

            outTri1.p[0] = insidePoints[0];
            outTri1.p[1] = insidePoints[1];
            outTri1.p[2] = this.vectorIntersectPlane(planeP, planeN, insidePoints[0], outsidePoints[0]);

            outTri2.p[0] = insidePoints[0];
            outTri2.p[1] = insidePoints[1];
            outTri2.p[2] = this.vectorIntersectPlane(planeP, planeN, insidePoints[1], outsidePoints[0]);

            return {n: 2, outTri1, outTri2};
        }

        return {n: -1, outTri1, outTri2};
    }

    private initializeVec3d() {
        let vec: vec3d = {x: 0, y: 0, z: 0, w: 1}

        return {...vec};
    }

    private initializeTriangle() {
        let triangle: triangle = {p: new Array<vec3d>()};

        triangle.p[0] = this.initializeVec3d();
        triangle.p[1] = this.initializeVec3d();
        triangle.p[2] = this.initializeVec3d();

        return triangle;
    }

    private populateTriangle(triangle: triangle, vector1: vec3d, vector2: vec3d, vector3: vec3d) {
        triangle.p.push({ ...vector1 });
        triangle.p.push({ ...vector2 });
        triangle.p.push({ ...vector3 });
    }

    private defineShadeColour(lum: number) {
        const brightness = Math.round(lum * 32);

        switch (brightness) {
            case 0:
                return "#000000"
            case 1:
                return "#080808"
            case 2:
                return "#101010"
            case 3:
                return "#191919"
            case 4:
                return "#212121"
            case 5:
                return "#292929"
            case 6:
                return "#313131"
            case 7:
                return "#3a3a3a"
            case 8:
                return "#424242"
            case 9:
                return "#4a4a4a"
            case 10:
                return "#525252"
            case 11:
                return "#5a5a5a"
            case 12:
                return "#636363"
            case 13:
                return "#6b6b6b"
            case 14:
                return "#737373"
            case 15:
                return "#7b7b7b"
            case 16:
                return "#848484"
            case 17:
                return "#8c8c8c"
            case 18:
                return "#949494"
            case 19:
                return "#9c9c9c"
            case 20:
                return "#a5a5a5"
            case 21:
                return "#adadad"
            case 22:
                return "#b5b5b5"
            case 23:
                return "#bdbdbd"
            case 24:
                return "#c5c5c5"
            case 25:
                return "#cecece"
            case 26:
                return "#d6d6d6"
            case 27:
                return "#dedede"
            case 28:
                return "#e6e6e6"
            case 29:
                return "#efefef"
            case 30:
                return "#f7f7f7"
            case 31:
                return "#ffffff"
            default:
                return "#ffffff"
        }
    }

    fillTriangle(triangle: triangle) {
        this.context.strokeStyle = (this.showWireframe ? "black" : triangle.colour!);
        this.context.lineWidth = 3;

        this.context.beginPath();
        this.context.moveTo(triangle.p[0].x, triangle.p[0].y);
        this.context.lineTo(triangle.p[1].x, triangle.p[1].y);
        this.context.lineTo(triangle.p[2].x, triangle.p[2].y);
        this.context.lineTo(triangle.p[0].x, triangle.p[0].y);
        this.context.stroke();
        this.context.closePath();

        this.context.fillStyle = triangle.colour!;
        this.context.fill();
    }

    clearScreen() {
        this.context.clearRect(-1920, -1080, 1920 * 10, 1080 * 10);
    }

    toggleWireframe() {
        this.showWireframe = !this.showWireframe;
    }
}

//Main function
let araucaria = new AraucariaEngine();

araucaria.onUserCreate();
//araucaria.onUserUpdate(0.01);

setInterval(() => {
    araucaria.onUserUpdate(0.0333);
}, 33.3)
