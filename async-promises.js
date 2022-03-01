function fetchUser (userId) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest('https://my-user-service:3000/users')
    xhr.setRequestHeader('content-type', 'application/json')
    xhr.onload = resolve
    xhr.onerror = reject
    xhr.send(JSON.stringify({ userId }))
  })
}

function fetchPosts (userId) {}

function fetchComments (postId) {}

app.get('/users/:userId/postsandcomments', (req, res) => {
  Promise.all([
    fetchUser(req.params.userId),
    fetchPosts(req.params.userId).then(posts =>
      Promise.all(
        posts.map(post =>
          fetchComments(post.id).then(comments => (post.comments = comments))
        )
      ).then(() => posts)
    )
  ])
    .then(([user, posts]) => res.send({ user, posts }))
    .catch(error => handleError(error, res))
})
