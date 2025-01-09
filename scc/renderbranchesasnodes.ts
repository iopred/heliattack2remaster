// render_branches.ts
import * as THREE from 'three';
import { Branch } from './spacecolonization';

export function renderBranchesAsNodes(
  branches: Branch[],
  scene: THREE.Scene,
  sphereRadius: number,
  nodeSize: number = 2
): THREE.Group {
  // Clear previous nodes
  const previousNodes = scene.getObjectByName('nodes');
  if (previousNodes) scene.remove(previousNodes);

  const nodeGroup = new THREE.Group();
  nodeGroup.name = 'nodes';

  branches.forEach((branch) => {
    const geometry = new THREE.SphereGeometry(nodeSize, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const node = new THREE.Mesh(geometry, material);

    // Project branch position onto the sphere's surface
    const normalizedPosition = branch.position.clone().normalize().multiplyScalar(sphereRadius);
    node.position.copy(normalizedPosition);

    nodeGroup.add(node);
  });

  scene.add(nodeGroup);

  return nodeGroup;
}
