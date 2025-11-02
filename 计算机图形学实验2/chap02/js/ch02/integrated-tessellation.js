"use strict";

const { vec3 } = glMatrix;

var canvas;
var gl;
var program;
var vertexBuffer;
var vPosition;

var points = [];
var currentLevel = 1;
var currentRotationType = 'none';
var currentTheta = 60;

var radius = 1.0;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    
    if (!gl) {
        alert("浏览器不支持WebGL2");
        return;
    }

    // 配置WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // 加载着色器和初始化属性缓冲区
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 创建缓冲区
    vertexBuffer = gl.createBuffer();
    
    // 获取属性位置
    vPosition = gl.getAttribLocation(program, "vPosition");
    
    // 初始绘制
    // updateDrawing(); // 注释掉，由HTML页面触发
};

// 源代码解释：
// 原代码中的 twist 变量控制是否使用基于距离的旋转
// 当 twist = false 时，使用固定角度旋转
// 当 twist = true 时，使用基于距离的旋转
// 我们将其扩展为支持四种模式：无旋转、固定旋转、距离旋转、两者结合

function updateTessellation(level, rotationType, theta) {
    currentLevel = level;
    currentRotationType = rotationType;
    currentTheta = theta;
    
    generatePoints();
    renderTriangles();
}

function generatePoints() {
    points = [];
    
    // 初始化三角形的三个顶点（等边三角形的三个顶点）
    // 角度分别为90°, 210°, -30°，半径为1.0
    var vertices = [
        radius * Math.cos(90 * Math.PI / 180.0), radius * Math.sin(90 * Math.PI / 180.0), 0,
        radius * Math.cos(210 * Math.PI / 180.0), radius * Math.sin(210 * Math.PI / 180.0), 0,
        radius * Math.cos(-30 * Math.PI / 180.0), radius * Math.sin(-30 * Math.PI / 180.0), 0
    ];

    var u = vec3.fromValues(vertices[0], vertices[1], vertices[2]);
    var v = vec3.fromValues(vertices[3], vertices[4], vertices[5]);
    var w = vec3.fromValues(vertices[6], vertices[7], vertices[8]);

    // 开始递归细分三角形
    divideTriangle(u, v, w, currentLevel);
    
    // 将数据加载到GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    
    // 关联着色器变量与数据缓冲区
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
}

function tessellaTriangle(a, b, c) {
    var zerovec3 = vec3.create();
    vec3.zero(zerovec3);
    var radian = currentTheta * Math.PI / 180.0;
    
    var a_new = vec3.create();
    var b_new = vec3.create();
    var c_new = vec3.create();

    // 根据旋转类型处理顶点
    switch (currentRotationType) {
        case 'none':
            // 任务c：无旋转，直接绘制线框
            // 原代码：直接使用顶点坐标，绘制三角形边线
            points.push(a[0], a[1], a[2]);
            points.push(b[0], b[1], b[2]);
            points.push(b[0], b[1], b[2]);
            points.push(c[0], c[1], c[2]);
            points.push(c[0], c[1], c[2]);
            points.push(a[0], a[1], a[2]);
            break;
            
        case 'fixed':
            // 任务d：固定角度旋转
            // 原代码：使用 vec3.rotateZ 进行固定角度旋转
            vec3.rotateZ(a_new, a, zerovec3, radian);
            vec3.rotateZ(b_new, b, zerovec3, radian);
            vec3.rotateZ(c_new, c, zerovec3, radian);
            
            points.push(a_new[0], a_new[1], a_new[2]);
            points.push(b_new[0], b_new[1], b_new[2]);
            points.push(b_new[0], b_new[1], b_new[2]);
            points.push(c_new[0], c_new[1], c_new[2]);
            points.push(c_new[0], c_new[1], c_new[2]);
            points.push(a_new[0], a_new[1], a_new[2]);
            break;
            
        case 'distance':
            // 任务e：基于距离的旋转
            // 原代码：根据顶点到原点的距离计算旋转角度
            var d_a = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
            var d_b = Math.sqrt(b[0] * b[0] + b[1] * b[1]);
            var d_c = Math.sqrt(c[0] * c[0] + c[1] * c[1]);

            // 注意：原代码中的公式有误，应该是 d = sqrt(x² + y²)
            // 旋转公式：x' = x*cos(d*θ) - y*sin(d*θ), y' = x*sin(d*θ) + y*cos(d*θ)
            vec3.set(a_new, 
                a[0] * Math.cos(d_a * radian) - a[1] * Math.sin(d_a * radian), 
                a[0] * Math.sin(d_a * radian) + a[1] * Math.cos(d_a * radian), 0);
            vec3.set(b_new,
                b[0] * Math.cos(d_b * radian) - b[1] * Math.sin(d_b * radian),
                b[0] * Math.sin(d_b * radian) + b[1] * Math.cos(d_b * radian), 0);
            vec3.set(c_new,
                c[0] * Math.cos(d_c * radian) - c[1] * Math.sin(d_c * radian),
                c[0] * Math.sin(d_c * radian) + c[1] * Math.cos(d_c * radian), 0);
            
            points.push(a_new[0], a_new[1], a_new[2]);
            points.push(b_new[0], b_new[1], b_new[2]);
            points.push(b_new[0], b_new[1], b_new[2]);
            points.push(c_new[0], c_new[1], c_new[2]);
            points.push(c_new[0], c_new[1], c_new[2]);
            points.push(a_new[0], a_new[1], a_new[2]);
            break;
            
        case 'both':
            // 新增：同时进行固定旋转和距离旋转
            // 先进行固定角度旋转
            vec3.rotateZ(a_new, a, zerovec3, radian);
            vec3.rotateZ(b_new, b, zerovec3, radian);
            vec3.rotateZ(c_new, c, zerovec3, radian);
            
            // 再进行基于距离的旋转
            var d_a = Math.sqrt(a_new[0] * a_new[0] + a_new[1] * a_new[1]);
            var d_b = Math.sqrt(b_new[0] * b_new[0] + b_new[1] * b_new[1]);
            var d_c = Math.sqrt(c_new[0] * c_new[0] + c_new[1] * c_new[1]);
            
            var a_final = vec3.create();
            var b_final = vec3.create();
            var c_final = vec3.create();
            
            vec3.set(a_final, 
                a_new[0] * Math.cos(d_a * radian) - a_new[1] * Math.sin(d_a * radian), 
                a_new[0] * Math.sin(d_a * radian) + a_new[1] * Math.cos(d_a * radian), 0);
            vec3.set(b_final,
                b_new[0] * Math.cos(d_b * radian) - b_new[1] * Math.sin(d_b * radian),
                b_new[0] * Math.sin(d_b * radian) + b_new[1] * Math.cos(d_b * radian), 0);
            vec3.set(c_final,
                c_new[0] * Math.cos(d_c * radian) - c_new[1] * Math.sin(d_c * radian),
                c_new[0] * Math.sin(d_c * radian) + c_new[1] * Math.cos(d_c * radian), 0);
            
            points.push(a_final[0], a_final[1], a_final[2]);
            points.push(b_final[0], b_final[1], b_final[2]);
            points.push(b_final[0], b_final[1], b_final[2]);
            points.push(c_final[0], c_final[1], c_final[2]);
            points.push(c_final[0], c_final[1], c_final[2]);
            points.push(a_final[0], a_final[1], a_final[2]);
            break;
    }
}

// 递归细分三角形函数
// 原代码：将一个大三角形细分为四个小三角形
function divideTriangle(a, b, c, count) {
    // 递归终止条件
    if (count === 0) {
        tessellaTriangle(a, b, c);
    } else {
        // 计算各边中点
        var ab = vec3.create();
        vec3.lerp(ab, a, b, 0.5);  // ab = a + 0.5*(b - a)
        var bc = vec3.create();
        vec3.lerp(bc, b, c, 0.5);  // bc = b + 0.5*(c - b)
        var ca = vec3.create();
        vec3.lerp(ca, c, a, 0.5);  // ca = c + 0.5*(a - c)

        // 递归细分四个新的三角形
        divideTriangle(a, ab, ca, count - 1);  // 左上三角形
        divideTriangle(ab, b, bc, count - 1);  // 右上三角形
        divideTriangle(ca, bc, c, count - 1);  // 底部三角形
        divideTriangle(ab, bc, ca, count - 1); // 中心三角形
    }
}

function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 使用LINES模式绘制线框
    gl.drawArrays(gl.LINES, 0, points.length / 3);
}

// 使函数在全局可访问
window.updateTessellation = updateTessellation;