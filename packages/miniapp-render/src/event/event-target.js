// eslint-disable-next-line import/no-extraneous-dependencies
import { isMiniApp } from 'universal-env';
import Event from './event';
import cache from '../utils/cache';
import CustomEvent from './custom-event';

/**
 * Compare touch list
 */
function compareTouchList(a, b) {
  if (a.length !== b.length) return false;

  for (let i, len = a.length; i < len; i++) {
    const aItem = a[i];
    const bItem = b[i];

    if (aItem.identifier !== bItem.identifier) return false;
    if (aItem.pageX !== bItem.pageX || aItem.pageY !== bItem.pageY || aItem.clientX !== bItem.clientX || aItem.clientY !== bItem.clientY) return false;
  }

  return true;
}

/**
 * Compare event detail
 * @param {object} a
 * @param {object} b
 */
function compareDetail(a, b) {
  if (a.pageX === b.pageX && a.pageY === b.pageY && a.clientX === b.clientX && a.clientY === b.clientY) {
    return true;
  }
  return false;
}

/**
 *
 * @param {string} property 'touches' or 'changedTouches' or 'detail'
 * @param {object} last last event
 * @param {object} now current event
 */
function compareEventProperty(property, last, now) {
  const compareFn = property === 'detail' ? compareDetail : compareTouchList;
  if (last[property] && now[property] && !compareFn(last[property], now[property])) {
    // property are different
    return true;
  }
  if (!last[property] && now[property] || last[property] && !now[property]) {
    // One of them  doesn't have property
    return true;
  }
  return false;
}

function compareEventWithUncertainty(last, now) {
  // In Alipay, timestamps of the same event may have slight differences when bubbling
  // Set the D-value threshold to 10
  if (!last || now.timeStamp - last.timeStamp > 10) {
    return true;
  }
  // Tap event has no touches or changedTouches in Alipay, so use detail property to check
  return compareEventProperty('detail', last, now) || compareEventProperty('touches', last, now) || compareEventProperty('changedTouches', last, now);
}

function compareEventWithAccurateness(last, now) {
  // TimeStamps are different
  if (!last || last.timeStamp !== now.timeStamp) {
    return true;
  }
  return compareEventProperty('touches', last, now) || compareEventProperty('changedTouches', last, now);
}

class EventTarget {
  constructor() {
    // Supplement the instance's properties for the 'XXX' in XXX judgment
    this.ontouchstart = null;
    this.ontouchmove = null;
    this.ontouchend = null;
    this.ontouchcancel = null;
    this.oninput = null;
    this.onfocus = null;
    this.onblur = null;
    this.onchange = null;

    // Logs the triggered miniapp events
    this.__miniappEvent = null;
    this.__eventHandlerMap = new Map();
    this.__hasEventBinded = false;
    this.__hasAppearEventBinded = false;
    this.__hasTouchEventBinded = false;
  }

  // Destroy instance
  _destroy() {
    this.__miniappEvent = null;
    this.__eventHandlerMap = null;
    this.__hasEventBinded = null;
    this.__hasTouchEventBinded = null;
    this.__hasAppearEventBinded = false;
  }

  // Trigger event capture, bubble flow
  static _process(target, eventName, miniprogramEvent, extra, callback) {
    let event;

    if (eventName instanceof CustomEvent || eventName instanceof Event) {
      // The event object is passed in
      event = eventName;
      eventName = event.type;
    }

    eventName = eventName.toLowerCase();

    const path = [target];
    let parentNode = target.parentNode;

    while (parentNode && parentNode.ownerDocument) {
      path.push(parentNode);
      parentNode = parentNode.parentNode;
    }

    if (!event) {
      // Special handling here, not directly return the applet's event object
      const targetNodeId = isMiniApp ? miniprogramEvent.target.targetDataset.privateNodeId : miniprogramEvent.target.dataset.privateNodeId;
      // If different and native event target contains dataset, use native event target first
      const realTarget = targetNodeId && targetNodeId !== target.__nodeId ? cache.getNode(targetNodeId) : target;
      event = new Event({
        name: eventName,
        target: realTarget,
        detail: miniprogramEvent.detail || { ...miniprogramEvent }, // Some info doesn't exist in event.detail but in event directly, like Alibaba MiniApp
        timeStamp: miniprogramEvent.timeStamp,
        touches: miniprogramEvent.touches,
        changedTouches: miniprogramEvent.changedTouches,
        bubbles: true,
        __extra: extra,
      });
    }

    // Capture
    for (let i = path.length - 1; i >= 0; i--) {
      const currentTarget = path[i];

      // Determine if the bubble is over
      if (!event._canBubble) break;
      if (currentTarget === target) continue;

      event._setCurrentTarget(currentTarget);
      event._setEventPhase(Event.CAPTURING_PHASE);

      currentTarget._trigger(eventName, {
        event,
        isCapture: true,
      });
      if (callback) callback(currentTarget, event, true);
    }

    if (event._canBubble) {
      event._setCurrentTarget(target);
      event._setEventPhase(Event.AT_TARGET);

      // Both capture and bubble phase listening events are triggered
      target._trigger(eventName, {
        event,
        isCapture: true,
        isTarget: true
      });
      if (callback) callback(target, event, true);

      target._trigger(eventName, {
        event,
        isCapture: false,
        isTarget: true
      });
      if (callback) callback(target, event, false);
    }

    if (event.bubbles) {
      for (const currentTarget of path) {
        // Determine if the bubble is over
        if (!event._canBubble) break;
        if (currentTarget === target) continue;

        event._setCurrentTarget(currentTarget);
        event._setEventPhase(Event.BUBBLING_PHASE);

        currentTarget._trigger(eventName, {
          event,
          isCapture: false,
        });
        if (callback) callback(currentTarget, event, false);
      }
    }

    // Reset event
    event._setCurrentTarget(null);
    event._setEventPhase(Event.NONE);

    return event;
  }

  // Get handlers
  __getHandles(eventName, isCapture, isInit) {
    if (isInit) {
      let handlerObj = this.__eventHandlerMap.get(eventName);
      if (!handlerObj) {
        this.__eventHandlerMap.set(eventName, handlerObj = {});
      }

      handlerObj.capture = handlerObj.capture || [];
      handlerObj.bubble = handlerObj.bubble || [];

      return isCapture ? handlerObj.capture : handlerObj.bubble;
    } else {
      const handlerObj = this.__eventHandlerMap.get(eventName);

      if (!handlerObj) return null;

      return isCapture ? handlerObj.capture : handlerObj.bubble;
    }
  }

  // Trigger node event
  _trigger(eventName, { event, args = [], isCapture, isTarget } = {}) {
    eventName = eventName.toLowerCase();
    const handlers = this.__getHandles(eventName, isCapture) || [];

    if (eventName === 'onshareappmessage') {
      if (process.env.NODE_ENV === 'development' && handlers.length > 1) {
        console.warn('onShareAppMessage can only be listened with one callback function.');
      }
      return handlers[0] && handlers[0].call(this || null, event);
    }

    const onEventName = `on${eventName}`;
    if ((!isCapture || !isTarget) && typeof this[onEventName] === 'function') {
      // The event that triggers the onXXX binding
      if (event && event._immediateStop) return;
      try {
        this[onEventName].call(this || null, event, ...args);
      } catch (err) {
        console.error(err);
      }
    }

    if (handlers && handlers.length) {
      let result;
      // Trigger addEventListener binded events
      handlers.forEach(handler => {
        if (event && event._immediateStop) return;
        try {
          const processedArgs = event ? [event, ...args] : [...args];
          result = handler.call(this || null, ...processedArgs); // Only the last result will be returned
        } catch (err) {
          console.error(err);
        }
      });

      return result;
    }
  }

  // Check if the event can be triggered
  __checkEvent(miniprogramEvent) {
    const last = this.__miniappEvent;
    const now = miniprogramEvent;

    let flag = false;

    if (isMiniApp) {
      flag = compareEventWithUncertainty(last, now);
    } else {
      flag = compareEventWithAccurateness(last, now);
    }

    if (flag) this.__miniappEvent = now;
    return flag;
  }

  addEventListener(eventName, handler, options) {
    if (typeof eventName !== 'string' || typeof handler !== 'function') return;

    let isCapture = false;

    if (typeof options === 'boolean') isCapture = options;
    else if (typeof options === 'object') isCapture = options.capture;

    eventName = eventName.toLowerCase();
    const handlers = this.__getHandles(eventName, isCapture, true);
    handlers.push(handler);
    if (!this.__hasEventBinded) {
      this.__hasEventBinded = true;
    }
    if (!this.__hasAppearEventBinded && eventName.indexOf('appear') > -1) {
      this.__hasAppearEventBinded = true;
    }
    if (!this.__hasTouchEventBinded && eventName.indexOf('touch') > -1) {
      this.__hasTouchEventBinded = true;
    }
  }

  removeEventListener(eventName, handler, isCapture = false) {
    if (typeof eventName !== 'string' || typeof handler !== 'function') return;

    eventName = eventName.toLowerCase();
    const handlers = this.__getHandles(eventName, isCapture);

    if (handlers && handlers.length) handlers.splice(handlers.indexOf(handler), 1);
  }

  dispatchEvent(evt) {
    if (evt instanceof CustomEvent) {
      EventTarget._process(this, evt);
    }

    // preventDefault is not supported, so it always returns true
    return true;
  }
}

export default EventTarget;
