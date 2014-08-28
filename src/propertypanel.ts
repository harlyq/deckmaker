// Copyright 2014 Reece Elliott

///<reference path='propertydefinition.ts'/>
///<reference path='propertyeditor.ts'/>
module PropertyPanel {

    export interface Event {
        objects: any[];
        name: string;
        value: any;
    }

    export class Panel {
        private bindings: Binding[] = [];
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

        private findEditorByObjects(objects: any[], name: string, property: Property): Editor {
            if (objects.length === 0)
                return null;

            // if there is a specific editorType then must match it            
            if (property.editorType) {
                // work backwards, as the editors added last are the most specific
                for (var i = this.editors.length - 1; i >= 0; --i) {
                    var editor = this.editors[i];
                    if (editor.getEditorType() === property.editorType)
                        return editor;
                }
                return null;
            }

            // work backwards, as the editors added last are the most specific
            for (var i = this.editors.length - 1; i >= 0; --i) {
                var editor = this.editors[i];
                var supports = true;
                for (var k = 0; supports && k < objects.length; ++k) {
                    supports = editor.canHandle(objects[k][name])
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
                    name: binding.name,
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
                    name: binding.name,
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
            var definition = g_definitionManager.findDefinitionByObject(objects);
            if (definition === null)
                return;

            for (var name in definition.properties) {
                var property = definition.properties[name];
                var editor = this.findEditorByObjects(objects, name, property);
                if (editor === null)
                    continue;

                var binding = new Binding(editor, objects, name, property);
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
                        subObjects[k] = objects[k][name];

                    this.buildEditors(subObjects, container);
                }
            }
        }
    }
}
