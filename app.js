import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationY, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running


const SQUARE_LENGTH = 10;
const GROUND_X = 100;
const GROUND_Z = 100;

const VP_DISTANCE = 100;



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

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    SPHERE.init(gl);
    CUBE.init(gl);
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

    function Sun()
    {
        // Don't forget to scale the sun, rotate it around the y axis at the correct speed
        multScale([SUN_DIAMETER, SUN_DIAMETER, SUN_DIAMETER]);
        multRotationY(360*time/SUN_DAY);

        // Send the current modelview matrix to the vertex shader
        uploadModelView();

        // Draw a sphere representing the sun
        SPHERE.draw(gl, program, mode);
    }


    function Mercury()
    {
        multScale([MERCURY_DIAMETER, MERCURY_DIAMETER, MERCURY_DIAMETER]);
        multRotationY(360*time/MERCURY_DAY);

        // Send the current modelview matrix to the vertex shader
        uploadModelView();

        // Draw a sphere 
        SPHERE.draw(gl, program, mode);
    }


    function ground(){
        multScale([SQUARE_LENGTH, 1, SQUARE_LENGTH]);
        uploadModelView();
        
        CUBE.draw(gl, program, mode);
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

        multTranslation([-GROUND_X, 0, -GROUND_Z]);

        for(let z = 0; z < 2*GROUND_Z/SQUARE_LENGTH; z++){
            pushMatrix()
            for(let x = 0; x < 2*GROUND_X/SQUARE_LENGTH; x++){
                pushMatrix()
                ground();
                popMatrix();
                multTranslation([SQUARE_LENGTH, 0, 0]);
            }
            popMatrix()
            multTranslation([0, 0, SQUARE_LENGTH]);
            
        }


        popMatrix();

    
    }


}



const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))