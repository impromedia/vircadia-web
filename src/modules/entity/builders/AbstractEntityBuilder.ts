//
//  AbstractEntityBuilder.ts
//
//  Created by Nolan Huang on 9 Aug 2022.
//  Copyright 2022 Vircadia contributors.
//  Copyright 2022 DigiSomni LLC.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Scene
} from "@babylonjs/core";

import { GameObject } from "@Modules/object";
import { IEntity } from "../Entities";

export abstract class AbstractEntityBuilder {
    public abstract build(gameObj:GameObject, entity: IEntity) : void;
}
