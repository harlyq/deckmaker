// Copyright 2014 Reece Elliott

///<reference path='propertydefinition.ts'/>
module PropertyPanel {

    export class Binding {
        container: HTMLElement = null;

        constructor(public editor: Editor, public objects: any[], public name: string, public property: Property) {}

        /*
         * @return {any} the value of the first *object* of this binding
         */
        getValue(): any {
            if (this.objects.length > 0)
                return this.objects[0][this.name];
            else
                return null;
        }

        setValue(value: any) {
            for (var i = 0; i < this.objects.length; ++i) {
                this.objects[i][this.name] = value;
            }
        }

        /*
         * @return {boolean} true, if all *name* attribute of all *objects* is the same
         */
        isSameValue(): any {
            var value = this.getValue();
            var name = this.name;
            for (var i = 1; i < this.objects.length; ++i) {
                if (this.objects[i][name] !== value)
                    return false;
            }
            return true;
        }
    }

    /*
     * @class Editor
     * @description provides a base class for describing an editor.
     *
     */
    export class Editor {
        getEditorType(): string {
            return '';
        }

        /*
         *
         */
        canHandle(value: any): boolean {
            return false;
        }

        /*
         * If true, the panel will iterate over the sub-properties of this object property.
         */
        hasSubObjects(binding: Binding): boolean {
            return false;
        }

        /*
         * The editor should append any relevant HTML to the parent element according to the
         * property values found in the binding.  Derived classes *must* set the *container*
         * attribute to the HTML container that is created for this editor.
         */
        createElement(binding: Binding): HTMLElement {
            return null;
        }

        /*
         * Called before removal of the editor from the panel. If editor is current editing
         * (e.g. startEdit() had been called), then stopEdit() will be called before shutdown()
         */
        //shutdown(binding: Binding) {}

        /*
         * Called when the property value has changed to force the editor to show that new value.
         */
        refresh(binding: Binding) {}

        /*
         * Called when the user starts to edit a property.  The editor should show the controls
         * necessary for editing this property.
         */
        startEdit(binding: Binding,
            onChange: (binding: Binding, value: any) => void,
            onInput: (binding: Binding, value: any) => void) {}

        /*
         * Called after startEdit() to indicate the edit mode has finished.
         * stopEdit() can be called from within the editor code to indicate that editing is complete.
         */
        stopEdit(binding: Binding) {}

    }

    export class StringEditor extends Editor {
        getEditorType(): string {
            return 'string';
        }

        createElement(binding: Binding): HTMLElement {
            var textElem = document.createElement('text');
            var htmlString = (binding.isSameValue() ? binding.getValue() : '----');

            textElem.innerHTML =
                '<style>' +
                '  .inputElem {position: fixed}' +
                '</style>' +
                '<span class="PropertyEditorName">' + binding.name + '</span>: ' +
                '<span class="PropertyEditorValue">' + htmlString + '</span>';

            return textElem;
        }

        canHandle(value: any): boolean {
            return true; // supports any type
        }

        refresh(binding: Binding) {
            var valueElem = < HTMLElement > binding.container.querySelector('.PropertyEditorValue');
            if (valueElem === null)
                return;

            valueElem.innerHTML = (binding.isSameValue() ? binding.getValue() : '----');
        }

        startEdit(binding: Binding,
            onChange: (binding: Binding, value: any) => void,
            onInput: (binding: Binding, value: any) => void) {

            var valueElem = binding.container.querySelector('.PropertyEditorValue');
            if (valueElem === null)
                return;

            var rectObject = valueElem.getBoundingClientRect();
            var value = binding.getValue();
            var inputElem = document.createElement('input');

            if (!binding.isSameValue())
                value = '----';

            // place inputElem on top of the valueElem
            inputElem.classList.add('inputElem');
            inputElem.classList.add('PropertyEditorEdit');
            inputElem.style.top = rectObject.top + 'px';
            inputElem.style.left = rectObject.left + 'px';
            inputElem.value = value.toString();
            inputElem.type = 'input';

            inputElem.addEventListener('input', function(e) {
                if (typeof onInput === 'function')
                    onInput(binding, ( < HTMLInputElement > e.target).value);
            });

            var self = this;
            inputElem.addEventListener('keypress', function(e) {
                if (e.keyCode === 13) {
                    if (typeof onChange === 'function')
                        onChange(binding, inputElem.value);

                    self.stopEdit(binding);
                }
            });


            binding.container.appendChild(inputElem);

            inputElem.setSelectionRange(0, inputElem.value.length);
            inputElem.focus();
        }

        stopEdit(binding: Binding) {
            var inputElem = binding.container.querySelector('.PropertyEditorEdit');
            if (inputElem === null)
                return;

            // if (reason === Reason.Commit) {
            //     this.onChange(binding, inputElem.value);
            // }

            binding.container.removeChild(inputElem);
        }
    }

    export class ObjectEditor extends Editor {
        getEditorType(): string {
            return 'object';
        }

        createElement(binding: Binding): HTMLElement {
            var container = document.createElement('div');
            container.innerHTML =
                '<style>' +
                '    [data-state="closed"]:before { content: "+" }' +
                '    [data-state="open"]:before { content: "-" }' +
                '    [data-state="closed"] ~ * { display: none !important }' +
                '    [data-state="open"] ~ * { padding: 2px 5px !important }' +
                '</style>' +
                '<div class="ObjectEditor PropertyEditorName" data-state="closed">' + binding.name + '</div>';

            container.querySelector('.ObjectEditor').addEventListener('click', this.toggleState);

            return container;
        }

        toggleState(e) {
            e.preventDefault();
            var elem = ( < HTMLElement > e.target);
            var isClosed = elem.getAttribute('data-state') === 'closed';
            elem.setAttribute('data-state', (isClosed ? 'open' : 'closed'));
        }

        canHandle(value: any): boolean {
            return value instanceof Object;
        }

        hasSubObjects(binding: Binding): boolean {
            return true;
        }
    }

    export class ListEditor extends Editor {
        getEditorType(): string {
            return 'list';
        }

        // creates an element for this binding
        createElement(binding: Binding): HTMLElement {
            var container = document.createElement('div');
            container.innerHTML =
                '<style>' +
                '    .PropertyEditorInputSelect { position: fixed; }' +
                '</style>' +
                '<span class="PropertyEditorName">' + binding.name + '</span>: ' +
                '<span class="PropertyEditorValue">----</span>';

            return container;
        }

        // refreshes the element in binding
        refresh(binding: Binding) {
            var valueSpan = < HTMLElement > binding.container.querySelector('.PropertyEditorValue');

            if (!binding.isSameValue()) {
                valueSpan.innerHTML = "----";
            } else {
                var list = binding.property.getList();
                var value = binding.getValue();

                for (var name in list) {
                    if (list[name] === value)
                        valueSpan.innerHTML = name;
                }
            }
        }

        // edits the element in binding
        startEdit(binding: Binding, onChange: (binding: Binding, value: any) => void) {
            var valueSpan = < HTMLElement > binding.container.querySelector('.PropertyEditorValue');
            var rectObject = valueSpan.getBoundingClientRect();

            var list = binding.property.getList();
            var value = binding.getValue();
            if (!binding.isSameValue())
                value = "----";

            var inputSelect = document.createElement("select");
            inputSelect.classList.add("PropertyEditorInputSelect");

            var count = 0;
            for (var name in list) {
                var option = document.createElement("option");

                option.setAttribute("value", name);
                option.innerHTML = name;
                if (value === list[name])
                    option.setAttribute("selected", "selected");

                inputSelect.appendChild(option);
                ++count;
            }
            binding.container.appendChild(inputSelect);

            var sizeStr: string = Math.min(10, count).toString();
            var self = this;

            inputSelect.style.top = rectObject.top + "px";
            inputSelect.style.left = rectObject.left + "px";
            inputSelect.setAttribute("size", sizeStr);
            inputSelect.setAttribute("expandto", sizeStr);
            inputSelect.addEventListener("change", function(e) {
                var list = binding.property.getList();
                var value = list[inputSelect.value];

                self.stopEdit(binding);

                onChange(binding, value);
            });

            inputSelect.focus();
        }

        // stops editing the element in binding and commits the result
        stopEdit(binding: Binding) {
            var inputSelect = binding.container.querySelector('.PropertyEditorInputSelect');
            binding.container.removeChild(inputSelect);
        }
    }
}
