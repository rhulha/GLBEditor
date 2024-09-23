import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let global_threed_file_ref = null;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new TrackballControls(camera, renderer.domElement);

controls.rotateSpeed = 10.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;

controls.keys = ['KeyA', 'KeyS', 'KeyD'];

const pmremGen = new THREE.PMREMGenerator(renderer);
//scene.background = new THREE.Color( 0xf0f0f0 );
scene.background = scene.environment = pmremGen.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const light = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(light);

//const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
//directionalLight.position.set(1, 1, 1).normalize();
//scene.add(directionalLight);

const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700, // Gold color
    roughness: 0.4,   // Adjust the roughness for a gold-like appearance
    metalness: 1.0,   // Full metalness for a metallic look
});

camera.position.z = 15;

const fileNameElement = document.getElementById('fileName');
document.getElementById('openMenu').addEventListener('click', openMenu);

function openMenu() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.fbx,.3dm';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (global_threed_file_ref)
            scene.remove(global_threed_file_ref);
        fileNameElement.textContent = file.name;
        if (file) {
            const url = URL.createObjectURL(file);
            console.log(url);
            loadModel(url);
            animate();
        }
    };
    input.click();
}


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', onMouseClick, false);

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const selectedObject = intersects[0].object;
        console.log('Selected object:', selectedObject);

        updateObjectDetails(selectedObject);

        highlightObject(selectedObject);

    }
}


const fbx_loader = new FBXLoader();
const rhino3dmLoader = new Rhino3dmLoader();
rhino3dmLoader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.0.1/');

const gltf_loader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
//dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' );
dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.1/examples/jsm/libs/draco/');
dracoLoader.setDecoderConfig({ type: 'js' });
gltf_loader.setDRACOLoader(dracoLoader);


function loadModel(name) {
    let this_loader;
    if (name.endsWith('.3dm')) {
        this_loader = rhino3dmLoader;
    } else if (name.endsWith('.fbx')) {
        this_loader = fbx_loader;
    } else if (name.endsWith('.glb')) {
        this_loader = gltf_loader;
    } else {
        this_loader = gltf_loader;
    }

    this_loader.load(name, (threed_file) => {
        console.log(threed_file);
        if (threed_file.scene) {
            threed_file = threed_file.scene;
        }
        threed_file.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                //child.material = goldMaterial;
                //child.material.flatShading = false;
            }
        });
        scene.add(threed_file);
        updateSceneGraph();
        global_threed_file_ref = threed_file;
    });

}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


function createSceneGraphElement(object, parentElement) {
    const element = document.createElement('div');
    element.textContent = object.name || object.type;
    parentElement.appendChild(element);

    element.addEventListener('click', () => {
        highlightObject(object);
        updateObjectDetails(object);
    });

    if (object.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.style.marginLeft = '10px';
        parentElement.appendChild(childrenContainer);

        object.children.forEach(child => {
            createSceneGraphElement(child, childrenContainer);
        });
    }
}

function highlightObject(object) {
    // Reset previous highlights
    scene.traverse(child => {
        if (child.material) {
            child.material.emissive.setHex(child.currentHex || 0x000000);
        }
    });

    // const material = new THREE.MeshStandardMaterial({        color: 0xff0000    });
    // selectedObject.material = material;

    // Highlight the selected object
    if (object.material) {
        object.material = object.material.clone();
        object.currentHex = object.material.emissive.getHex();
        object.material.emissive.setHex(0xff0000); // Highlight color
    }
}

function updateSceneGraph() {
    const sceneGraphContainer = document.getElementById('scene-graph');
    sceneGraphContainer.innerHTML = ''; // Clear previous content
    createSceneGraphElement(scene, sceneGraphContainer);
}

function updateObjectDetails(object) {

    const geometry = object.geometry;

    // Calculate face count
    let faceCount = 0;
    if (geometry && geometry.faces) {
        faceCount = geometry.faces.length;
    } else if (geometry && geometry.index) {
        faceCount = geometry.index.count / 3;
    } else if (geometry && geometry.attributes && geometry.attributes.position) {
        faceCount = geometry.attributes.position.count / 3;
    }

    const detailsElement = document.getElementById('object-details');
    if (object) {
        detailsElement.innerHTML = `
            <strong>Name:</strong> ${object.name}<br>
            <strong>Type:</strong> ${object.type}<br>
            <strong>Position:</strong> ${object.position.x}, ${object.position.y}, ${object.position.z}<br>
            <strong>Rotation:</strong> ${object.rotation.x}, ${object.rotation.y}, ${object.rotation.z}<br>
            <strong>Scale:</strong> ${object.scale.x}, ${object.scale.y}, ${object.scale.z}<br>
            <strong>Face count:</strong> ${faceCount}<br>

        `;
    } else {
        detailsElement.innerHTML = 'Select an object to see details';
    }
}

function invertNormals(object) {
    const geometry = object.geometry;
    if (geometry && geometry.faces) {
        // For non-indexed geometry
        geometry.faces.forEach(face => {
            const temp = face.b;
            face.b = face.c;
            face.c = temp;
        });
        geometry.normalsNeedUpdate = true;
    } else if (geometry && geometry.index) {
        // For indexed geometry
        const indices = geometry.index.array;
        for (let i = 0; i < indices.length; i += 3) {
            const temp = indices[i + 1];
            indices[i + 1] = indices[i + 2];
            indices[i + 2] = temp;
        }
        geometry.index.needsUpdate = true;
    }
}

