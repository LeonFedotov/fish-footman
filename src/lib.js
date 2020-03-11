const _ = require('lodash')

const { getPrs, getPr, getFiles, getPrsCommits, getMasterLog } = require('./queries')

async function * filesPage (context, number, { pageInfo: { hasNextPage: nextPage, cursor }, nodes }) {
  yield * nodes.map(({ path }) => path)

  while (nextPage) {
    const { hasNextPage, endCursor, nodes } = await context.github
      .graphql(getFiles, context.repo({ number, cursor }))
      .then(({ repository: { pullRequest: { result: { nodes, pageInfo: { hasNextPage, endCursor } } } } }) => ({ hasNextPage, endCursor, nodes }))
    nextPage = hasNextPage
    cursor = endCursor
    yield * nodes.map(({ path }) => path)
  }
}

module.exports = {

  async pullrequest (context, statusName) {
    const number = _.get(context, 'payload.pull_request.number', -1)
    const { sha, commit, files } = await context.github
      .graphql(getPr, context.repo({ statusName, number }))
      .then(({
        repository: {
          pullRequest: {
            files,
            commits: { nodes: [{ commit: { oid, committedDate, status } }] }
          }
        }
      }) => ({
        sha: oid,
        state: _.get(status, 'context.state', 'PENDING'),
        commit: { oid, timestamp: +new Date(committedDate) },
        files
      }))

    return { sha, number, commit, files: filesPage(context, number, files) }
  },

  async * pullrequests (context, statusName) {
    let nextPage = true
    let cursor = null

    while (nextPage) {
      const { hasNextPage, endCursor, nodes } = await context.github
        .graphql(getPrs, context.repo({ cursor, statusName }))
        .then(
          ({ repository: { result: { nodes, pageInfo: { hasNextPage, endCursor } } } }) =>
            ({ hasNextPage, endCursor, nodes })
        )

      nextPage = hasNextPage
      cursor = endCursor

      yield * nodes.map(({ files: nodes, sha, number, commits: { nodes: [{ commit: { status } }] } }) => ({
        sha,
        number,
        state: _.get(status, 'context.state', 'PENDING'),
        files: filesPage(context, number, nodes)
      }))
    }
  },

  async masterCommits (context) {
    const commits = await context.github.graphql(getMasterLog, context.repo())
    return _
      .get(commits, 'repository.pullRequests.nodes', [])
      .reverse()
      .map(({ node: { oid, committedDate } }) => ({
        oid,
        timestamp: +new Date(committedDate)
      }))
  },

  async * lastCommitOfPrs (context, statusName) {
    let nextPage = true
    let cursor = null
    while (nextPage) {
      const { hasNextPage, endCursor, nodes } = await context.github
        .graphql(getPrsCommits, context.repo({ cursor, statusName }))
        .then(
          ({
            repository: {
              result: {
                nodes,
                pageInfo: { hasNextPage, endCursor }
              }

            }
          }) => ({ hasNextPage, endCursor, nodes })
        )

      nextPage = hasNextPage
      cursor = endCursor

      yield * nodes.map(({ sha, number, commits: { nodes: [{ commit: { oid, committedDate, status } }] } }) => ({
        sha, number, state: _.get(status, 'context.state', 'PENDING'), oid, timestamp: +new Date(committedDate)
      }))
    }
  }

}
