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
    thens.push(thenFn)
    if (state.status === 'Resolved') thenFn(state.data)
    return { then: registerThen, catch: registerCatch }
  }

  const registerCatch = catchFn => {
    catches.push(catchFn)
    if (state.status === 'Rejected') catchFn(state.error)
    return { then: registerThen, catch: registerCatch }
  }

  func(resolveFn, rejectFn)

  return { then: registerThen, catch: registerCatch }
}

function doTheThing () {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve('did it'), 100)
  })
}

doTheThing()
  .then(console.log)
  .then(console.log)
