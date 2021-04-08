import { toCamel } from '../utils/tool';

class Attribute {
  constructor(element) {
    this.__element = element;
    this.__value = {};
  }

  set(name, value, immediate = true) {
    const element = this.__element;
    this.__value[name] = value;

    if (name === 'style') {
      element.style.cssText = value;
    } else {
      if (name.indexOf('data-') === 0) {
        const datasetName = toCamel(name.substr(5));
        element.dataset[datasetName] = value;
      }
      if (name !== 'id' && name !== 'class') {
        this.__element.__hasExtraAttribute = true; // Indicates that the element has extra attributes besides id/style/class
      }
      const payload = {
        path: `${element._path}.${name}`,
        value: value
      };
      element._triggerUpdate(payload, immediate);
    }
  }

  get(name) {
    const element = this.__element;
    if (name === 'style') {
      return element.style.cssText || null;
    } else if (name.indexOf('data-') === 0) {
      const datasetName = toCamel(name.substr(5));
      return element.dataset[datasetName];
    }
    return this.__value[name] || null;
  }

  get style() {
    return this.__element.style.cssText || undefined;
  }

  get class() {
    return this.__value.class || undefined;
  }

  get id() {
    return this.__value.id || undefined;
  }

  get src() {
    return this.__value.src || undefined;
  }

  has(name) {
    return Object.prototype.hasOwnProperty.call(this.__value, name);
  }

  remove(name) {
    const element = this.__element;
    delete this.__value[name];
    delete this[name];

    if (name === 'style') {
      element.style.cssText = '';
    } else if (name === 'id') {
      element.id = '';
    } else {
      if (name.indexOf('data-') === 0) {
        const datasetName = toCamel(name.substr(5));
        delete element.dataset[datasetName];
      }
      const payload = {
        path: `${element._path}.${name}`,
        value: ''
      };
      element._triggerUpdate(payload);
    }
  }
}

export default Attribute;
