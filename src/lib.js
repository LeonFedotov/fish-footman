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
  async getIssuesByLabel (context, label) {
    const query = `
      query ($owner: String!, $repo: String!, $label: [String!], $cursor: String) {
        repository(owner: $owner, name: $repo) {
          issues(states: OPEN, labels: $label, first: 100, after: $cursor, orderBy:{field:CREATED_AT, direction:DESC}) {
            pageInfo { endCursor, hasNextPage }
            nodes { body }
          }
        }
      }
    `
    const getIssues = async (params = context.repo({ label })) =>
      context.github.graphql(query, params)
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
            files,
            commits: { nodes: [{ commit: { oid: sha, committedDate, status: { contexts: statuses = [] } } }] }
          }
        }
      }) => ({
        sha,
        number,
        statuses,
        timestamp: +new Date(committedDate),
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

      yield * nodes.map(({ files, sha, number, commits: { nodes: [{ commit: { status: { contexts: statuses = [] } } }] } }) => ({
        sha,
        number,
        statuses,
        files: filesPage(context, number, files)
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
              pullRequests: {
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
