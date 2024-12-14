import { Box3, Color, NearestFilter, Plane, Raycaster, ShaderMaterial, SRGBColorSpace, Texture, Vector3 } from 'three';

const planeZ = new Plane(new Vector3(0, 0, 1), 0);
const raycaster = new Raycaster();

function calculateAngleToMouse(camera, object, mouse) {
    // Update raycaster with the mouse position in NDC
    raycaster.setFromCamera(mouse, camera);

    const intersectPoint = new Vector3();
    // Calculate the point where the ray intersects with the plane z = 0
    raycaster.ray.intersectPlane(planeZ, intersectPoint);

    // Get object position in world coordinates
    const objectPosition = new Vector3();
    object.getWorldPosition(objectPosition);

    // Calculate the angle
    const angle = Math.atan2(
        intersectPoint.y - objectPosition.y,
        intersectPoint.x - objectPosition.x
    );

    return angle;
}

function manageRaycasterIntersections(scene, camera, vector) {
    return;

    camera.updateMatrixWorld();
    raycaster.setFromCamera(vector, camera);
    var intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        console.log("intersects")
    }
}


function createTintShader(texture: Texture | null) {
    if (!texture) {
        console.warn('No texture provided. Using a default empty texture.');
        texture = new Texture(); // Provide a default texture
    }

    const tintShaderMaterial = new ShaderMaterial({
        uniforms: {
            map: { value: texture },                      // Texture map
            color: { value: new Color(0xffffff) },       // Base color multiplier
            tint: { value: new Color(0xffffff) },        // Tint color
            brightness: { value: 2.0 },                  // Brightness multiplier
            tintEnabled: { value: 0.0 },                 // Toggle for tint (1 = enabled, 0 = disabled)
            brightnessEnabled: { value: 0.0 },           // Toggle for brightness (1 = enabled, 0 = disabled)
            opacity: { value: 1.0 }                      // Opacity (1 = fully opaque, 0 = fully transparent)
        },
        transparent: true, // Allow transparency
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv; // Pass UV coordinates to the fragment shader
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D map; // Texture sampler
            uniform vec3 color;    // Base color multiplier
            uniform vec3 tint;     // Tint color
            uniform float brightness; // Brightness multiplier
            uniform float tintEnabled; // Toggle for tint effect
            uniform float brightnessEnabled; // Toggle for brightness effect
            uniform float opacity;       // Opacity
            varying vec2 vUv;      // UV coordinates

            void main() {
                // Sample the texture (assumed to be in linear space)
                vec4 texColor = texture2D(map, vUv);
    
                // Apply the base color multiplier
                vec3 baseColor = texColor.rgb * color;
    
                // Apply tint if enabled
                vec3 tintedColor = mix(baseColor, baseColor * tint, tintEnabled);
    
                // Apply brightness if enabled
                vec3 brightenedColor = mix(tintedColor, tintedColor * brightness, brightnessEnabled);
    
                // Output the final color with alpha modulated by opacity
                gl_FragColor = vec4(brightenedColor, texColor.a * opacity);
            }
        `
    });

    return tintShaderMaterial;
}

function setUV(geometry, index, size, width, height) {
    // Calculate UV coordinates based on the index
    const tilesPerRow = width / size;
    const u = (index % tilesPerRow) * size / width;
    const v = 1 - Math.floor(index / tilesPerRow) * size / height;

    // Update UV coordinates
    geometry.attributes.uv.setXY(0, u, v);                            // Bottom-left
    geometry.attributes.uv.setXY(1, u + size / width, v);    // Bottom-right
    geometry.attributes.uv.setXY(2, u, v - size / height);   // Top-left
    geometry.attributes.uv.setXY(3, u + size / width, v - size / height); // Top-right

    geometry.attributes.uv.needsUpdate = true;
}

// AABB collision detection function
function checkTileCollisions(entity, timeScale, tilemap, tileSize) {
    const xCol = resolveAxisCollision(entity, timeScale, 'x', tilemap, tileSize);
    const yCol = resolveAxisCollision(entity, timeScale, 'y', tilemap, tileSize);

    return [xCol, yCol];
}

// Helper to load a texture as a promise
function loadTexture(loader, textures, url) {
    return new Promise((resolve, reject) => {
        loader.load(url, (texture) => {
            texture.magFilter = NearestFilter;
            texture.minFilter = NearestFilter;
            texture.colorSpace = SRGBColorSpace;
            textures[url] = texture;
            resolve(texture);
        }, undefined, (error) => {
            console.log("Error loading texture: ", url)
            reject({url, error});
        });
    });
}

// Helper function to resolve collision along a single axis
function resolveAxisCollision(entity, timeScale, axis, tilemap, tileSize) {
    if (entity.velocity[axis] == 0) {
        return false;
    }

    let point = entity.position[axis] + (entity.velocity[axis] > 0 ? entity.bounds.max[axis] : entity.bounds.min[axis]);
    const tilePos = Math.floor((point + entity.velocity[axis] * timeScale) / tileSize);

    const otherAxis = axis === 'x' ? 'y' : 'x';
    const startOther = Math.floor((entity.position[otherAxis] + entity.bounds.min[otherAxis]) / tileSize);
    const endOther = Math.floor((entity.position[otherAxis] + entity.bounds.max[otherAxis]) / tileSize);

    for (let otherTilePos = startOther; otherTilePos <= endOther; otherTilePos++) {
        let xTile = axis === 'x' ? tilePos : otherTilePos;
        let yTile = axis === 'y' ? tilePos : otherTilePos;

        if (yTile < 0) {
            yTile = 0;
        } else if (yTile >= tilemap.length) {
            yTile = tilemap.length - 1;
        }
        if (xTile < 0) {
            xTile = 0;
        } else if (xTile >= tilemap[yTile].length) {
            xTile = tilemap[yTile].length - 1;
        }


        // Check if tile is solid
        if (tilemap[yTile][xTile][0] === 1) {
            if (entity.velocity[axis] > 0) {
                entity.position[axis] = tilePos * tileSize - entity.bounds.max[axis] - 0.01;
            } else {
                entity.position[axis] = (tilePos + 1) * tileSize - entity.bounds.min[axis];

            }

            return true;
        }
    }


    entity.position[axis] += entity.velocity[axis] * timeScale;
    return false;
}

function visibleHeightAtZDepth(depth, camera) {
    // compensate for cameras not positioned at z=0
    const cameraOffset = camera.position.z;
    if (depth < cameraOffset) depth -= cameraOffset;
    else depth += cameraOffset;

    // vertical fov in radians
    const vFOV = camera.fov * Math.PI / 180;

    // Math.abs to ensure the result is always positive
    return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

function visibleWidthAtZDepth(depth, camera) {
    const height = visibleHeightAtZDepth(depth, camera);
    return height * camera.aspect;
};

function rotateAroundPivot(point, pivot, angle, flip) {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    // Step 1: Translate point to the origin (relative to the pivot)
    const dx = point.x - pivot.x;
    const dy = (flip ? -point.y : point.y) - pivot.y;

    // Step 2: Rotate the point
    const rotatedX = dx * cosAngle - dy * sinAngle;
    const rotatedY = dx * sinAngle + dy * cosAngle;

    // Step 3: Translate back to the pivot's position
    return {
        x: rotatedX + pivot.x,
        y: rotatedY + pivot.y,
        z: 0,
    };
}


function isTileCollision(x, y, tilemap, tileSize) {
    x = Math.floor(x / tileSize);
    y = Math.floor(y / tileSize);

    if (y < 0) {
        y = 0;
    } else if (y >= tilemap.length) {
        y = tilemap.length - 1;
    }
    if (x < 0) {
        x = 0;
    } else if (x >= tilemap[y].length) {
        x = tilemap[y].length - 1;
    }


    return tilemap[y][x][0] == 1;
}

function isPlayerCollision(x, y, player) {
    const pos = player.position;
    const bounds = player.bounds
    return x >= pos.x + player.bounds.min.x && x <= pos.x + player.bounds.max.x && y >= pos.y + player.bounds.min.y && y <= pos.y + player.bounds.max.y;
}

function isPlayerCollisionRect(x, y, width, height, player) {
    const pos = player.position;
    const bounds = player.bounds;
    return x + width >= pos.x + player.bounds.min.x && x <= pos.x + player.bounds.max.x && y + height >= pos.y + player.bounds.min.y && y <= pos.y + player.bounds.max.y;
}

var heliBoxes = [
    new Box3(new Vector3(-88, 13, -5), new Vector3(-72, 28, 5)),
    new Box3(new Vector3(-88, -29, -5), new Vector3(-31, 13, 5)),
    new Box3(new Vector3(-31, -37, -5), new Vector3(55, 35, 5)),
    new Box3(new Vector3(55, 0, -5), new Vector3(77, 20, 5)),
    new Box3(new Vector3(55, -33, -5), new Vector3(100, -1, 5)),
];

function checkPointCollisionWithBoxes(point, enemy, boxes) {
    if (!enemy) {
        return;
    }

    // Convert the world-space point to the object's local space
    const localPoint = point.clone();
    enemy.heliGroup.worldToLocal(localPoint);

    for (const box of boxes) {
        if (box.containsPoint(localPoint)) {
            return true;
        }
    }

    return false;
}

function checkBoxCollisionWithBoxes(testBox, enemy, boxes) {
    // // Convert the world-space point to the object's local space
    const localPoint = new Vector3();
    enemy.heliGroup.worldToLocal(localPoint);
    // localPoint.multiplyScalar(-1)

    const localBox = testBox.clone().translate(localPoint);

    for (const box of boxes) {
        if (box.intersectsBox(localBox)) {
            return true;
        }
    }

    return false;
}

function isUrl(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

function createIframe(url: string): HTMLIFrameElement | null {
    // Validate the URL
    if (!isUrl(url)) {
        console.error("Invalid URL:", url);
        return null;
    }

    // Create the iframe element
    const iframe = document.createElement("iframe");

    // Set the iframe attributes
    iframe.src = url;
    iframe.width = "320px"; // Adjust width as needed
    iframe.height = "240px"; // Adjust height as needed
    iframe.style.border = "none"; // Remove borders (optional)

    // Append the iframe to the document body or a specific container
    document.body.appendChild(iframe);

    return iframe;
}

function sayMessage(text) {
    if (text.indexOf('[') !== 0) {
        return;
    } else {
        text = text.split(']')[0].substring(1);
    }

    if (window.audioManager.effectVolume != 0.0) {
        let utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    }
}

function setOpacity( obj, opacity ) {
    obj.children.forEach((child)=>{
        setOpacity( child, opacity );
    });
    if ( obj.material ) {
        obj.material.opacity = opacity ;
    };
};


function getScaleDelta(totalFrames, currentFrame, minScale = 1, maxScale = 2) {
    // Calculate the progression ratio (0 to 1 across the cycle)
    const progress = currentFrame / totalFrames;

    // Oscillate the scale using a sine wave (smooth transition)
    const scale = minScale + (maxScale - minScale) * (0.5 - 0.5 * Math.cos(progress * 2 * Math.PI));

    // Calculate the delta (difference between this frame and the next frame's scale)
    const nextProgress = (currentFrame + 1) / totalFrames;
    const nextScale = minScale + (maxScale - minScale) * (0.5 - 0.5 * Math.cos(nextProgress * 2 * Math.PI));

    const delta = nextScale - scale;
    return delta;
}

export {
    calculateAngleToMouse,
    checkBoxCollisionWithBoxes,
    checkPointCollisionWithBoxes,
    checkTileCollisions,
    createIframe,
    createTintShader,
    getScaleDelta,
    heliBoxes,
    isPlayerCollision,
    isPlayerCollisionRect,
    isTileCollision,
    isUrl,
    loadTexture,
    manageRaycasterIntersections,
    rotateAroundPivot,
    setOpacity,
    sayMessage,
    setUV,
    visibleHeightAtZDepth,
    visibleWidthAtZDepth,
};

export default {
    calculateAngleToMouse,
    checkBoxCollisionWithBoxes,
    checkPointCollisionWithBoxes,
    checkTileCollisions,
    createIframe,
    createTintShader,
    getScaleDelta,
    heliBoxes,
    isPlayerCollision,
    isPlayerCollisionRect,
    isTileCollision,
    isUrl,
    loadTexture,
    manageRaycasterIntersections,
    rotateAroundPivot,
    setOpacity,
    sayMessage,
    setUV,
    visibleHeightAtZDepth,
    visibleWidthAtZDepth,
};