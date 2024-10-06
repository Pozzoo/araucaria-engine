interface vec3d {
    x: number,
    y: number,
    z: number;
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

    private readonly matProj: matrix4x4;
    private theta: number;

    private readonly vCamera: vec3d = {x: 0, y: 0, z: 0};

    private readonly point000: vec3d = {x: 0, y: 0, z: 0};
    private readonly point001: vec3d = {x: 0, y: 0, z: 1};
    private readonly point010: vec3d = {x: 0, y: 1, z: 0};
    private readonly point011: vec3d = {x: 0, y: 1, z: 1};
    private readonly point100: vec3d = {x: 1, y: 0, z: 0};
    private readonly point101: vec3d = {x: 1, y: 0, z: 1};
    private readonly point110: vec3d = {x: 1, y: 1, z: 0};
    private readonly point111: vec3d = {x: 1, y: 1, z: 1};

    constructor() {
        let canvas = document.getElementById('canvas') as HTMLCanvasElement;
        let context = canvas.getContext("2d")!;

        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;

        context.translate(0.5, 0.5);


        context.strokeStyle = 'white';
        context.lineWidth = 2;

        this.canvas = canvas;
        this.context = context

        this.meshCube = { tris: new Array<triangle>() };
        this.matProj = {m : Array(4).fill(0).map(() => Array(4).fill(0))}
        
        this.theta = 0;

        /*
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
                if (event.target == null) return;

                const content: string = reader.result as string;

                this.loadFromObjectFile(content)
            }
        }
         */
    }



    onUserCreate(): boolean {
        this.createCube(this.meshCube);

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

    createCube(cubeMesh: mesh) {
        let triangle0: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle0, this.point000, this.point010, this.point110);

        let triangle1: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle1, this.point000, this.point110, this.point100);

        let triangle2: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle2, this.point100, this.point110, this.point111);

        let triangle3: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle3, this.point100, this.point111, this.point101);

        let triangle4: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle4, this.point101, this.point111, this.point011);

        let triangle5: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle5, this.point101, this.point011, this.point001);

        let triangle6: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle6, this.point001, this.point011, this.point010);

        let triangle7: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle7, this.point001, this.point010, this.point000);

        let triangle8: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle8, this.point010, this.point011, this.point111);

        let triangle9: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle9, this.point010, this.point111, this.point110);

        let triangle10: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle10, this.point101, this.point001, this.point000);

        let triangle11: triangle = {p: new Array<vec3d>()};
        this.populateTriangle(triangle11, this.point101, this.point000, this.point100);

        cubeMesh.tris.push(triangle0, triangle1, triangle2, triangle3, triangle4, triangle5, triangle6, triangle7, triangle8, triangle9, triangle10, triangle11);
    }



    onUserUpdate(elapsedTime: number): boolean {
        this.clearScreen();

        let matRotZ: matrix4x4, matRotX: matrix4x4;
        this.theta += elapsedTime;

        matRotX = {m : Array(4).fill(0).map(() => Array(4).fill(0))}
        matRotZ = {m : Array(4).fill(0).map(() => Array(4).fill(0))}

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
            let tri: triangle = {p: [...this.meshCube.tris[i].p]},
                triTranslated: triangle = {p: new Array<vec3d>},
                triRotatedZ: triangle = {p: new Array<vec3d>},
                triRotatedZX: triangle = {p: new Array<vec3d>},
                triProjected: triangle = {p: new Array<vec3d>};

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

            //Offset into screen
            triTranslated.p = [...triRotatedZX.p];
            triTranslated.p[0].z += 3;
            triTranslated.p[1].z += 3;
            triTranslated.p[2].z += 3;

            //Calculate normals
            let normal: vec3d, line1: vec3d, line2: vec3d;
            normal = {x: 0, y: 0, z: 0};
            line1 = {x: 0, y: 0, z: 0};
            line2 = {x: 0, y: 0, z: 0};

            line1.x = triTranslated.p[1].x - triTranslated.p[0].x;
            line1.y = triTranslated.p[1].y - triTranslated.p[0].y;
            line1.z = triTranslated.p[1].z - triTranslated.p[0].z;

            line2.x = triTranslated.p[2].x - triTranslated.p[0].x;
            line2.y = triTranslated.p[2].y - triTranslated.p[0].y;
            line2.z = triTranslated.p[2].z - triTranslated.p[0].z;

            normal.x = line1.y * line2.z - line1.z * line2.y;
            normal.y = line1.z * line2.x - line1.x * line2.z;
            normal.z = line1.x * line2.y - line1.y * line2.x;

            let normalLenght: number = Math.sqrt(normal.x*normal.x + normal.y*normal.y + normal.z*normal.z);
            normal.x /= normalLenght; normal.y /= normalLenght; normal.z /= normalLenght;

            //Cull not visible triangles
            if (normal.x  * (triTranslated.p[0].x - this.vCamera.x) +
                normal.y  * (triTranslated.p[0].y - this.vCamera.y) +
                normal.z  * (triTranslated.p[0].z - this.vCamera.z) > 0)
            continue;

            //Illumination
            let lightDirection: vec3d = {x: 0, y: 0, z: -1};

            let lightDirectionNormal: number = Math.sqrt(lightDirection.x*lightDirection.x + lightDirection.y*lightDirection.y + lightDirection.z*lightDirection.z);
            lightDirection.x /= lightDirectionNormal; lightDirection.y /= lightDirectionNormal; lightDirection.z /= lightDirectionNormal;

            let lightDotProduct: number = normal.x * lightDirection.x + normal.y * lightDirection.y + normal.z * lightDirection.z;
            triTranslated.colour = this.defineShadeColour(lightDotProduct);

            //Translate
            this.multiplyMatrixByVector(triTranslated.p[0], triProjected.p[0], this.matProj);
            this.multiplyMatrixByVector(triTranslated.p[1], triProjected.p[1], this.matProj);
            this.multiplyMatrixByVector(triTranslated.p[2], triProjected.p[2], this.matProj);
            triProjected.colour = triTranslated.colour;

            //Scale to view
            triProjected.p[0].x += 1; triProjected.p[0].y += 1;
            triProjected.p[1].x += 1; triProjected.p[1].y += 1;
            triProjected.p[2].x += 1; triProjected.p[2].y += 1;

            triProjected.p[0].x *= (window.innerWidth);
            triProjected.p[0].y *= (window.innerHeight);

            triProjected.p[1].x *= (window.innerWidth);
            triProjected.p[1].y *= (window.innerHeight);

            triProjected.p[2].x *= (window.innerWidth);
            triProjected.p[2].y *= (window.innerHeight);

            this.fillTriangle(triProjected);
        }

        return true;
    }

    fillTriangle(triangle: triangle) {
        this.context.strokeStyle = triangle.colour!;

        this.context.beginPath();
        this.context.moveTo(triangle.p[0].x, triangle.p[0].y);
        this.context.lineTo(triangle.p[1].x, triangle.p[1].y);
        this.context.lineTo(triangle.p[2].x, triangle.p[2].y);
        this.context.stroke();
        this.context.closePath();

        this.context.fillStyle = triangle.colour!;
        this.context.fill();
    }

    clearScreen() {
        this.context.clearRect(-960, -540, 1920 * 2, 1080 * 2);
    }

    private multiplyMatrixByVector(inputVector: vec3d, outputVector: vec3d, matrix: matrix4x4) {
        let x, y, z, w : number;

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

    private initializeTriangle(triangle: triangle) {
        triangle.p[0] = {x: 0, y: 0, z: 0};
        triangle.p[1] = {x: 0, y: 0, z: 0};
        triangle.p[2] = {x: 0, y: 0, z: 0};
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
}

//Main function
let araucaria = new AraucariaEngine();

araucaria.onUserCreate();
//araucaria.onUserUpdate(0.01);

setInterval(() => {
    araucaria.onUserUpdate(0.05);
}, 50)
