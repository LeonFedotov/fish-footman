const _ = require('lodash')
const path = require('path')

const { issuesByLabel, pullrequests, pullrequest, setStatus } = require('./lib')

const {
  labelName,
  statusName,
  // statusDescription,
  failureMessage,
  successMessage
} = require('./config').limitMerge

const restrictedDirs = async (context) => _
  .chain(await issuesByLabel(context, labelName))
  .flatMap(({ url, body }) => body.split('\r\n').map(dir => ({ url, dir: dir.trim() })))
  .filter(({ dir }) => Boolean(dir))
  .uniqBy(({ dir }) => dir)
  .map(({ url, dir }) => ({ url, dir: path.normalize(`${dir}/`) }))
  .value()

const validatePr = async (context, { files }, restrictions) => {
  const restriction = restrictions.find(({ dir }) => dir === '*/')
  if (restriction) {
    return [false, restriction.url]
  }

  for await (const file of files) {
    const restriction = restrictions.find(({ dir }) => file.startsWith(dir))
    if (restriction) {
      return [false, restriction.url]
    }
  }

  return [true]
}

module.exports = {
  async revalidateRepo (context) {
    context.log('limitMerge repo:', context.repo())
    try {
      const restrictions = await restrictedDirs(context)
      context.log(`Got ${restrictions.length} restrictions`, restrictions)

      for await (const pr of pullrequests(context)) {
        const sha = pr.sha
        const oldState = _
          .chain(pr)
          .get('statuses', [])
          .find(['context', statusName])
          .get('state', 'PENDING')
          .value()

        const [isValid, targetUrl] = await validatePr(context, pr, restrictions)

        if (isValid) {
          context.log(pr.number, sha, 'true')
          setStatus(context, sha, { name: statusName, description: successMessage, targetUrl }, 'success', oldState)
        } else {
          context.log(pr.number, sha, 'false')
          setStatus(context, sha, { name: statusName, description: failureMessage, targetUrl }, 'failure', oldState)
        }
      }
    } catch (e) {
      context.log.error(e)
    }
  },

  async revalidatePr (context) {
    context.log('limitMerge pr:', context.repo())
    try {
      const restrictions = await restrictedDirs(context)
      context.log(`Got ${restrictions.length} restrictions`, restrictions)

      const number = _.get(context, 'payload.pull_request.number', -1)
      const pr = await pullrequest(context, number)

      const sha = pr.sha
      const oldState = _
        .chain(pr)
        .get('statuses', [])
        .find(['context', statusName])
        .get('state', 'PENDING')
        .value()
      const [isValid, targetUrl] = await validatePr(context, pr, restrictions)

      if (isValid) {
        context.log(pr.number, 'true')
        setStatus(context, sha, { name: statusName, description: successMessage, targetUrl }, 'success', oldState)
      } else {
        context.log(pr.number, 'false')
        setStatus(context, sha, { name: statusName, description: failureMessage, targetUrl }, 'failure', oldState)
      }
    } catch (e) {
      context.log.error(e)
    }
  }
}
