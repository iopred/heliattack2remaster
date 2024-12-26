
import { Box3, BufferGeometry, LineBasicMaterial, Vector3, Line, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';

import { Explosion, Fire, Shard, Smoke } from './entities';
import { isTileCollision, checkPointCollisionWithBoxes, getScaleDelta, heliBoxes, setOpacity } from './utils';

function defaultBulletUpdate(game, delta) {
    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    if (isTileCollision(pos.x, -pos.y, game.map, game.tileSize)) {
        return true;
    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
        game.enemy.damage(this.damage, game);
        return true;
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}

function shotgunRocketUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 8);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function rpgUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time == 8) {
            game.audioManager.playEffect('rocketlauncher');
        } else if (this.time > 8 && this.time < 16) {
            this.velocity.x *= 1.4;
            this.velocity.y *= 1.4;
        }

        this.object.rotation.z -= (this.velocity.x * game.timeScale * 4) * Math.PI / 180;

        if (this.time % 2 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 8);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function rocketUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 14);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function seekerUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (game.enemy) {
            const enemyPosition = new Vector3();
            game.enemy.mesh.getWorldPosition(enemyPosition);

            const targetAim = Math.atan2(
                enemyPosition.y - this.object.position.y,
                enemyPosition.x - this.object.position.x
            );

            let aim = this.object.rotation.z;
            let dif = targetAim - aim;
            if (dif > Math.PI) {
                dif = -Math.PI*2 + dif;
            } else if (dif < -Math.PI) {
                dif = Math.PI*2 + dif;
            }

            aim += dif / 15;
            this.velocity.x = Math.cos(aim) * 3.5;
            this.velocity.y = Math.sin(aim) * 3.5;
            this.object.rotation.z = aim;
        }


        if (this.time % 4 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Smoke(game, pos, 14);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function shotgunRocketDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 50);
}

function explosionDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 100);
}

function abombUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.time % 8 == 0) {
            const pos = this.object.position.clone();
            pos.y *= -1;
            pos.z = -1;
            new Fire(game, pos, 20);
        }
        this.time++;
    }

    return defaultBulletUpdate.apply(this, [game, delta]);
}

function abombDestroy(game) {
    const pos = this.object.position.clone();
    pos.y *= -1;
    pos.z = 1;
    new Explosion(game, pos, 700);
}

const FLAME_TIME = 46;
const FLAME_FADE_TIME = 6;

function flameUpdate(game, delta) {
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        this.time++
    }

    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    if (isTileCollision(pos.x, -pos.y, game.map, game.tileSize)) {
        this.time = Math.max(FLAME_TIME - 6, this.time);
    }

    this.object.scale.x = this.object.scale.y = (5 + this.time/FLAME_TIME * (42 - 5)) / 42;
    if (this.time >= FLAME_TIME - FLAME_FADE_TIME) {
        this.material.opacity = 1-Math.min((this.time - (FLAME_TIME - FLAME_FADE_TIME)) / FLAME_FADE_TIME, 1)
    }
    if (this.time > FLAME_TIME) {
        return true;
    } else {
        game.audioManager.setLoopVolume('flame', 1.0, false);
    }

    if (game.enemy) {
        var bbox = new Box3().setFromObject(this.object).expandByScalar(-0.75);
        var enemyBbox = new Box3().setFromObject(game.enemy.mesh);
        bbox.min.z = enemyBbox.min.z = -5;
        bbox.max.z = enemyBbox.max.z = 5;
        if (bbox.intersectsBox(enemyBbox)) {
            game.enemy.damage(this.damage*(1-Math.min(this.time / FLAME_TIME, 1))*game.timeScale, game);
            this.time = Math.max(FLAME_TIME - 8, this.time);
            return false;
        }
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}


function grenadeUpdate(game, delta) {
    let move = false;
    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;
        this.velocity.y -= 0.35;
    }

    this.object.rotation.z -= (this.velocity.x * game.timeScale * 2) * Math.PI / 180;

    const pos = this.object.position;

    pos.x += this.velocity.x * game.timeScale
    if (isTileCollision(pos.x, -pos.y, game.map, game.tileSize)) {
        pos.x -= this.velocity.x * game.timeScale
        this.velocity.x *= -0.5;
    }
    pos.y += this.velocity.y * game.timeScale;
    if (isTileCollision(pos.x, -pos.y, game.map, game.tileSize)) {
        if (this.bounces >= 3) {
            return true;
        } else {
            pos.y -= this.velocity.y * game.timeScale
            this.velocity.y *= -0.5;
            if (!this.bounces) {
                this.bounces = 1;
            } else {
                this.bounces++;
            }
        }

    }

    if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
        game.enemy.damage(this.damage, game);
        return true;
    }

    if (!game.mapBox.containsPoint(pos)) {
        return true;
    }

    return false;
}

const FIRE_TIME = 80;

function fireMinesUpdate(game, delta) {
    if (this.time == 0) {
        this.object.rotation.z = 0;
    }

    this.tick += game.timeScale;
    if (this.tick >= 1) {
        this.tick %= 1;

        if (this.triggered) {
            this.time++;
        } else {
            this.velocity.y -= 0.5;
        }
    }

    if (this.triggered) {
        if (this.time <= 10) {
            setOpacity(this.pillar, this.time/10);
            this.pillar.scale.x = this.time/10;
        } else if (this.time >= FIRE_TIME-10) {
            const perc = 1 - (this.time - (FIRE_TIME - 10)) / 10;
            setOpacity(this.pillar, perc );
            this.pillar.scale.x = perc;
        }

        for (const flame of this.flames) {
            flame.flame.scale.x = flame.flame.scale.y += getScaleDelta(FIRE_TIME, this.time, flame.flameScale, flame.flameScale * 1.25 ) * game.timeScale;
        }

        if (game.enemy) {
            var bbox = new Box3().setFromObject(this.object);
            var enemyBbox = new Box3().setFromObject(game.enemy.mesh);
            bbox.min.z = enemyBbox.min.z = -5;
            bbox.max.z = enemyBbox.max.z = 5;
            if (bbox.intersectsBox(enemyBbox)) {
                game.enemy.damage(this.damage * game.timeScale, game);
            }
        }

        game.audioManager.setLoopVolume('flame', 1.0, false);

        return this.time >= FIRE_TIME;
    } else {
        const pos = this.object.position;

        pos.x += this.velocity.x * game.timeScale
        if (isTileCollision(pos.x, -pos.y, game.map, game.tileSize)) {
            pos.x -= this.velocity.x * game.timeScale
            this.velocity.x *= -0.5;
        }
        pos.y += this.velocity.y * game.timeScale;
        if (isTileCollision(pos.x, -pos.y, game.map, game.tileSize)) {
            pos.y = -(Math.floor(-pos.y / game.tileSize)) * game.tileSize + 2;

            const [pillar, flames] = constructFirePillar.apply(this, [game]);
            this.object.add(pillar)

            this.triggered = true;
            this.pillar = pillar;
            this.flames = flames;

            setOpacity(pillar, 0);
        }
    }

    return false;
}

function constructFirePillarSegment(game, heightOffset) {
    const texture = game.textures['./images/flamepillar.png'];
    const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
    const material = new MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    geometry.translate(0, texture.image.height / 2 + heightOffset * texture.image.height, 0); 
    return new Mesh(geometry, material);
}

function constructFlame(game) {
    const texture = game.textures['./images/flame.png'];
    const geometry = new PlaneGeometry(texture.image.width, texture.image.height);
    const material = new MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    return new Mesh(geometry, material);
}

const PILLAR_FLAMES = 15;

function constructFirePillar(game) {
    const object = new Object3D();

    
    object.add(constructFirePillarSegment(game, 0));
    object.add(constructFirePillarSegment(game, 0.95));

    const bbox = new Box3().setFromObject(object);
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y

    const flames: {flame: Mesh, flameScale: number}[] = [];

    for (let i = 1; i < PILLAR_FLAMES; i++) {
        const flame = constructFlame(game)
        const flameScale = 0.25 + Math.random() * 0.5;
        flame.position.y = i * height/PILLAR_FLAMES;
        flame.position.x = width * (-0.5 + Math.random()); 
        flame.rotation.z = (95 + Math.random() * 10) * Math.PI / 180;

        if (i == 7) {
            flame.position.x = 0;
            flame.position.y += 5;
            flame.scale.x = flame.scale.y = 1;

        } else {
            flame.scale.x = flame.scale.y = flameScale;
        }
        object.add(flame);

        flames.push({flame: flame, flameScale: flameScale});
    }

    return [object, flames];
}

function railUpdate(game, delta) {
    if (this.time == 0) {
        this.object.geometry.translate(this.material.map.image.width/2, 0, 0);
        let pos = this.object.position.clone();
        while(game.enemy) {
            if (checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes)) {
                game.enemy.damage(this.damage, game);
                break;
            }
        
            if (!game.mapBox.containsPoint(pos)) {
                break
            }

            pos.add(this.velocity);
        }
        this.time++;
    } else {
        this.tick += game.timeScale;
        if (this.tick >= 1) {
            this.tick %= 1;
            this.time++;
        }
    }

    if (this.time >= 10) {
        this.material.opacity -= 0.1 * game.timeScale;
    }
    return this.material.opacity <= 0;
}

function updateGrappleLine(game) {
    // Update the line's positions
    const positions = this.line.geometry.attributes.position.array;
    this.object.position.toArray(positions, 0); // Start point
    game.player.group.position.clone().add(game.player.weaponObject.position).toArray(positions, 3); // End point
    this.line.geometry.attributes.position.needsUpdate = true;
}

function grappleUpdate(game, delta) {
    if (this.time == 0) {
        this.time = 1;

        const lineMaterial = new LineBasicMaterial( { color: 0x000000, linewidth: 4 } );

        const points: Vector3[] = [];
        points.push( this.object.position );
        points.push( game.player.group.position.clone().add(game.player.weaponObject.position) );

        const lineGeometry = new BufferGeometry().setFromPoints( points );
        
        const line = new Line(lineGeometry, lineMaterial);
        this.line = line;
        game.world.add(line);
    }

    if (this.grappled) {
        if (!game.enemy) {
            return true;
        }

        const worldPosition = this.grappleOffset.clone().applyMatrix4(game.enemy.group.matrixWorld);
        this.object.position.copy(worldPosition);

        updateGrappleLine.apply(this, [game]);

        if (this.grappled.health <= 0) {
            this.grappled = false;
            game.world.remove(this.line);

            return true;
        }

        return false;
    }

    const pos = this.object.position;
    pos.x += this.velocity.x * game.timeScale;
    pos.y += this.velocity.y * game.timeScale;

    
    updateGrappleLine.apply(this, [game]);

    if (isTileCollision(pos.x, -pos.y, game.map, game.tileSize)) {
        game.world.remove(this.line);

        return true;
    }

    if (game.enemy && checkPointCollisionWithBoxes(pos, game.enemy, heliBoxes) && !game.enemy.grappled) {
        //game.enemy.damage(this.damage, game);
        game.enemy.grappled = true;
        this.grappled = game.enemy;
        this.grappleOffset = this.object.position.clone().sub(game.enemy.group.position);

        
        for(var i = 0; i < 2; i++) {
            const p = this.object.position.clone()
            //p.x += -40 + Math.random() * 80;
            p.y *= -1;
            new Shard(game, p);
        }

        game.playHit();

        return false;
    }

    if (!game.mapBox.containsPoint(pos)) {
        game.world.remove(this.line);

        return true;
    }

    return false;
}

export {
    abombDestroy,
    abombUpdate,
    defaultBulletUpdate,
    explosionDestroy,
    fireMinesUpdate,
    flameUpdate,
    grappleUpdate,
    grenadeUpdate,
    railUpdate,
    rocketUpdate,
    rpgUpdate,
    seekerUpdate,
    shotgunRocketDestroy,
    shotgunRocketUpdate,
};

export default {
    abombDestroy,
    abombUpdate,
    defaultBulletUpdate,
    explosionDestroy,
    fireMinesUpdate,
    flameUpdate,
    grappleUpdate,
    grenadeUpdate,
    railUpdate,
    rocketUpdate,
    rpgUpdate,
    seekerUpdate,
    shotgunRocketDestroy,
    shotgunRocketUpdate,
};