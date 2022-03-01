function fetchUser (userId, cb) {
  const xhr = new XMLHttpRequest('https://my-user-service:3000/users')
  xhr.setRequestHeader('content-type', 'application/json')
  xhr.onload = data => cb(null, data)
  xhr.onerror = error => cb(error)
  xhr.send(JSON.stringify({ userId }))
}

function fetchPosts (userId, cb) {}

function fetchComments (postId, cb) {}

app.get('/users/:userId/postsandcomments', (req, res) => {
  const data = {}

  function maybeFinishRequest () {
    if (data.posts && data.user) {
      res.send(data)
    }
  }

  fetchUser(req.params.userId, (error, user) => {
    if (error) return handleError(res)
    data.user = user
    maybeFinishRequest()
  })

  fetchPosts(req.params.userId, (error, posts) => {
    if (error) return handleError(res)

    let count = 0
    for (let i = 0; i < posts.length; ++i) {
      fetchComments(posts[i].id, (error, comments) => {
        if (error) return handleError(res)
        count++
        posts[i].comments = comments
        if (count === posts.length) {
          data.posts = posts
          maybeFinishRequest()
        }
      })
    }
  })
})
