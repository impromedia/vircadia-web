//
//  StoreInterface.ts
//
//  Created by Giga on 1 Sep 2022.
//  Copyright 2022 Vircadia contributors.
//  Copyright 2022 DigiSomni LLC.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

import { fallbackAvatar, fallbackAvatarModel } from "./DefaultModels";
import { Store, Mutations as StoreMutations } from "@Store/index";
import { Renderer } from "@Modules/scene";

export interface AvatarEntry {
    name: string,
    image: string,
    file: string,
    scale: number,
    starred: boolean
}

export interface AvatarEntryMap {
    [key: string]: AvatarEntry
}

function generateID(): string {
    // eslint-disable-next-line max-len
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const idLength = 8;
    let ID = "";
    for (let i = 0; i < idLength; i += 1) {
        ID += chars[Math.floor(Math.random() * chars.length)];
    }
    return ID;
}

export const AvatarStoreInterface = {
    getModelData(modelId: string | number, key?: keyof AvatarEntry): AvatarEntry | string | number | boolean {
        const models = Store.state.avatar.models as { [key: string]: AvatarEntry };
        if (key && key in (models[modelId] || fallbackAvatar())) {
            return models[modelId][key];
        }
        return models[modelId] || fallbackAvatar();
    },

    getActiveModelData(key?: keyof AvatarEntry): AvatarEntry | string | number | boolean {
        const activeModel = Store.state.avatar.activeModel;
        return this.getModelData(activeModel, key);
    },

    getAllModelsJSON(): string {
        return JSON.stringify(Store.state.avatar.models);
    },

    setModelData(modelId: string | number, key: keyof AvatarEntry, value: string | number | boolean): void {
        if (modelId in Store.state.avatar.models) {
            Store.commit(StoreMutations.MUTATE, {
                property: `avatar.models.${modelId}.${key}`,
                value
            });

            if (key === "file") {
                this.setActiveModel(modelId);
            }
        }
    },

    setActiveModelData(key: keyof AvatarEntry, value: string | number | boolean): void {
        const activeModel = Store.state.avatar.activeModel;
        this.setModelData(activeModel, key, value);
    },

    createNewModel(modelData: AvatarEntry, setToActive = true): string {
        let ID = generateID();
        // Ensure that the model ID doesn't already exist.
        while (ID in Store.state.avatar.models) {
            ID = generateID();
        }

        const currentModels = { ...Store.state.avatar.models };
        currentModels[ID] = modelData;

        Store.commit(StoreMutations.MUTATE, {
            property: `avatar.models`,
            value: currentModels
        });

        if (setToActive) {
            this.setActiveModel(ID);
        }

        return ID;
    },

    removeModel(modelId: string | number): void {
        if (modelId === Store.state.avatar.activeModel) {
            this.setActiveModel(fallbackAvatarModel());
        }
        const currentModels = { ...Store.state.avatar.models };

        if (modelId in currentModels) {
            delete currentModels[modelId];
        }

        Store.commit(StoreMutations.MUTATE, {
            property: `avatar.models`,
            value: currentModels
        });
    },

    setActiveModel(modelId: string | number): void {
        if (modelId in Store.state.avatar.models) {
            Store.commit(StoreMutations.MUTATE, {
                property: "avatar.activeModel",
                value: modelId
            });
        }
        try {
            const scene = Renderer.getScene();
            scene.loadMyAvatar(AvatarStoreInterface.getModelData(modelId, "file") as string)
                // .catch is a syntax error!?
                // eslint-disable-next-line @typescript-eslint/dot-notation
                .catch((err) => console.warn("Failed to load avatar:", err));
        } catch (error) {
            console.warn(error);
            console.warn("Cannot render active avatar model before the scene has been loaded.");
        }
    }
};
