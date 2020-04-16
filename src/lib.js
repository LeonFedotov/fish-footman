const _ = require('lodash')

const { getPrs, getPr, getFiles, getIssuesByLabel, getMasterLog } = require('./queries')

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
  setStatus (context, sha, { name, description, targetUrl },
    state = 'success',
    oldState = 'PENDING'
  ) {
    return oldState.toUpperCase() !== state.toUpperCase() && context.github.repos.createStatus(
      context.repo({
        sha,
        context: name, // weird naming convention by github
        state,
        description,
        ...(targetUrl ? { target_url: targetUrl } : {})
      })
    )
  },

  async issuesByLabel (context, label) {
    const getIssues = async (params = context.repo({ label })) =>
      context.github.graphql(getIssuesByLabel, params)
        .then(async ({ repository: { issues: { nodes, pageInfo: { hasNextPage, endCursor: cursor } } } }) =>
          hasNextPage ? nodes.concat(await getIssues({ ...params, cursor })) : nodes
        )

    return getIssues()
  },

  async pullrequest (context, number) {
    return context.github
      .graphql(getPr, context.repo({ number }))
      .then(({
        repository: {
          pullRequest: {
            sha,
            files,
            commits: { nodes: [{ commit: { timestamp, status: { contexts: statuses = [] } } }] }
          }
        }
      }) => ({
        sha,
        number,
        statuses,
        timestamp: +new Date(timestamp),
        files: filesPage(context, number, files)
      }))
  },

  async * pullrequests (context) {
    let nextPage = true
    let cursor = null

    while (nextPage) {
      const { hasNextPage, endCursor, nodes } = await context.github
        .graphql(getPrs, context.repo({ cursor }))
        .then(
          ({ repository: { pullRequests: { nodes, pageInfo: { hasNextPage, endCursor } } } }) =>
            ({ hasNextPage, endCursor, nodes })
        )

      nextPage = hasNextPage
      cursor = endCursor

      yield * nodes.map(({ files, sha, number, commits: { nodes: [{ commit: { timestamp, status: { contexts: statuses = [] } } }] } }) => ({
        sha,
        number,
        statuses,
        timestamp: +new Date(timestamp),
        files: filesPage(context, number, files)
      }))
    }
  },

  async masterCommits (context, first = 20) {
    const commits = await context.github.graphql(getMasterLog, context.repo({ first }))

    return _
      .get(commits, 'repository.ref.target.history.edges', [])
      .map(({ node: { sha, timestamp } }) => ({
        sha,
        timestamp: +new Date(timestamp)
      }))
  }
}
