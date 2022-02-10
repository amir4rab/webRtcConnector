var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EventManager_eventsMap;
export class EventManager {
    constructor() {
        _EventManager_eventsMap.set(this, void 0);
        this.on = (eventName, event) => {
            if (typeof eventName !== 'string' || typeof event !== 'function') {
                return false;
            }
            try {
                __classPrivateFieldGet(this, _EventManager_eventsMap, "f").set(eventName, event);
                return true;
            }
            catch {
                return false;
            }
        };
        this.emit = (eventName, value) => {
            if (typeof eventName !== 'string') {
                return false;
            }
            const event = __classPrivateFieldGet(this, _EventManager_eventsMap, "f").get(eventName);
            if (typeof event === 'function') {
                event(value);
                return true;
            }
            else {
                return false;
            }
        };
        this.asyncEmit = async (eventName, value) => {
            if (typeof eventName !== 'string') {
                return false;
            }
            const event = __classPrivateFieldGet(this, _EventManager_eventsMap, "f").get(eventName);
            if (typeof event === 'function') {
                await event(value);
                return true;
            }
            else {
                return false;
            }
        };
        __classPrivateFieldSet(this, _EventManager_eventsMap, new Map(), "f");
    }
}
_EventManager_eventsMap = new WeakMap();
