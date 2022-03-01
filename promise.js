function Promise (func) {
  const thens = []
  const catches = []
  const state = {
    status: 'Pending',
    data: undefined,
    error: undefined
  }

  const resolveFn = data => {
    state.status = 'Resolved'
    state.data = data
    thens.forEach(thenFn => thenFn(data))
  }

  const rejectFn = error => {
    state.status = 'Rejected'
    state.error = error
    catches.forEach(catchFn => catchFn(error))
  }

  const registerThen = thenFn => {
    return new Promise((resolve, reject) => {
      function daRealThenFn (data) {
        let res
        try {
          res = thenFn(data)
        } catch (error) {
          reject(error)
          return
        }
        if (res && typeof res.then === 'function') {
          res.then(resolve)
          res.catch(reject)
        } else {
          resolve(res)
        }
      }

      if (state.status === 'Resolved') daRealThenFn(state.data)
      else thens.push(daRealThenFn)
    })
  }

  const registerCatch = catchFn => {
    return new Promise((resolve, reject) => {
      function daRealCatchFn (data) {
        let res
        try {
          res = catchFn(data)
        } catch (error) {
          reject(error)
          return
        }
        if (res && typeof res.then === 'function') {
          res.then(resolve)
          res.catch(reject)
        } else {
          resolve(res)
        }
      }

      if (state.status === 'Rejected') daRealCatchFn(state.error)
      else catches.push(daRealCatchFn)
    })
  }

  func(resolveFn, rejectFn)

  return { then: registerThen, catch: registerCatch }
}

const delay = (val, ms) =>
  new Promise((resolve, reject) => setTimeout(() => resolve(val), ms))

const doTheThing = () => delay(10, 100)
const delayedAdd = (num1, num2) => delay(num1 + num2, 100)

const promise1 = doTheThing() // 10
  .then(val => delayedAdd(val, 7)) // 17

promise1
  .then(val => delayedAdd(val, 4)) // 21
  .then(val => console.log({ twentyone: val }))

promise1
  .then(val => delayedAdd(val, 14)) // 31
  .then(val => console.log({ thirtyone: val }))

promise1
  .then(val => val.foo.bar.baz.lol)
  // .then(plsdontshow => console.log({ plsdontshow }))
  .catch(error => {
    console.error('oopsie woopsie')
    return 7
  })
  .then(val => console.log({ val }))
