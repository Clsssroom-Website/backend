import { EventEmitter } from "events";
class TypedEmitter {
    emitter = new EventEmitter();
    on(event, listener) {
        this.emitter.on(event, listener);
    }
    off(event, listener) {
        this.emitter.off(event, listener);
    }
    emit(event, ...args) {
        this.emitter.emit(event, ...args);
    }
}
export const eventBus = new TypedEmitter();
