import Element from '../element';
import { isUndef } from '../../utils/tool';

class HTMLTextAreaElement extends Element {
  constructor(options) {
    super(options);
    this.__changed = false;
  }

  /**
   * The cloneNode interface is invoked to handle additional properties
   */
  _dealWithAttrsForCloneNode() {
    return {
      type: this.type,
      value: this.value,
      disabled: this.disabled,
      maxlength: this.maxlength,
      placeholder: this.placeholder,

      // Special field
      mpplaceholderclass: this.mpplaceholderclass
    };
  }

  setAttribute(name, value, immediate = true) {
    if (name === 'focus' || name === 'autofocus' || name === 'autoFocus') {
      // autoFocus is passed by rax-textinput
      name = 'focus-state';
    }
    if (name === 'value') {
      this.__changed = true;
    }
    super.setAttribute(name, value, immediate);
  }

  // Sets properties, but does not trigger updates
  _setAttributeWithDelayUpdate(name, value) {
    if (name === 'focus' || name === 'autofocus' || name === 'autoFocus') {
      // autoFocus is passed by rax-textinput
      name = 'focus-state';
    }
    if (name === 'value') {
      this.__changed = true;
    }
    super._setAttributeWithDelayUpdate(name, value);
  }

  getAttribute(name) {
    if (name === 'focus' || name === 'autofocus' || name === 'autoFocus') {
      // autoFocus is passed by rax-textinput
      name = 'focus-state';
    }
    return this.__attrs.get(name);
  }

  get _renderInfo() {
    return {
      nodeId: this.__nodeId,
      pageId: this.__pageId,
      nodeType: 'textarea',
      ...this.__attrs.__value,
      style: this.style.cssText,
      class: 'h5-textarea ' + this.className,
    };
  }

  // Attribute
  get name() {
    return this.__attrs.get('name');
  }

  set name(value) {
    value = '' + value;
    this.__attrs.set('name', value);
  }

  // Attribute
  get type() {
    return this.__attrs.get('type') || 'textarea';
  }

  set type(value) {
    value = '' + value;
    this.__attrs.set('type', value);
  }

  get value() {
    let value = this.__attrs.get('value');
    if (!value && !this.__changed) {
      value = this.__attrs.get('defaultValue');
    }
    return value || '';
  }

  set value(value) {
    this.__changed = true;
    value = '' + value;
    this.__attrs.set('value', value);
  }

  get readOnly() {
    return !!this.__attrs.get('readOnly');
  }

  set readOnly(value) {
    this.__attrs.set('readOnly', !!value);
  }

  get disabled() {
    return !!this.__attrs.get('disabled');
  }

  set disabled(value) {
    value = !!value;
    this.__attrs.set('disabled', value);
  }

  get maxlength() {
    return this.__attrs.get('maxlength');
  }

  set maxlength(value) {
    this.__attrs.set('maxlength', value);
  }

  get placeholder() {
    return this.__attrs.get('placeholder') || '';
  }

  set placeholder(value) {
    value = '' + value;
    this.__attrs.set('placeholder', value);
  }

  get selectionStart() {
    const value = +this.__attrs.get('selection-start');
    return !isUndef(value) ? value : -1;
  }

  set selectionStart(value) {
    this.__attrs.set('selection-start', value);
  }

  get selectionEnd() {
    const value = +this.__attrs.get('selection-end');
    return !isUndef(value) ? value : -1;
  }

  set selectionEnd(value) {
    this.__attrs.set('selection-end', value);
  }

  blur() {
    this.setAttribute('focus', false);
  }

  focus() {
    this.setAttribute('focus', true);
  }
}

export default HTMLTextAreaElement;
