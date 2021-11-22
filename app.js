import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as PYRAMID from '../../libs/pyramid.js';


import { vec4 } from "./libs/MV.js";

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running


/*
Each unit corresponds to 1 meter.
*/

//Ground
const SQUARE_LENGTH = 0.5;
const GROUND_X = 10;
const GROUND_Z = 10;
const GROUND_WIDTH = 0.1;

//Wheels
const WHEEL_RADIUS = 0.4;
const WHEEL_WIDTH = 0.6;
const WHEELS_X_DISTANCE = (WHEEL_RADIUS * 2) + 0.2;
const WHEELS_Z_DISTANCE = 2.0;

//Body
const BODY_HEIGHT = 1;
const BODY_LENGTH = WHEELS_X_DISTANCE * 3 * 1.1;
const BODY_WIDTH = WHEELS_Z_DISTANCE - WHEEL_WIDTH/2;
const BODY_ELEVATION = WHEEL_RADIUS * 1.7;

//Hatch
const HATCH_CENTER_X = -WHEELS_X_DISTANCE + 0.2;
const HATCH_CENTER_Y = BODY_ELEVATION + 0.5;    



const VP_DISTANCE = 6;
let camX = VP_DISTANCE, camY = VP_DISTANCE, camZ = VP_DISTANCE;
let upZ = 0;




function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);

    mode = gl.LINES; 

    const fColor = gl.getUniformLocation(program, "fColor");

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
            case '1':
                camX = -VP_DISTANCE;
                camY = 0;
                camZ = 0;
                upZ = 0;
                break;
            case '2':
                camX = 0;
                camY = VP_DISTANCE;
                camZ = 0;
                upZ = 1;
                break;
            case '3':
                camX = 0;
                camY = 0;
                camZ = VP_DISTANCE;
                upZ = 0;
                break;
            case '4':
                camX = VP_DISTANCE;
                camY = VP_DISTANCE;
                camZ = VP_DISTANCE;
                upZ = 0;
                break;
        }
    }

    gl.clearColor(0.71875, 0.83984375, 0.91015625, 1.0);
    SPHERE.init(gl);
    CUBE.init(gl);
    TORUS.init(gl);
    CYLINDER.init(gl);
    PYRAMID.init(gl);
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

    function uploadModelView(){
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function tile(){
        pushMatrix();

        multScale([SQUARE_LENGTH, GROUND_WIDTH, SQUARE_LENGTH]);
        uploadModelView();
        CUBE.draw(gl, program, mode);

        popMatrix();
    }

    function ground(){
        pushMatrix();

        multTranslation([-GROUND_X, -GROUND_WIDTH/2, -GROUND_Z]);  

        for(let z = 0; z < 2*GROUND_Z/SQUARE_LENGTH; z++){
            pushMatrix();   
            for(let x = 0; x < 2*GROUND_X/SQUARE_LENGTH; x++){
                ((z+x)%2 == 0) ? gl.uniform4f(fColor, 0.390625, 0.2734375, 0.140625, 1.0) : gl.uniform4f(fColor, 0.5, 0.3515625, 0.2734375, 1.0);
                tile();
                multTranslation([SQUARE_LENGTH, 0, 0]);
            }
            popMatrix();
            multTranslation([0, 0, SQUARE_LENGTH]); 
        }
        popMatrix();
    }
    

    function wheelsAndAxles(){
        pushMatrix();
        multTranslation([-1.5 * WHEELS_X_DISTANCE, WHEEL_RADIUS, 0]);

        for(let i = 0; i < 4; i++){
            wheel();
            axles();
            multTranslation([WHEELS_X_DISTANCE, 0, 0]);
        }

        popMatrix();
    }
    
    
    function wheel(){
        pushMatrix();
        
        multTranslation([0 , 0, -WHEELS_Z_DISTANCE / 2]);

        for(let i = 0; i < 2; i++){
            tire();
            rim();
            (i==0)? wheelArmor(-90) : wheelArmor(90);
            multTranslation([0, 0, WHEELS_Z_DISTANCE]);
        }

        popMatrix();
    }


    function wheelArmor(angle) {
        gl.uniform4f(fColor, 0.5, 0.1, 0.32, 1.0);

        pushMatrix();

        multScale([(0.6/1.4) * (WHEEL_RADIUS-0.05) * 2, (0.6/1.4) * (WHEEL_RADIUS-0.05) * 2, 0.3]);
        multRotationX(angle);
        multTranslation([0, (WHEEL_RADIUS+WHEEL_WIDTH)/2, 0]);

        uploadModelView();
        PYRAMID.draw(gl, program, mode);

        popMatrix();
    }


    function tire(){
        gl.uniform4f(fColor, 0.15, 0.15, 0.15, 1.0); 
        pushMatrix();

        multScale([(WHEEL_RADIUS * 2) / 1.4, (WHEEL_RADIUS * 2) / 1.4, WHEEL_WIDTH]); 
        multRotationX(90);  
        //1.4 is the initial diameter of the torus 
        //(TORUS_DISK_DIAMETER + TORUS_DIAMETER)
        uploadModelView();
        TORUS.draw(gl, program, mode);

        popMatrix();
    }


    function rim(){
        gl.uniform4f(fColor, 0.3, 0.3, 0.3, 1.0);

        pushMatrix();

        multScale( [(0.6/1.4) * WHEEL_RADIUS * 2, (0.6/1.4) * WHEEL_RADIUS * 2, WHEEL_WIDTH*0.4] ); 
        multRotationX(90); 

        // 0.6/1.4 comes from the relation of the inner circle 
        // of the torus vs the outer circle 
        // innerCircle = (0.6/1.4) * outterCircle

        uploadModelView();
        CYLINDER.draw(gl, program, mode);

        popMatrix();
    }


    function axles(){   
        gl.uniform4f(fColor, 0.4, 0.4, 0.4, 1.0);
        pushMatrix();

        multScale([0.1, 0.1, WHEELS_Z_DISTANCE]);
        multRotationX(90);  
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
        
        popMatrix();
    }


    function body(){
        pushMatrix();   
            multScale([BODY_LENGTH, BODY_HEIGHT, BODY_WIDTH]);
            multTranslation([0, BODY_ELEVATION, 0]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();

            bumpers();
            hatchAndCannon();


    }


    function hatchAndCannon(){
        hatch();
        cannon1();
    }


    function hatch(){
        gl.uniform4f(fColor, 0, 0.4, 0, 1.0); 

        pushMatrix();

        multTranslation([HATCH_CENTER_X, HATCH_CENTER_Y, 0]);
        multScale([BODY_LENGTH * 0.5, 1.3, BODY_WIDTH]);
        
        uploadModelView();
        SPHERE.draw(gl, program, mode);

        popMatrix();
    }


    function cannon1(){
        gl.uniform4f(fColor, 0, 0.2, 0, 1.0); 

        pushMatrix();

        multTranslation([HATCH_CENTER_X + 1, HATCH_CENTER_Y + 1 , 0]);
        multRotationZ(-45);
        multScale([0.2, 9, 0.2]);
        uploadModelView();
        TORUS.draw(gl, program, mode);
        popMatrix();
        
        supressor();
    }


    function supressor(){

        gl.uniform4f(fColor, 0.5, 0.0, 0, 1.0); 

        pushMatrix();

        multTranslation([HATCH_CENTER_X + 2.3, HATCH_CENTER_Y + 2.3 , 0]);
        multRotationZ(-45);
        multScale([0.4, 2, 0.4]);
        uploadModelView();
        TORUS.draw(gl, program, mode);

        popMatrix();

    }


    function frontBumper(){
        gl.uniform4f(fColor, 0.0, 0.5, 0.0, 1.0);

        pushMatrix();
            multTranslation([0.36+(BODY_LENGTH/2), BODY_ELEVATION, 0]);
            multScale([1.5*BODY_HEIGHT/2, 1, BODY_WIDTH]);

            multRotationZ(-90);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix();
    }

    function rearBumper(){
        gl.uniform4f(fColor, 0.0, 0.5, 0.0, 1.0);
        pushMatrix();
            multTranslation([-0.36-(BODY_LENGTH/2), BODY_ELEVATION, 0]);
            multScale([1.5 *BODY_HEIGHT/2, 1, BODY_WIDTH]);

            multRotationZ(90);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);
        popMatrix()
    }

    function bumpers(){
        frontBumper();
        rearBumper();
    }


    function tank(){
        body();
        wheelsAndAxles();
    }




    function render()
    {
        if(animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        loadMatrix(lookAt([camX, camY, camZ], [0,0,0], [0,1,upZ]));
        

        ground(); 
        
        tank();

    
    }


}



const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))