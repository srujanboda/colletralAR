
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';

export class InteractionManager {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.reticle = null;
        this.hitTestSource = null;

        this.initReticle();
    }

    initReticle() {
        this.reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.10, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0x00ff88 })
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    update(frame, session) {
        if (!this.hitTestSource && session) {
            session.requestReferenceSpace('viewer').then(rs => {
                session.requestHitTestSource({ space: rs }).then(s => this.hitTestSource = s);
            });
        }

        if (this.hitTestSource && frame) {
            const hits = frame.getHitTestResults(this.hitTestSource);
            if (hits.length > 0) {
                this.reticle.visible = true;
                const pose = hits[0].getPose(this.renderer.xr.getReferenceSpace());
                this.reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                this.reticle.visible = false;
            }
        }
    }

    getReticlePosition() {
        if (this.reticle.visible) {
            return new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
        }
        return null;
    }
}
