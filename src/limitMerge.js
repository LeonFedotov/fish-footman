const _ = require('lodash')
const path = require('path')

const { pullrequests, pullrequest } = require('./lib')
const { getIssues } = require('./queries')

const {
  labelName,
  statusName,
  statusDescription,
  failureMessage,
  successMessage
} = require('./config').limitMerge

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

const restrictedDirs = async (context) => _.chain(await fishyNodes(context))
  .map(({ body }) => body.split('\r\n'))
  .flatten()
  .uniq()
  .compact()
  .map((dir) => path.normalize(`${dir.trim()}/`))
  .value()

const createStatus = (
  context,
  {
    sha = context.payload.pull_request.head.sha,
    state: prevState = 'PENDING'
  },
  state = 'pending',
  status = {
    name: statusName,
    descr:
      state === 'success' ? successMessage
        : state === 'failure' ? failureMessage
          : statusDescription
  }
) => prevState !== state.toUpperCase() && context.github.repos.createStatus(
  context.repo({
    context: status.name,
    sha,
    state,
    description: status.descr
  })
)

const validatePr = async (context, pr, restrictions) => {
  if (restrictions.some(dir => dir === '*/')) {
    createStatus(context, pr, 'failure').catch(e => context.log.error(e))
    return false
  }

  for await (const file of pr.files) {
    if (restrictions.some((dir) => file.startsWith(dir))) {
      createStatus(context, pr, 'failure')
      return false
    }
  }
  createStatus(context, pr, 'success')
  return true
}

module.exports = {
  async revalidateRepo (context) {
    context.log('Validating repo')
    try {
      context.log('Gathering restrictions')
      const restrictions = await restrictedDirs(context)
      context.log(`Got ${restrictions.length} restrictions`, restrictions)

      for await (const pr of pullrequests(context, statusName)) {
        validatePr(context, pr, restrictions)
          .then((res) => context.log(pr.number, res))
      }
    } catch (e) {
      context.log.error(e)
    }
  },

  async revalidatePr (context) {
    context.log('Validating pr')
    try {
      context.log('Gathering restrictions')
      const restrictions = await restrictedDirs(context)
      context.log(`Got ${restrictions.length} restrictions`, restrictions)

      const pr = await pullrequest(context, statusName)
      validatePr(context, pr, restrictions)
        .then((res) => context.log(pr.number, res))
    } catch (e) {
      context.log.error(e)
    }
  }
}
