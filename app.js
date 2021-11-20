import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';


import { vec4 } from "./libs/MV.js";

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running


//Ground
const SQUARE_LENGTH = 1;
const GROUND_X = 10;
const GROUND_Z = 10;

//Wheels
const WHEEL_DIAMETER = 1;
const WHEELS_X_DISTANCE = WHEEL_DIAMETER + 0.5;
const WHEELS_Z_DISTANCE = 2;





const VP_DISTANCE = 5;




function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);

    mode = gl.LINES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case 'w':
                mode = gl.LINES; 
                break;
            case 's':
                mode = gl.TRIANGLES;
                break;
            case 'p':
                animation = !animation;
                break;
            case '+':
                if(animation) speed *= 1.1;
                break;
            case '-':
                if(animation) speed /= 1.1;
                break;
        }
    }

    gl.clearColor(0.71875, 0.83984375, 0.91015625, 1.0);
    SPHERE.init(gl);
    CUBE.init(gl);
    TORUS.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }


    function ground(){
        multScale([SQUARE_LENGTH, 0, SQUARE_LENGTH]);
        uploadModelView();

        CUBE.draw(gl, program, mode);
    }


    

    function wheels(){
        
        pushMatrix();
        
        multTranslation([(-1.5 * WHEELS_X_DISTANCE) - (1.5 * WHEEL_DIAMETER), WHEEL_DIAMETER/2, -WHEELS_Z_DISTANCE/2]);
        for(let i = 0; i < 2; i++){
            pushMatrix();

            for(let j = 0; j < 4; j++){
                pushMatrix();

                multRotationX(90);
                multScale([1, WHEEL_DIAMETER, 1]); 
                uploadModelView();
                TORUS.draw(gl, program, mode);

                popMatrix();

                multTranslation([WHEELS_X_DISTANCE, 0, 0]);
            }

            popMatrix();
            multTranslation([0, 0, WHEELS_Z_DISTANCE]);
        }

        popMatrix();
        
    }







    function render()
    {
        if(animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        loadMatrix(lookAt([VP_DISTANCE,VP_DISTANCE,VP_DISTANCE], [0,0,0], [0,1,0]));
        

        pushMatrix();

        const fColor = gl.getUniformLocation(program, "fColor");

        multTranslation([-GROUND_X, 0, -GROUND_Z]);  

        for(let z = 0; z < 2*GROUND_Z/SQUARE_LENGTH; z++){
            pushMatrix();
            for(let x = 0; x < 2*GROUND_X/SQUARE_LENGTH; x++){
                pushMatrix();
                ((z+x)%2 == 0) ? gl.uniform4f(fColor, 0.0, 0.3, 0.0, 1.0) : gl.uniform4f(fColor, 0.0, 0.4, 0.0, 1.0);
                ground();
                popMatrix();
                multTranslation([SQUARE_LENGTH, 0, 0]);
            }
            popMatrix();
            multTranslation([0, 0, SQUARE_LENGTH]); 
        }
        popMatrix();

        gl.uniform4f(fColor, 0.15, 0.15, 0.15, 1.0);
        wheels();










    
    }


}



const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))