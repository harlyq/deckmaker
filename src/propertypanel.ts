///<reference path='propertyeditor.ts'/>
module PropertyPanel {

    export interface Event {
        objects: any[];
        prop: string;
        value: any;
    }

    export interface DefinitionGroup {
        /*
         * @param {object} object to evaluate
         * @return {boolean} true if this definition list can be used for the given object
         */
        canUse(object: any): boolean;

        /*
         * definitions to show for this object
         */
        definitions: {
            [key: string]: Definition
        };
    }

    export class Panel {
        private bindings: Binding[] = [];
        private definitionGroups: DefinitionGroup[] = [];
        private editors: Editor[] = [];
        private editing: Binding = null;
        private objects: any[] = [];
        private lastChild: any = null;

        onInput: (event: Event) => void;
        onChange: (event: Event) => void;
        commitChanges: boolean = true;

        constructor(public parent: HTMLElement) {
            this.lastChild = parent.lastChild;

            parent.addEventListener('click', this.onClick.bind(this));
        }

        setObjects(objects: any[], onChange ? : (event: Event) => void, onInput ? : (event: Event) => void): Panel {
            if (this.isArrayEqual(objects, this.objects))
                return this;

            if (typeof onChange === 'function')
                this.onChange = onChange;

            if (typeof onInput === 'function')
                this.onInput = onInput;

            this.destroyEditors();
            this.objects = objects;
            this.buildEditors(objects, this.parent);
            return this;
        }

        addEditor(editor: Editor): Panel {
            this.editors.push(editor);
            return this;
        }

        removeEditor(editor: Editor): Panel {
            var i = this.editors.indexOf(editor);
            if (i !== -1)
                this.editors.splice(i, 1);
            return this;
        }

        addDefinitionGroup(definitionGroup: DefinitionGroup): Panel {
            this.definitionGroups.push(definitionGroup);
            return this;
        }

        removeDefintionList(definitionGroup: DefinitionGroup): Panel {
            var i = this.definitionGroups.indexOf(definitionGroup);
            if (i !== -1)
                this.definitionGroups.splice(i, 1);
            return this;
        }

        private onClick(e) {
            var elem = e.target;
            var found = false;

            while (elem && elem instanceof HTMLElement && !found) {
                found = ( < HTMLElement > elem).classList.contains('PropertyPanelElement');
                if (!found)
                    elem = ( < HTMLElement > elem).parentNode;
            }
            if (found)
                this.startEdit(this.findBinding( < HTMLElement > elem));
        }

        private findBinding(container: HTMLElement): Binding {
            for (var i = 0; i < this.bindings.length; ++i) {
                var binding = this.bindings[i];
                if (binding.container === container)
                    return binding;
            }
            return null;
        }

        private findDefinitionGroup(objects: any[]): DefinitionGroup {
            if (objects.length === 0)
                return null;

            // work backwards, as the latter definitions are more specific
            for (var i = this.definitionGroups.length - 1; i >= 0; --i) {
                var definitionGroup = this.definitionGroups[i];
                var supports = true;

                for (var k = 0; supports && k < objects.length; ++k)
                    supports = definitionGroup.canUse(objects[k]);

                if (supports)
                    return definitionGroup;
            }

            return null;
        }

        private findEditorByObjects(objects: any[], prop: string, definition: Definition): Editor {
            if (objects.length === 0)
                return null;

            // if there is a specific editorType then must match it            
            if (definition.editorType) {
                // work backwards, as the editors added last are the most specific
                for (var i = this.editors.length - 1; i >= 0; --i) {
                    var editor = this.editors[i];
                    if (editor.getEditorType() === definition.editorType)
                        return editor;
                }
                return null;
            }

            // work backwards, as the editors added last are the most specific
            for (var i = this.editors.length - 1; i >= 0; --i) {
                var editor = this.editors[i];
                var supports = true;
                for (var k = 0; supports && k < objects.length; ++k) {
                    supports = editor.canHandle(objects[k][prop])
                }

                if (supports)
                    return editor;
            }

            return null;
        }

        editorInput(binding: Binding, value: any) {
            if (binding !== this.editing)
                return; // invalid callback

            if (typeof this.onInput === 'function') {
                var event: Event = {
                    objects: binding.objects.slice(),
                    prop: binding.prop,
                    value: value
                };
                this.onInput(event);
            }

            if (this.commitChanges) {
                binding.setValue(value);
            }
        }

        editorChange(binding: Binding, value: any) {
            if (binding !== this.editing)
                return; // invalid callback

            if (typeof this.onChange === 'function') {
                var event: Event = {
                    objects: binding.objects.slice(),
                    prop: binding.prop,
                    value: value
                };
                this.onChange(event);
            }

            if (this.commitChanges) {
                binding.setValue(value);

                if (this['editing'] && this.editing['editor'] &&
                    typeof this.editing.editor.refresh === 'function')
                    this.editing.editor.refresh(this.editing);
            }

            this.editing = null;
        }

        editorCancel() {
            this.editing = null;
        }

        private isArrayEqual(a: any[], b: any[]): boolean {
            if (a.length !== b.length)
                return false;

            var isEqual = true;
            for (var i = 0; isEqual && i < a.length; ++i) {
                isEqual = a[i] === b[i];
            }
            return isEqual;
        }

        private startEdit(binding) {
            if (binding.editor !== null && typeof binding.editor === 'object') {
                if (binding === this.editing)
                    return; // already editing

                this.stopEdit();

                if (typeof binding.editor.startEdit === 'function') {
                    this.editing = binding;
                    binding.editor.startEdit(binding, this.editorChange.bind(this), this.editorInput.bind(this));
                }
            }
        }

        private stopEdit() {
            if (this['editing'] && this.editing['editor']) {
                if (typeof this.editing.editor.stopEdit === 'function')
                    this.editing.editor.stopEdit(this.editing);

                if (typeof this.editing.editor.refresh === 'function')
                    this.editing.editor.refresh(this.editing);
            }
            this.editing = null;
        }

        private destroyEditors() {
            this.stopEdit();

            // // in reverse, in case a later binding is dependent upon an earlier one
            // for (var i = this.bindings.length - 1; i >= 0; i--) {
            //     var editor = this.bindings[i].editor;
            //     if (editor !== null)
            //         editor.shutdown();
            // }
            this.bindings.length = 0;

            // clean-up any elements added by buildEditors
            if (typeof this.parent === 'object') {
                while (this.parent.lastChild != this.lastChild)
                    this.parent.removeChild(this.parent.lastChild);
            }
        }

        private buildEditors(objects: any[], parent: HTMLElement) {
            var definitionGroup = this.findDefinitionGroup(objects);
            if (definitionGroup === null)
                return;

            for (var prop in definitionGroup.definitions) {
                var definition = definitionGroup.definitions[prop];
                var editor = this.findEditorByObjects(objects, prop, definition);
                if (editor === null)
                    continue;

                var binding = new Binding(editor, objects, prop, definition);
                var container = editor.createElement(binding);
                if (container === null)
                    continue;

                binding.container = container;
                container.classList.add('PropertyPanelElement');
                parent.appendChild(container);
                editor.refresh(binding); // draw the appropriate value

                this.bindings.push(binding);

                if (editor.hasSubObjects(binding)) {
                    var subObjects = [];
                    for (var k = 0; k < objects.length; ++k)
                        subObjects[k] = objects[k][prop];

                    this.buildEditors(subObjects, container);
                }
            }
        }
    }
}
