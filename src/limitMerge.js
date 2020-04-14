const _ = require('lodash')
const path = require('path')

const { getIssuesByLabel, pullrequests, pullrequest } = require('./lib')

const {
  labelName,
  statusName,
  // statusDescription,
  failureMessage,
  successMessage
} = require('./config').limitMerge

const restrictedDirs = async (context) => _.chain(await getIssuesByLabel(context, labelName))
  .map(({ body }) => body.split('\r\n'))
  .flatten()
  .uniq()
  .compact()
  .map((dir) => path.normalize(`${dir.trim()}/`))
  .value()

const setStatus = (
  context,
  commitSha,
  name,
  description,
  state = 'success',
  oldState = 'PENDING'
) => oldState.toUpperCase() !== state.toUpperCase() && context.github.repos.createStatus(
  context.repo({
    sha: commitSha,
    context: name,
    state,
    description
  })
)

const validatePr = async (context, { files }, restrictions) => {
  if (restrictions.some(dir => dir === '*/')) {
    return false
  }

  for await (const file of files) {
    if (restrictions.some((dir) => file.startsWith(dir))) {
      return false
    }
  }

  return true
}

module.exports = {
  async revalidateRepo (context) {
    context.log('Validating repo')
    try {
      context.log('Gathering restrictions')
      const restrictions = await restrictedDirs(context)
      context.log(`Got ${restrictions.length} restrictions`, restrictions)

      for await (const pr of pullrequests(context)) {
        const oldState = _
          .chain(pr)
          .get('statuses', [])
          .find(['context', statusName])
          .get('state', 'PENDING')
          .value()
        const sha = pr.sha
        if (await validatePr(context, pr, restrictions)) {
          context.log(pr.number, sha, 'true')
          setStatus(context, sha, statusName, successMessage, 'success', oldState)
        } else {
          context.log(pr.number, sha, 'false')
          setStatus(context, sha, statusName, failureMessage, 'failure', oldState)
        }
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

      const number = _.get(context, 'payload.pull_request.number', -1)
      const pr = await pullrequest(context, number)
      const oldState = _
        .chain(pr)
        .get('statuses', [])
        .find(['context', statusName])
        .get('state', 'PENDING')
        .value()
      const sha = pr.sha

      if (await validatePr(context, pr, restrictions)) {
        context.log(pr.number, 'true')
        setStatus(context, sha, statusName, successMessage, 'success', oldState)
      } else {
        context.log(pr.number, 'false')
        setStatus(context, sha, statusName, failureMessage, 'failure', oldState)
      }
    } catch (e) {
      context.log.error(e)
    }
  }
}
