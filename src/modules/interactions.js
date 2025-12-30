
import * as THREE from 'three';

export class InteractionManager {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.reticle = null;
        this.hitTestSource = null;
        this.isRequestingHitTest = false;

        this.initReticle();
    }

    initReticle() {
        // Create a more visible reticle ring
        const geometry = new THREE.RingGeometry(0.08, 0.10, 32);
        geometry.rotateX(-Math.PI / 2);
        
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff88,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        this.reticle = new THREE.Mesh(geometry, material);
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    update(frame, session) {
        // Initialize hit test source (async, but only once)
        if (!this.hitTestSource && session && !this.isRequestingHitTest) {
            this.isRequestingHitTest = true;
            // Use 'local' reference space for hit testing on surfaces
            session.requestReferenceSpace('local')
                .then(referenceSpace => {
                    return session.requestHitTestSource({ space: referenceSpace });
                })
                .then(hitTestSource => {
                    this.hitTestSource = hitTestSource;
                    this.isRequestingHitTest = false;
                    console.log("Hit test source created successfully");
                })
                .catch(error => {
                    console.error("Failed to create hit test source with 'local':", error);
                    // Try alternative: 'local-floor' if 'local' fails
                    return session.requestReferenceSpace('local-floor')
                        .then(referenceSpace => {
                            return session.requestHitTestSource({ space: referenceSpace });
                        })
                        .then(hitTestSource => {
                            this.hitTestSource = hitTestSource;
                            this.isRequestingHitTest = false;
                            console.log("Hit test source created with local-floor");
                        })
                        .catch(fallbackError => {
                            console.error("Failed to create hit test source with local-floor:", fallbackError);
                            this.isRequestingHitTest = false;
                        });
                });
        }

        if (this.hitTestSource && frame) {
            try {
                const hits = frame.getHitTestResults(this.hitTestSource);
                if (hits.length > 0) {
                    const pose = hits[0].getPose(this.renderer.xr.getReferenceSpace());
                    if (pose) {
                        this.reticle.visible = true;
                        this.reticle.matrix.fromArray(pose.transform.matrix);
                    } else {
                        this.reticle.visible = false;
                    }
                } else {
                    this.reticle.visible = false;
                }
            } catch (error) {
                console.error("Error getting hit test results:", error);
                this.reticle.visible = false;
            }
        } else if (!this.hitTestSource && session) {
            // Hit test source not ready yet, keep reticle hidden
            this.reticle.visible = false;
        }
    }

    getReticlePosition() {
        if (this.reticle.visible) {
            return new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
        }
        return null;
    }
}
