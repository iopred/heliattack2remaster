// Space Colonization Algorithm for a 3D Sphere
import * as THREE from 'three';

type Branch = {
  position: THREE.Vector3;
  parent: Branch | null;
  growDirection: THREE.Vector3;
  growCount: number;
};

type Options = {
  attractors?: THREE.Vector3[];
  radius?: number;
  killDistance?: number;
  influenceDistance?: number;
  growthStep?: number;
};

class SpaceColonization {
  attractors: THREE.Vector3[];
  branches: Branch[];
  radius: number;
  killDistance: number;
  influenceDistance: number;
  growthStep: number;

  constructor(options: Options) {
    this.attractors = options.attractors || [];
    this.branches = [];
    this.radius = options.radius || 100;
    this.killDistance = options.killDistance || 5;
    this.influenceDistance = options.influenceDistance || 20;
    this.growthStep = options.growthStep || 1;
  }

  addAttractor(point: THREE.Vector3): void {
    this.attractors.push(point);
  }

  grow(): void {
    // Mark attractors for removal if they're too close to branches
    const toRemove: number[] = [];
    this.attractors.forEach((attractor, i) => {
      let closestBranch: Branch | null = null;
      let minDist = Infinity;

      // Find the closest branch to this attractor
      this.branches.forEach(branch => {
        const dist = attractor.distanceTo(branch.position);
        if (dist < minDist) {
          minDist = dist;
          closestBranch = branch;
        }
      });

      // If the attractor is within kill distance, mark it for removal
      if (minDist < this.killDistance) {
        toRemove.push(i);
      } else if (minDist < this.influenceDistance) {
        // Add growth direction to the closest branch
        const direction = attractor.clone().sub(closestBranch!.position).normalize();
        closestBranch!.growDirection.add(direction);
        closestBranch!.growCount++;
      }
    });

    // Remove consumed attractors
    toRemove.reverse().forEach(index => {
      this.attractors.splice(index, 1);
    });

    // Grow branches based on accumulated directions
    const newBranches: Branch[] = [];
    this.branches.forEach(branch => {
      if (branch.growCount > 0) {
        const avgDirection = branch.growDirection.divideScalar(branch.growCount).normalize();
        const newPosition = branch.position.clone().add(avgDirection.multiplyScalar(this.growthStep));
        const newBranch: Branch = {
          position: newPosition,
          parent: branch,
          growDirection: new THREE.Vector3(0, 0, 0),
          growCount: 0
        };
        newBranches.push(newBranch);
      }
    });

    // Add new branches to the tree
    this.branches.push(...newBranches);
  }

  initialize(startPosition: THREE.Vector3): void {
    // Create the initial branch
    this.branches.push({
      position: startPosition.clone(),
      parent: null,
      growDirection: new THREE.Vector3(0, 0, 0),
      growCount: 0
    });
  }

  generateMesh(): THREE.LineSegments {
    // Create a mesh from branches
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];

    this.branches.forEach(branch => {
      if (branch.parent) {
        vertices.push(branch.position.x, branch.position.y, branch.position.z);
        vertices.push(branch.parent.position.x, branch.parent.position.y, branch.parent.position.z);
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });

    return new THREE.LineSegments(geometry, material);
  }
}

export default SpaceColonization;
