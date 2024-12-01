var app = (function() {

    var gl;
    var prog;
    var models = [];
    var interactiveModel;
    var lightAngle = 0;
    var lightSpeed = 0.1;
    var camera = {

        eye : [ 0, 1, 4 ],

        center : [ 0, 0, 0 ],

        up : [ 0, 1, 0 ],

        fovy : 60.0 * Math.PI / 180,

        lrtb : 2.0,

        vMatrix : mat4.create(),

        pMatrix : mat4.create(),

        projectionType : "perspective",

        zAngle : 0,

        distance : 4,
        
    };

    var illumination ={
        ambientLight : [.5,.5,.5],
        light : [
            {isOn:true, position:[3.,1.,0.], color:[1.,1.,1.]},
            {isOn:true, position:[-3.,1.,0.], color:[1.,1.,1.]},
        ]
    };

    function start() {
        init();
        render();
    }

    function init() {
        initWebGL();
        initShaderProgram();
        initUniforms();
        initModels();
        initEventHandler();
        initPipline();
    }

    function initWebGL() {

        canvas = document.getElementById('canvas');
        gl = canvas.getContext('experimental-webgl');
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }

    function initPipline() {
        gl.clearColor(.95, .95, .95, 1);

        // Backface culling.
        gl.frontFace(gl.CCW);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // Depth(Z)-Buffer.
        gl.enable(gl.DEPTH_TEST);

        // Polygon offset of rastered Fragments.
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(0.5, 0);

        // Set viewport.
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        // Init camera.
        // Set projection aspect ratio.
        camera.aspect = gl.viewportWidth / gl.viewportHeight;
    }

    function initShaderProgram() {
        // Init vertex shader.
        var vs = initShader(gl.VERTEX_SHADER, "vertexshader");
        // Init fragment shader.
        var fs = initShader(gl.FRAGMENT_SHADER, "fragmentshader");
        // Link shader into a shader program.
        prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.bindAttribLocation(prog, 0, "aPosition");
        gl.linkProgram(prog);
        gl.useProgram(prog);
    }

    // Create and init shader from source.
    function initShader(shaderType, SourceTagId) {
        var shader = gl.createShader(shaderType);
        var shaderSource = document.getElementById(SourceTagId).text;
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(SourceTagId + ": " + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    function initUniforms() {
        // Projection Matrix.
        prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");

        // Model-View-Matrix.
        prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");

        // Normal Matrix.
        prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");

        // Color.
        prog.colorUniform = gl.getUniformLocation(prog, "uColor");

        // Light.
        prog.ambientLightUniform = gl.getUniformLocation(prog,
                "ambientLight");

        prog.lightUniform = [];

        for (var j = 0; j < illumination.light.length; j++) {
            var lightNb = "light[" + j + "]";
        
            var l = {};
            l.isOn = gl.getUniformLocation(prog, lightNb + ".isOn");
            l.position = gl.getUniformLocation(prog, lightNb + ".position");
            l.color = gl.getUniformLocation(prog, lightNb + ".color");
            prog.lightUniform[j] = l;
        }

        prog.materialKaUniform = gl.getUniformLocation(prog, "material.ka");
        prog.materialKdUniform = gl.getUniformLocation(prog, "material.kd");
        prog.materialKsUniform = gl.getUniformLocation(prog, "material.ks");
        prog.materialKeUniform = gl.getUniformLocation(prog, "material.ke");
    }


    function createPhongMaterial(material) {
        material = material || {};
     
        material.ka = material.ka || [ 0.3, 0.3, 0.3 ];
        material.kd = material.kd || [ 0.6, 0.6, 0.6 ];
        material.ks = material.ks || [ 0.8, 0.8, 0.8 ];
        material.ke = material.ke || 10.;

        return material;
    }

    function initModels() {

        var fs = "fill";
        
  
        var mDefault = createPhongMaterial();
        var mRed = createPhongMaterial({kd:[1.,0.,0.]});
        var mGreen = createPhongMaterial({kd:[0.,1.,0.]});
        var mBlue = createPhongMaterial({kd:[0.,0.,1.]});
        var mWhite = createPhongMaterial({ka:[1.,1.,1.], kd:[.5,.5,.5],           
                ks:[0.,0.,0.]});
    
        createModel("torus", fs, [1,1,1,1], [0,.75,0], [0,0,0,0], [1,1,1,1],
                mRed);
        createModel("sphere", fs, [1,1,1,1], [-1.25,.5,0], [0,0,0,0], [.5,.5,.5],
                mGreen);
        createModel("sphere", fs, [1,1,1,1], [1.25,.5,0], [0,0,0,0], [.5,.5,.5],
                mBlue);
        createModel("plane", fs, [1,1,1,1], [0,0,0,0], [0,0,0,0], [1,1,1,1],
                mWhite);
    

        interactiveModel = models[0];
    }

    // Create model object, fill it and push it in models array.
    function createModel(geometryname, fillstyle, color, translate, rotate, scale, material) {
        var model = {};
        model.fillstyle = fillstyle;
        model.color = color;
        initDataAndBuffers(model, geometryname);
        initTransformations(model, translate, rotate, scale);
        model.material = material;

        models.push(model);
    }

    // Set scale, rotation and transformation for model
    function initTransformations(model, translate, rotate, scale) {

        model.translate = translate;
        model.rotate = rotate;
        model.scale = scale;

        model.mMatrix = mat4.create();

        model.mvMatrix = mat4.create();

        model.nMatrix = mat3.create();
    }

    function initDataAndBuffers(model, geometryname) {

        this[geometryname]['createVertexData'].apply(model);


        model.vboPos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

        prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');
        gl.enableVertexAttribArray(prog.positionAttrib);

 
        model.vboNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);

        prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');
        gl.enableVertexAttribArray(prog.normalAttrib);


        model.iboLines = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines,
                gl.STATIC_DRAW);
        model.iboLines.numberOfElements = model.indicesLines.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


        model.iboTris = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris,
                gl.STATIC_DRAW);
        model.iboTris.numberOfElements = model.indicesTris.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    function moveLightsOnCircle() {
        lightAngle += lightSpeed;
        var radius = 3;
        illumination.light[0].position[0] = radius * Math.cos(lightAngle);
        illumination.light[0].position[2] = radius * Math.sin(lightAngle);
        illumination.light[1].position[0] = -radius * Math.cos(lightAngle);
        illumination.light[1].position[2] = -radius * Math.sin(lightAngle);
    }

    function initEventHandler() {
        // Rotation step for models.
        var deltaRotate = Math.PI / 36;
        var deltaTranslate = 0.05;
        var deltaScale = 0.05;

        window.onkeydown = function(evt) {
            var key = evt.which ? evt.which : evt.keyCode;
            var c = String.fromCharCode(key);

            var sign = evt.shiftKey ? -1 : 1;
            // Rotate interactiveModel.
            switch (c) {
            case ('X'):
                interactiveModel.rotate[0] += sign * deltaRotate;
                break;
            case ('Y'):
                interactiveModel.rotate[1] += sign * deltaRotate;
                break;
            case ('Z'):
                interactiveModel.rotate[2] += sign * deltaRotate;
                break;
            }
            // Scale/squeese interactiveModel.
            switch (c) {
            case ('S'):
                interactiveModel.scale[0] *= 1 + sign * deltaScale;
                interactiveModel.scale[1] *= 1 - sign * deltaScale;
                interactiveModel.scale[2] *= 1 + sign * deltaScale;
                break;
            }
            // Change projection of scene.
            switch (c) {
            case ('O'):
                camera.projectionType = "ortho";
                camera.lrtb = 2;
                break;
            case ('F'):
                camera.projectionType = "frustum";
                camera.lrtb = 1.2;
                break;
            case ('P'):
                camera.projectionType = "perspective";
                break;
            }
            // Camera move and orbit.
            switch (c) {
            case ('C'):
                // Orbit camera.
                camera.zAngle += sign * deltaRotate;
                break;
            case ('H'):
                // Move camera up and down.
                camera.eye[1] += sign * deltaTranslate;
                break;
            case ('D'):
                // Camera distance to center.
                camera.distance += sign * deltaTranslate;
                break;
            case ('V'):
                // Camera fovy in radian.
                camera.fovy += sign * 5 * Math.PI / 180;
                break;
            case ('B'):
                // Camera near plane dimensions.
                camera.lrtb += sign * 0.1;
                break;
            }

            switch (event.key) {
                case 'L':
                case 'l':
                    moveLightsOnCircle();
                    break;
            }

            render();
        };
    }


    function render() {

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        setProjection();

        calculateCameraOrbit();


        mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);


        gl.uniform3fv(prog.ambientLightUniform, illumination.ambientLight);

        for (var j = 0; j < illumination.light.length; j++) {

            gl.uniform1i(prog.lightUniform[j].isOn,
                    illumination.light[j].isOn);

            var lightPos = [].concat(illumination.light[j].position);

            lightPos.push(1.0);
            vec4.transformMat4(lightPos, lightPos, camera.vMatrix);

            lightPos.pop();
            gl.uniform3fv(prog.lightUniform[j].position, lightPos);
            gl.uniform3fv(prog.lightUniform[j].color,
                    illumination.light[j].color);
        }

        for (var i = 0; i < models.length; i++) {

            updateTransformations(models[i]);

            gl.uniformMatrix4fv(prog.mvMatrixUniform, false,
                    models[i].mvMatrix);
            gl.uniformMatrix3fv(prog.nMatrixUniform, false,
                    models[i].nMatrix);

            gl.uniform4fv(prog.colorUniform, models[i].color);

            gl.uniform3fv(prog.materialKaUniform, models[i].material.ka);
            gl.uniform3fv(prog.materialKdUniform, models[i].material.kd);
            gl.uniform3fv(prog.materialKsUniform, models[i].material.ks);
            gl.uniform1f(prog.materialKeUniform, models[i].material.ke);

            draw(models[i]);
        }
    }

    function calculateCameraOrbit() {

        var x = 0, z = 2;
        camera.eye[x] = camera.center[x];
        camera.eye[z] = camera.center[z];
        camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
        camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
    }

    function setProjection() {
        switch (camera.projectionType) {
        case ("ortho"):
            var v = camera.lrtb;
            mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 100);
            break;
        case ("frustum"):
            var v = camera.lrtb;
            mat4.frustum(camera.pMatrix, -v / 2, v / 2, -v / 2, v / 2,
                    1, 10);
            break;
        case ("perspective"):
            mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 1,
                    10);
            break;
        }

        gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
    }

    function updateTransformations(model) {

        var mMatrix = model.mMatrix;
        var mvMatrix = model.mvMatrix;

        mat4.identity(mMatrix);
        mat4.identity(mvMatrix);

        mat4.translate(mMatrix, mMatrix, model.translate);

        mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
        mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
        mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);
        mat4.scale(mMatrix, mMatrix, model.scale);

        mat4.multiply(mvMatrix, camera.vMatrix, mMatrix);

        mat3.normalFromMat4(model.nMatrix, mvMatrix);
    }

    function draw(model) {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT,
                    false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

        var fill = (model.fillstyle.search(/fill/) != -1);
        if (fill) {
            gl.enableVertexAttribArray(prog.normalAttrib);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
            gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements,
                    gl.UNSIGNED_SHORT, 0);
        }

        var wireframe = (model.fillstyle.search(/wireframe/) != -1);
        if (wireframe) {
            gl.uniform4fv(prog.colorUniform, [ 0., 0., 0., 1. ]);
            gl.disableVertexAttribArray(prog.normalAttrib);
            gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
            gl.drawElements(gl.LINES, model.iboLines.numberOfElements,
                    gl.UNSIGNED_SHORT, 0);
        }
    }

    return {
        start : start
    };

}());
