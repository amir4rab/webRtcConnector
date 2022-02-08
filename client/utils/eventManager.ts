export class EventManager{
  #eventsMap: Map<string, Function>;
  constructor() {
    this.#eventsMap = new Map();
  }
  on = ( eventName: string, event: Function ): boolean => {
    if ( typeof eventName !== 'string' || typeof event !== 'function' ) {
      return false;
    }
    try {
      this.#eventsMap.set(eventName, event);
      return true
    } catch {
      return false;
    }
  }
  emit = ( eventName: string, value: any ): boolean => {
    if ( typeof eventName !== 'string' ) {
      return false;
    }
    const event = this.#eventsMap.get(eventName);
    if ( typeof event === 'function' ) {
      event(value);
      return true
    } else {
      return false;
    }
  }
  asyncEmit = async ( eventName: string, value: any ): Promise<boolean> => {
    if ( typeof eventName !== 'string' ) {
      return false;
    }
    const event = this.#eventsMap.get(eventName);
    if ( typeof event === 'function' ) {
      await event(value);
      return true
    } else {
      return false;
    }
  }
}