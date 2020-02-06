const _ = require('lodash')
const path = require('path')
const { labelName, statusName, successMessage, failureMessage, statusDescription } = require('./config')
const { getIssues, getPrs, getFiles } = require('./queries')

const fishyNodes = async (
  context,
  params = context.repo({ label: labelName })
) => context.github
  .graphql(getIssues, params)
  .then(async ({ repository: { result: { nodes, pageInfo: { hasNextPage, endCursor: cursor } } } }) =>
    hasNextPage
      ? nodes.concat(await fishyNodes(context, { ...params, cursor }))
      : nodes
  )

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
  createStatus: (
    context,
    {
      sha = context.payload.pull_request.head.sha,
      state: oldState = 'PENDING',
      number
    },
    state = 'pending',
    status = { name: statusName, descr: state === 'success' ? successMessage : state === 'failure' ? failureMessage : statusDescription }
  ) => oldState === state.toUpperCase() ? context.log('Same state detected, skipping.', { number, state }) : context.github.repos.createStatus(
    context.repo({
      context: status.name,
      sha,
      state,
      description: status.descr
    })
  ),

  restrictedDirs: (context) => fishyNodes(context)
    .then(nodes => _.chain(nodes)
      .map(({ body }) => body.split('\r\n'))
      .flatten()
      .uniq()
      .compact()
      .map((dir) => path.normalize(`${dir.trim()}/`))
      .value()
    ),

  pullrequests: async function * pullrequests (context) {
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

      yield * nodes.map(({ files: nodes, sha, number, commits }) => ({ sha, state: _.get(commits, 'nodes.0.commit.status.context.state', 'PENDING'), number, files: filesPage(context, number, nodes) }))
    }
  }
}
