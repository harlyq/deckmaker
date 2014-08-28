// Copyright 2014 Reece Elliott

module PropertyPanel {

    export interface PropertyMap {
        [key: string]: any;
    }

    export interface Property {
        /*
         * the type of editor to use.  if not set, 'typeof' will be used to discern the type
         * of the property.
         */
        editorType ? : string;

        /*
         * if the editorType === 'list', this returns the list
         */
        getList ? : () => {
            [key: string]: any
        };
    }

    export interface DefinitionOptions {
        type: any;
        parent ? : any;
        properties: PropertyMap;
    }

    export class Definition {
        type: any;
        properties: PropertyMap = {};

        constructor(options: DefinitionOptions) {
            if (options.parent) {
                // copy all properties from the super class
                var parentDefinition = g_definitionManager.findDefinitionByType(options.parent);
                for (var prop in parentDefinition.properties) {
                    this.properties[prop] = parentDefinition.properties[prop];
                }
            }

            this.type = options.type;

            // copy all the properties from the options
            for (var prop in options.properties) {
                this.properties[prop] = options.properties[prop];
            }

            g_definitionManager.addDefinition(this);
        }
    }

    export class DefinitionManager {
        definitions: Definition[] = [];

        addDefinition(definition: Definition) {
            this.definitions.push(definition);
        }

        findDefinitionByType(type: any): Definition {
            for (var i = 0; i < this.definitions.length; ++i) {
                if (this.definitions[i].type === type)
                    return this.definitions[i];
            }
        }

        findDefinitionByObject(objects: any[]): Definition {
            if (objects.length === 0)
                return undefined;

            // work backwards, as the latter definitions are more specific
            for (var i = this.definitions.length - 1; i >= 0; --i) {
                var definition = this.definitions[i];
                var supports = true;

                for (var k = 0; supports && k < objects.length; ++k)
                    supports = objects[k] instanceof definition.type;

                if (supports)
                    return definition;
            }

            return undefined;
        }
    }

    export
    var g_definitionManager = new DefinitionManager();
}
