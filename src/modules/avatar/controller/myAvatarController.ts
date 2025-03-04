//
//  AvatarController.ts
//
//  Created by Nolan Huang on 22 Jul 2022.
//  Copyright 2022 Vircadia contributors.
//  Copyright 2022 DigiSomni LLC.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

import {
    TransformNode
} from "@babylonjs/core";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable new-cap */
import { AvatarMapper, BoneType } from "../AvatarMapper";
import { ScriptComponent, inspectorAccessor } from "@Modules/script";

// Domain Modules
import { MyAvatarInterface, SkeletonJoint } from "@vircadia/web-sdk";
import Log from "@Modules/debugging/log";
import { MeshComponent } from "../../object";

export class MyAvatarController extends ScriptComponent {
    private _myAvatar : Nullable<MyAvatarInterface> = null;
    private _skeletonNodes: Map<string, TransformNode> = new Map<string, TransformNode>();
    private _modelURL : string | undefined;

    constructor() {
        super(MyAvatarController.typeName);
    }

    @inspectorAccessor()
    public get skeletonModelURL() : string | undefined {
        return this._modelURL;
    }

    public set skeletonModelURL(value:string | undefined) {
        this._modelURL = value;
        if (this._myAvatar && value) {
            this._myAvatar.skeletonModelURL = value;
        }
    }

    public set myAvatar(avatar : Nullable<MyAvatarInterface>) {
        this._myAvatar = avatar;
        if (!this._gameObject || !this._myAvatar) {
            return;
        }

        if (this._modelURL) {
            this._myAvatar.skeletonModelURL = this._modelURL;
        }

        this._myAvatar.scale = AvatarMapper.mapToDomainScale(this._gameObject.scaling);

        this._collectJoints();
    }

    public get myAvatar() : Nullable<MyAvatarInterface> {
        return this._myAvatar;
    }

    @inspectorAccessor()
    public get displayName() : string {
        return this._myAvatar ? this._myAvatar.displayName : "";
    }

    public set displayName(value:string) {
        if (this._myAvatar) {
            this._myAvatar.displayName = value;
        }
    }

    @inspectorAccessor()
    public get sessionDisplayName() : string {
        return this._myAvatar ? this._myAvatar.sessionDisplayName : "";
    }

    /**
    * Gets a string identifying the type of this Component
    * @returns "MyAvatarController" string
    */
    // eslint-disable-next-line class-methods-use-this
    public get componentType():string {
        return MyAvatarController.typeName;
    }

    static get typeName(): string {
        return "MyAvatarController";
    }

    public onUpdate():void {
        if (this._gameObject && this._myAvatar) {
            // sync position
            this._myAvatar.position = AvatarMapper.mapToDomainPosition(this._gameObject.position);
            // sync orientation
            this._myAvatar.orientation = AvatarMapper.mapToDomainOrientation(this._gameObject.rotationQuaternion);

            this._syncPoseToDomain();
        }
    }

    private _collectJoints() {
        if (!this._myAvatar || !this._gameObject) {
            return;
        }

        const skeleton = new Array<SkeletonJoint>();

        this._skeletonNodes.clear();
        const comp = this._gameObject.getComponent(MeshComponent.typeName) as MeshComponent;

        if (!comp || !comp.mesh) {
            return;
        }

        // Collect the names of the bones in the skeleton.
        const bones: string[] = [];
        if (comp.skeleton) {
            for (const bone of comp.skeleton.bones) {
                bones.push(bone.name);
            }
        }

        const nodes = comp.mesh.getChildren((node) => node.getClassName() === "TransformNode", false);
        nodes?.forEach((node) => {
            this._skeletonNodes.set(node.name, node as TransformNode);
        });

        const jointNames: string[] = [];
        let jointIndex = 0;
        this._skeletonNodes.forEach((node, key) => {
            const jointName = node.name;
            jointNames.push(jointName);

            const parentIndex = node.parent ? jointNames.indexOf(node.parent.name) : -1;

            let rotation = node.rotationQuaternion;
            if (parentIndex > 0 && parentIndex < skeleton.length && rotation) {
                const parentRotation = AvatarMapper.mapJointRotation(skeleton[parentIndex].defaultRotation);
                rotation = parentRotation.multiply(rotation);
            }

            const boneType = parentIndex === -1  // eslint-disable-line no-nested-ternary
                ? bones.includes(jointName) ? BoneType.SkeletonRoot : BoneType.NonSkeletonRoot
                : bones.includes(jointName) ? BoneType.SkeletonChild : BoneType.NonSkeletonChild;

            const joint = {
                jointName,
                jointIndex,
                parentIndex,
                boneType,
                defaultTranslation: AvatarMapper.mapToJointTranslation(node.position),
                defaultRotation: AvatarMapper.mapToJointRotation(rotation),
                defaultScale: AvatarMapper.mapToDomainScale(node.scaling)
            };

            skeleton.push(joint);

            jointIndex += 1;
        });

        this._myAvatar.skeleton = skeleton;
    }

    private _syncPoseToDomain() {
        if (!this._gameObject || !this._myAvatar) {
            return;
        }

        if (this._myAvatar.skeleton.length <= 0) {
            this._collectJoints();
        }

        this._myAvatar.skeleton.forEach((joint) => {
            if (!this._myAvatar) {
                return;
            }
            const node = this._skeletonNodes.get(joint.jointName);

            if (node) {
                this._myAvatar.jointTranslations[joint.jointIndex]
                   = AvatarMapper.mapToJointTranslation(node.position);

                let rotation = node.rotationQuaternion;
                if (rotation) {
                    if (joint.parentIndex >= 0) {
                        const q = this._myAvatar.jointRotations[joint.parentIndex];
                        if (q) {
                            const parentRotation = AvatarMapper.mapJointRotation(q);
                            rotation = parentRotation.multiply(rotation);
                        }
                    }

                    this._myAvatar.jointRotations[joint.jointIndex] = AvatarMapper.mapToJointRotation(rotation);
                }
            }
        });
    }
}
