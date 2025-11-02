"use strict";

const { vec3 } = glMatrix;

var canvas;
var gl;
var program;
var vBuffer, cBuffer;
var vPosition, aColor;

var points = [];
var colors = [];

var numTimesToSubdivide = 1;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    // 配置WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // 加载着色器和初始化属性缓冲区
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 创建缓冲区
    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();
    
    // 获取属性位置
    vPosition = gl.getAttribLocation(program, "vPosition");
    aColor = gl.getAttribLocation(program, "aColor");

    // 初始绘制Level 1
    updateLevel(1);
};

function updateLevel(level) {
    numTimesToSubdivide = parseInt(level);
    
    // 重置点数组和颜色数组
    points = [];
    colors = [];
    
    // 初始四面体顶点数据
    var vertices = [
        0.0000, 0.0000, -1.0000,
        0.0000, 0.9428, 0.3333,
        -0.8165, -0.4714, 0.3333,
        0.8165, -0.4714, 0.3333
    ];

    var t = vec3.fromValues(vertices[0], vertices[1], vertices[2]);
    var u = vec3.fromValues(vertices[3], vertices[4], vertices[5]);
    var v = vec3.fromValues(vertices[6], vertices[7], vertices[8]);
    var w = vec3.fromValues(vertices[9], vertices[10], vertices[11]);

    divideTetra(t, u, v, w, numTimesToSubdivide);

    // 更新顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // 更新颜色缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColor);

    render();
}

function triangle(a, b, c, color) {
    // 根据层次选择颜色方案
    var baseColor;
    if (numTimesToSubdivide === 1) {
        // Level 1使用灰度颜色方案
        baseColor = [
            0.8, 0.8, 0.8, 1.0,  // 浅灰
            0.5, 0.5, 0.5, 1.0,  // 中灰
            0.2, 0.2, 0.2, 1.0,  // 深灰
            0.0, 0.0, 0.0, 1.0   // 黑色
        ];
    } else {
        // Level 4使用彩色方案
        baseColor = [
            1.0, 0.0, 0.0, 1.0,  // 红色
            0.0, 1.0, 0.0, 1.0,  // 绿色
            0.0, 0.0, 1.0, 1.0,  // 蓝色
            0.0, 0.0, 0.0, 1.0   // 黑色
        ];
    }

    // 添加第一个顶点
    for (var k = 0; k < 4; k++) {
        colors.push(baseColor[color * 4 + k]);
    }
    for (var k = 0; k < 3; k++) {
        points.push(a[k]);
    }

    // 添加第二个顶点
    for (var k = 0; k < 4; k++) {
        colors.push(baseColor[color * 4 + k]);
    }
    for (var k = 0; k < 3; k++) {
        points.push(b[k]);
    }

    // 添加第三个顶点
    for (var k = 0; k < 4; k++) {
        colors.push(baseColor[color * 4 + k]);
    }
    for (var k = 0; k < 3; k++) {
        points.push(c[k]);
    }
}

function tetra(a, b, c, d) {
    triangle(a, c, b, 0);
    triangle(a, c, d, 1);
    triangle(a, b, d, 2);
    triangle(b, c, d, 3);
}

function divideTetra(a, b, c, d, count) {
    // 检查递归结束条件
    if (count === 0) {
        tetra(a, b, c, d);
    } else {
        var ab = vec3.create();
        vec3.lerp(ab, a, b, 0.5);
        var ac = vec3.create();
        vec3.lerp(ac, a, c, 0.5);
        var ad = vec3.create();
        vec3.lerp(ad, a, d, 0.5);
        var bc = vec3.create();
        vec3.lerp(bc, b, c, 0.5);
        var bd = vec3.create();
        vec3.lerp(bd, b, d, 0.5);
        var cd = vec3.create();
        vec3.lerp(cd, c, d, 0.5);

        count--;

        divideTetra(a, ab, ac, ad, count);
        divideTetra(ab, b, bc, bd, count);
        divideTetra(ac, bc, c, cd, count);
        divideTetra(ad, bd, cd, d, count);
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, points.length / 3);
}

// 使函数在全局可访问
window.updateLevel = updateLevel;