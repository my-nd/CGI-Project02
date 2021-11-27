import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, mult, normalMatrix, inverse, vec3, vec4, add, scale  } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as PYRAMID from '../../libs/pyramid.js';


/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let lastFiredTime = -10000;

let mView;

/*
Each unit corresponds to 1 meter.
*/

//Ground
const SQUARE_LENGTH = 1;
const GROUND_WIDTH = 0.1;
const N_TILES_PER_SIDE = 20;

//Body
const BODY_HEIGHT = 1;
const BODY_LENGTH = 4;
const BODY_WIDTH = 2;


//Wheels
const WHEEL_RADIUS = 0.4;
const BODY_ELEVATION = WHEEL_RADIUS * 1.7;

const WHEEL_WIDTH = WHEEL_RADIUS * 0.5;
const WHEELS_X_DISTANCE = BODY_LENGTH / 4;
const WHEELS_Z_DISTANCE = BODY_WIDTH + WHEEL_WIDTH;



//Hatch
const HATCH_HEIGHT = BODY_HEIGHT;   
const DEFAULT_CANNON_ROTATION = -45;

//Cannon 

const CANNON_LENGTH = 1.5  *BODY_LENGTH;
const CANNON_TRANSLATION = 0.15 * CANNON_LENGTH;
const CANNON_RADIUS = 0.02 * CANNON_LENGTH;

//Suppressor
const SUPPRESSOR_TRANSLATION = 0.4 * BODY_LENGTH;
const SUPPRESSOR_LENGTH = 0.2 * CANNON_LENGTH;
const SUPPRESSOR_RADIUS = 1.2 * CANNON_RADIUS;


//g
let tankXTranslation = 0;
let wheelsRotation = 0;

//Hatch rotation angles
let hatchZRotation = 0;
let hatchYRotation = 0;

//Bullet 
const VELOCITY = 20;
const A = vec4(0,-9.8,0,0);
let bulletRotation = 10/VELOCITY;

let projectilesArray = [];





let VP_DISTANCE = 6;
let camX = VP_DISTANCE, camY = VP_DISTANCE, camZ = VP_DISTANCE;
let upZ = 0;

let mModel;





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
            case 'W':
                mode = gl.LINES; 
                break;
            case 'S':
                mode = gl.TRIANGLES;
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
            case "ArrowUp":
                tankXTranslation -= 0.05;
                wheelsRotation += (3600.05) / (2*Math.PI * WHEEL_RADIUS);
                break;
            case "ArrowDown":
                tankXTranslation += 0.05;
                wheelsRotation -= (3600.05) / (2*Math.PI * WHEEL_RADIUS);
                break;
            case "w":
                if(hatchZRotation <= 44)
                    hatchZRotation += 1;
                break;
            case "s":
                if(hatchZRotation >= -34)
                    hatchZRotation -= 1;
                break;
            case "a":
                hatchYRotation += 1;
                break;
            case "d":
                hatchYRotation -= 1;
                break;
            case " ":
                fire();
                break;
            case "+":
                VP_DISTANCE -= 1;
                break;
            case "-":
                VP_DISTANCE += 1;
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
        for(let z = 0; z < N_TILES_PER_SIDE; z++){   
            for(let x = 0; x < N_TILES_PER_SIDE; x++){
                pushMatrix();
                    multTranslation([((-N_TILES_PER_SIDE/2) + (x+0.5)) * SQUARE_LENGTH, 
                    -GROUND_WIDTH/2, ((-N_TILES_PER_SIDE/2) + (z+0.5)) * SQUARE_LENGTH]);
                    ((z+x)%2 == 0) ? gl.uniform4f(fColor, 0.390625, 0.2734375, 0.140625, 1.0) : gl.uniform4f(fColor, 0.5, 0.3515625, 0.2734375, 1.0);
                    tile();
                popMatrix();
            }
        }
    }

    
    

    function wheelsAndAxles(){

        pushMatrix();
            multTranslation([-1.5 * WHEELS_X_DISTANCE, WHEEL_RADIUS, 0]);            
            for(let i = 0; i < 4; i++){
                wheels();
                axles();
                multTranslation([WHEELS_X_DISTANCE, 0, 0]);
            }

        popMatrix();
    }

    
    function wheels(){
        pushMatrix();
        
            multTranslation([0 , 0, -WHEELS_Z_DISTANCE / 2]);
            for(let i = 0; i < 2; i++){
                pushMatrix();
                    multRotationZ(wheelsRotation);
                    tire();
                    rim();
                popMatrix();
                
                (i==0)? wheelArmor(-90, -0.27) : wheelArmor(90, 0.27);
                multTranslation([0, 0, WHEELS_Z_DISTANCE]);
            }

        popMatrix();
    }


    function wheelArmor(angle, displacement) {
        gl.uniform4f(fColor, 0.2, 0.2, 0.2, 1.0);

        pushMatrix();
            multTranslation([0, 0, displacement]);
            (angle < 0) ? multRotationZ(wheelsRotation) : multRotationZ(-wheelsRotation);
            multScale([(0.6/1.4) * (WHEEL_RADIUS-0.12) * 2, (0.6/1.4) * (WHEEL_RADIUS-0.12) * 2, 0.3]);
            multRotationX(angle);
            uploadModelView();
            PYRAMID.draw(gl, program, mode);

        popMatrix();
    }


    function tire(){
        gl.uniform4f(fColor, 0.15, 0.15, 0.15, 1.0); 
            pushMatrix();

            multRotationX(90); 
            multScale([(WHEEL_RADIUS * 2) / 1.4, WHEEL_WIDTH/0.4, (WHEEL_RADIUS * 2) / 1.4]); 

            //1.4 is the initial diameter of the torus 
            //(TORUS_DISK_DIAMETER + TORUS_DIAMETER)
            uploadModelView();
            TORUS.draw(gl, program, mode);

        popMatrix();
    }


    function rim(){
        gl.uniform4f(fColor, 0.3, 0.3, 0.3, 1.0);

        pushMatrix();

            multRotationX(90); 
            multScale( [(0.6/1.4) * WHEEL_RADIUS * 2, WHEEL_WIDTH*0.4, (0.6/1.4) * WHEEL_RADIUS * 2] ); 

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

        multRotationX(90);
        multRotationY(wheelsRotation);
        multScale([0.1, WHEELS_Z_DISTANCE, 0.1]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);

        popMatrix();
    }


    function body(){
        gl.uniform4f(fColor, 0.25, 0.30, 0.00, 1.0);
        pushMatrix();
            multTranslation([0, BODY_ELEVATION, 0]);
            multScale([BODY_LENGTH, BODY_HEIGHT, BODY_WIDTH]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();

        bumpers();

        hatchAndCannon();

    }


    function hatch(){
        pushMatrix();
            multScale([BODY_LENGTH * 0.5, HATCH_HEIGHT, BODY_WIDTH]);
            uploadModelView();
            SPHERE.draw(gl, program, mode);
        popMatrix();
    }


    function hatchAndCannon(){
        pushMatrix();
            gl.uniform4f(fColor, 0, 0.4, 0, 1.0); 
            multTranslation([0, BODY_ELEVATION + HATCH_HEIGHT/2, 0]);
            multRotationY(hatchYRotation);
            hatch();
            cannon();
        popMatrix()
    }



    function cannon(){
        gl.uniform4f(fColor, 0, 0.2, 0, 1.0); 

        pushMatrix();
            multRotationZ(hatchZRotation);
            pushMatrix();
                multTranslation([CANNON_TRANSLATION, CANNON_TRANSLATION, 0]);
                multRotationZ(DEFAULT_CANNON_ROTATION);
                multScale([CANNON_RADIUS, CANNON_LENGTH, CANNON_RADIUS]);
                uploadModelView();
                TORUS.draw(gl, program, mode);  
            popMatrix();
            supressor();
        popMatrix();        
    }


    function supressor(){
        gl.uniform4f(fColor, 0.5, 0.0, 0, 1.0);
        pushMatrix();
            multTranslation([SUPPRESSOR_TRANSLATION, SUPPRESSOR_TRANSLATION, 0]);
            multRotationZ(DEFAULT_CANNON_ROTATION);
            mModel = mult(inverse(mView), modelView()); // Mview^-1 * MmodelView
            
            multScale([SUPPRESSOR_RADIUS, SUPPRESSOR_LENGTH, SUPPRESSOR_RADIUS]);
            uploadModelView();
            TORUS.draw(gl, program, mode);
        popMatrix();
    }


function bumper(displacement, angle){
        gl.uniform4f(fColor, 0.0, 0.35, 0.0, 1.0);
        multTranslation([displacement, BODY_ELEVATION, 0]);
        multRotationZ(angle);
        multScale([BODY_HEIGHT, 0.5, BODY_WIDTH])
        uploadModelView();
        PYRAMID.draw(gl, program, mode);
    }

    function bumpers(){
        pushMatrix();
            bumper(-0.25 - BODY_LENGTH/2, 90);
        popMatrix()
        pushMatrix();
            bumper(0.25 + BODY_LENGTH/2, -90);
        popMatrix()
    }


    function tank(){
        pushMatrix();
            multTranslation([tankXTranslation, 0, 0]);
            body();
            wheelsAndAxles();
        popMatrix();
    }

    function projectile(angleZ, angleY, bulletRotation){
        gl.uniform4f(fColor, 0.80, 0.64, 0.00, 1.0);
        pushMatrix();
            multRotationY(angleY);
            multRotationZ(angleZ);
            
            multScale([0.15, 0.3, 0.15]);
            uploadModelView();
            CYLINDER.draw(gl, program, mode);

            multTranslation([0, 0.5, 0]);
            multScale([1, 2, 1]);
            uploadModelView();
            gl.uniform4f(fColor, 0.72, 0.53, 0.04, 1.0);
            SPHERE.draw(gl, program, mode);

        popMatrix();
    }

    function projectiles(){

        for(let i = 0; i < projectilesArray.length; i++){

            let initialPos = mult(projectilesArray[i][0],vec4(0,0,0,1));
            let initialVel = mult(normalMatrix(projectilesArray[i][0]),vec4(0,VELOCITY,0,0));

            let t = time - projectilesArray[i][3];
            
            let pos = add(add(initialPos, scale(t,initialVel)), scale(0.5,scale(Math.pow(t,2),A)));
            
            if (pos[1] < 0) continue;


            pushMatrix();
                multTranslation([pos[0], pos[1], pos[2]]);
                projectile(projectilesArray[i][1], projectilesArray[i][2]);
                if (projectilesArray[i][1] > -180) projectilesArray[i][1] -= bulletRotation ;
                
            popMatrix();
        }   
    }

    function fire(){
        if((time - lastFiredTime) >= 1) { // so that is a cooldown between bullets fired
            projectilesArray.push([mModel, DEFAULT_CANNON_ROTATION + hatchZRotation, hatchYRotation, time]);
            lastFiredTime = time;
        }
    }


    function render()
    {
        time += speed;
        window.requestAnimationFrame(render);
        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-3*VP_DISTANCE,3*VP_DISTANCE);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);


        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        mView = lookAt([camX, camY, camZ], [0,0,0], [0,1,upZ]);
        loadMatrix(mView);


        ground(); 
        tank();
        projectiles();
    }


}



const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))