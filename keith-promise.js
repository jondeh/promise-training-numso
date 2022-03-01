const internals = Symbol('internals')

/** @typedef {PENDING|FULFILLED|REJECTED} State */
const PENDING = Symbol('pending')
const FULFILLED = Symbol('fulfilled')
const REJECTED = Symbol('rejected')

/**
 * @typedef {object} DeferredItem
 * @property {Promessa} promise
 * @property {(value?: any) => void} resolve
 * @property {(reject?: any) => void} reject
 * @property {object} handlers
 * @property {(value: any) => any} [fulfill]
 * @property {(value: any) => any} [reject]
 */

export default class Promessa {
  /**
   * @param {(resolve: (value?: any) => void, reject: (reason?: any) => void) => void} executor
   */
  constructor (executor) {
    this[internals] = {
      /**
       * @type {DeferredItem[]}
       */
      queue: [],
      /** @type {State} */
      state: PENDING,
      value: null
    }
    if (!isFunction(executor)) return
    try {
      executor(
        value => resolve(this, value),
        reason => transition(this, REJECTED, reason)
      )
    } catch (exception) {
      transition(this, REJECTED, exception)
    }
  }

  /**
   * @param {(value: any) => any} [onFulfilled]
   * @param {(reason: any) => any} [onRejected]
   * @return {Promessa}
   */
  then (onFulfilled, onRejected) {
    const deferred = {}
    deferred.promise = new Promessa((resolve, reject) => {
      deferred.resolve = resolve
      deferred.reject = reject
    })
    deferred.handlers = {}
    if (isFunction(onFulfilled)) deferred.handlers.fulfill = onFulfilled
    if (isFunction(onRejected)) deferred.handlers.reject = onRejected
    // @ts-ignore
    this[internals].queue.push(deferred)
    process(this)
    return deferred.promise
  }

  /**
   * @param {(reason: any) => any} [onRejected]
   * @return {Promessa}
   */
  catch (onRejected) {
    return this.then(undefined, onRejected)
  }

  /**
   * @param {any} [value]
   * @return {Promessa}
   */
  static resolve (value) {
    return new Promessa(resolve => resolve(value))
  }

  /**
   * @param {any} [reason]
   * @return {Promessa}
   */
  static reject (reason) {
    return new Promessa((resolve, reject) => reject(reason))
  }
}

/**
 * @param {any} val
 * @returns {val is function}
 */
function isFunction (val) {
  return val && typeof val === 'function'
}
/**
 * @param {any} val
 * @returns {val is object}
 */
function isObjectLike (val) {
  return val && typeof val === 'object'
}
/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function defaultFulfill (value) {
  return value
}
/**
 * @param {any} reason
 */
function defaultReject (reason) {
  throw reason
}

/**
 * @param {Promessa} promise
 * @param {State} nextState
 * @param {*} nextValue
 */
function transition (promise, nextState, nextValue) {
  const state = promise[internals].state
  if (state === nextState || state !== PENDING) return
  promise[internals].value = nextValue
  promise[internals].state = nextState
  process(promise)
}

/**
 * @param {Promessa} promise
 */
function process (promise) {
  if (promise[internals].state === PENDING) return
  setImmediate(() => {
    while (promise[internals].queue.length) {
      const deferred = promise[internals].queue.shift()
      const {
        fulfill = defaultFulfill,
        reject = defaultReject
      } = deferred.handlers
      const handler = promise[internals].state === FULFILLED ? fulfill : reject
      try {
        deferred.resolve(handler(promise[internals].value))
      } catch (exception) {
        deferred.reject(exception)
      }
    }
  })
}

/**
 * @param {Promessa} promise
 * @param {any} x
 */
function resolve (promise, x) {
  // Handle if resolved value is the promise itself
  if (promise === x) {
    return transition(
      promise,
      REJECTED,
      new TypeError('The promise and its value refer to the same object')
    )
  }
  // Handle if resolved value is an instance of our known promise type
  // This isn't actually needed to become spec compliant. It might speed things
  // up, but I'm not sure what else you gain besides that
  if (x instanceof Promessa) {
    // If it's not pending, just inherit the resolved state and value
    if (x[internals].state !== PENDING) {
      return transition(promise, x[internals].state, x[internals].value)
    }
    // Otherwise, resolve it
    return x.then(
      value => resolve(promise, value),
      reason => transition(promise, REJECTED, reason)
    )
  }
  // Handle a possible thenable (must be an object or a function)
  if (isObjectLike(x) || isFunction(x)) {
    let called = false
    const once = fn => {
      return function () {
        if (called) return
        fn.apply(null, arguments)
        called = true
      }
    }
    try {
      // The reason we do this is so in case `.then` is a getter on the resolved
      // object, it is only called once. Otherwise, we call it once while
      // checking to see if it's a function, then again when we actually call
      // it. It's weird, but it's the spec.
      const thenHandler = x.then
      // If it's not a function, then resolve with the value
      if (!isFunction(thenHandler)) return transition(promise, FULFILLED, x)
      // Call the thenable. Also, we don't know the implementation of it, so we
      // ignore secondary calls to the onFulfilled/onRejected handlers
      return thenHandler.call(
        x,
        once(nextValue => resolve(promise, nextValue)),
        once(reason => transition(promise, REJECTED, reason))
      )
    } catch (exception) {
      return once(() => transition(promise, REJECTED, exception))()
    }
  }
  // In the end, we just resolve with the value
  return transition(promise, FULFILLED, x)
}
