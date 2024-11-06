var app = (function() {

	var gl;
	var prog;
	var models = [];
	var interactiveModel;
	var camera = {
		eye: [0, 1, 4],
		center: [0, 0, 0],
		up: [0, 1, 0],
		fovy: 60.0 * Math.PI / 180,
		lrtb: 2.0,
		vMatrix: mat4.create(),
		pMatrix: mat4.create(),
		projectionType: "perspective",
		zAngle: 0,
		distance: 4,
	};

	var animate = true;
	var angle = 0;

	function start() {
		init();
		render();
		runAnimation();
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
		gl.frontFace(gl.CCW);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(0.5, 0);
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		camera.aspect = gl.viewportWidth / gl.viewportHeight;
	}

	function initShaderProgram() {
		var vs = initShader(gl.VERTEX_SHADER, "vertexshader");
		var fs = initShader(gl.FRAGMENT_SHADER, "fragmentshader");
		prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.bindAttribLocation(prog, 0, "aPosition");
		gl.linkProgram(prog);
		gl.useProgram(prog);
	}

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
		prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");
		prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");
		prog.colorUniform = gl.getUniformLocation(prog, "uColor");
		prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");
	}
	

	function initModels() {
		var fs = "fill";
		createModel("torus", fs, [1, 1, 1, 1], [0, 0, 0], [0, 0, 0], [1.2, 1.2, 1.2]);
		createModel("plane", "wireframe", [1, 1, 1, 1], [0, -1, 0], [0, 0, 0], [1, 1, 1]);

		var R = 1.5; // Umlaufbahn-Radius
		var xShift = 1.5;
		for (var i = 0; i < 4; i++) {
			var theta = i * (Math.PI / 2);
			var initialPosition = [
				R * Math.cos(theta) + xShift,
				0,
				R * Math.sin(theta)
			];
			var color = [[0, 1, 1, 1], [1, 0, 1, 1], [0, 0, 1, 1], [1, 1, 0, 1]][i];
			createModel("sphere", fs, color, initialPosition, [0, 0, 0], [0.2, 0.2, 0.2]);
		}
	
		interactiveModel = models[0]; 
	}
	

	function createModel(geometryname, fillstyle, color, translate, rotate, scale) {
		var model = {};
		model.fillstyle = fillstyle;
		model.color = color;
		initDataAndBuffers(model, geometryname);
		initTransformations(model, translate, rotate, scale);
		models.push(model);
	}

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
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines, gl.STATIC_DRAW);
		model.iboLines.numberOfElements = model.indicesLines.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		model.iboTris = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris, gl.STATIC_DRAW);
		model.iboTris.numberOfElements = model.indicesTris.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}
	function initEventHandler() {
		var deltaRotate = Math.PI / 36;
		var deltaTranslate = 0.05;
		var deltaScale = 0.05;
	
		window.onkeydown = function(evt) {
			var key = evt.which ? evt.which : evt.keyCode;
			var c = String.fromCharCode(key);
			var sign = evt.shiftKey ? -1 : 1;
	
			if (c == 'K') {
				animate = !animate;
				if (animate) {
					runAnimation();
				}
			}
	
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
	
			switch (c) {
				case ('C'):
					camera.zAngle += sign * deltaRotate;
					break;
				case ('H'):
					camera.eye[1] += sign * deltaTranslate;
					break;
				case ('D'):
					camera.distance += sign * deltaTranslate;
					break;
				case ('V'):
					camera.fovy += sign * 5 * Math.PI / 180;
					break;
				case ('B'):
					camera.lrtb += sign * 0.1;
					break;
			}
	
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
	
			switch (c) {
				case ('S'):
					interactiveModel.scale[0] *= 1 + sign * deltaScale;
					interactiveModel.scale[1] *= 1 - sign * deltaScale;
					interactiveModel.scale[2] *= 1 + sign * deltaScale;
					break;
			}
	
			render();
		};
	}

	function runAnimation() {
		if (!animate) {
			return;
		}
	
		angle += 0.035;
		interactiveModel.rotate[0] += 0.02 * 0.3; // X-Rotation
		interactiveModel.rotate[1] += 0.02 * 0.4; // Y-Rotation

		var torusRotationMatrix = mat4.create();
		mat4.rotateX(torusRotationMatrix, torusRotationMatrix, interactiveModel.rotate[0]);
		mat4.rotateY(torusRotationMatrix, torusRotationMatrix, interactiveModel.rotate[1]);
	
		var R = 1.5;
		var xShift = 1.5;
	
		for (var i = 0; i < 4; i++) {
			var theta = angle + i * (Math.PI / 2);
	
			var localPosition = vec3.fromValues(
				R * Math.cos(theta) + xShift,
				0,
				R * Math.sin(theta)
			);
	
			var worldPosition = vec3.create();
			vec3.transformMat4(worldPosition, localPosition, torusRotationMatrix);

			var modelIndex = i + 2;
			models[modelIndex].translate = [
				worldPosition[0],
				worldPosition[1],
				worldPosition[2]
			];
		}
	
		render();
		requestAnimationFrame(runAnimation);
	}
	
	
	function render() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		setProjection();
		calculateCameraOrbit();
		mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);
	
		var torusRotationMatrix = mat4.create();
		mat4.rotateX(torusRotationMatrix, torusRotationMatrix, interactiveModel.rotate[0]);
		mat4.rotateY(torusRotationMatrix, torusRotationMatrix, interactiveModel.rotate[1]);
	
		var R = 1.5;
		var xShift = 1.5;
	
		for (var i = 0; i < 4; i++) {
			var theta = angle + i * (Math.PI / 2);

			var localPosition = vec3.fromValues(
				R * Math.cos(theta) + xShift,
				0,
				R * Math.sin(theta)
			);
	
			var worldPosition = vec3.create();
			vec3.transformMat4(worldPosition, localPosition, torusRotationMatrix);
	
			var modelIndex = i + 2;
			models[modelIndex].translate = [
				worldPosition[0],
				worldPosition[1],
				worldPosition[2]
			];
		}
	
		for (var i = 0; i < models.length; i++) {
			updateTransformations(models[i]);
			gl.uniformMatrix4fv(prog.mvMatrixUniform, false, models[i].mvMatrix);
			gl.uniformMatrix3fv(prog.nMatrixUniform, false, models[i].nMatrix);
			gl.uniform4fv(prog.colorUniform, models[i].color);
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
				mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 10);
				break;
			case ("frustum"):
				var v = camera.lrtb;
				mat4.frustum(camera.pMatrix, -v / 2, v / 2, -v / 2, v / 2, 1, 10);
				break;
			case ("perspective"):
				mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 1, 10);
				break;
		}
		gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
	}

	function updateTransformations(model) {
		var mMatrix = model.mMatrix;
		mat4.identity(mMatrix);
		mat4.translate(mMatrix, mMatrix, model.translate);
		mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
		mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
		mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);
		mat4.scale(mMatrix, mMatrix, model.scale);
		mat4.multiply(model.mvMatrix, camera.vMatrix, mMatrix);
	
		mat3.normalFromMat4(model.nMatrix, model.mvMatrix);
	}
	

	function draw(model) {
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

		var fill = (model.fillstyle.search(/fill/) != -1);
		if (fill) {
			gl.enableVertexAttribArray(prog.normalAttrib);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
			gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
		}

		var wireframe = (model.fillstyle.search(/wireframe/) != -1);
		if (wireframe) {
			gl.disableVertexAttribArray(prog.normalAttrib);
			gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
			gl.drawElements(gl.LINES, model.iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
		}
	}

	return {
		start: start
	}
}());
