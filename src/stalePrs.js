const _ = require('lodash')
const { masterCommits, pullrequests, pullrequest, setStatus, prNumberFromCommit } = require('./lib')
const {
  maxDistnace,
  statusName,
  failureMessage,
  successMessage,
  statusUrlMatch
} = require('./config').stalePrs

const validatePr = async (context, { number, statuses }, masterList) => {
  const prTimestamp = statuses
    .filter(({ state, targetUrl }) =>
      state === 'SUCCESS' &&
      targetUrl && targetUrl.startsWith(statusUrlMatch)
    )
    .map(({ timestamp }) => +new Date(timestamp))
    .sort((a, b) => b - a)
    .pop()

  if (!_.isUndefined(prTimestamp)) {
    const closestIndex = _
      .chain(masterList)
      .sortBy([({ timestamp }) => Math.abs(prTimestamp - timestamp)])
      .get('0.sha')
      .thru(sha => _.findIndex(masterList, { sha }))
      .value()

    if (closestIndex === -1 || closestIndex > maxDistnace) {
      return [false, closestIndex]
    } else {
      return [true, closestIndex]
    }
  }

  return [true]
}

module.exports = {
  async revalidateRepo (context) {
    context.log('stale prs:')
    try {
      const masterList = await masterCommits(context)
      for await (const pr of pullrequests(context)) {
        const sha = pr.sha
        const oldState = _
          .chain(pr)
          .get('statuses', [])
          .find(['context', statusName])
          .get('state', 'PENDING')
          .value()
        const [isValid, closestIndex] = await validatePr(context, pr, masterList)
        if (isValid) {
          context.log(pr.number, sha, closestIndex, 'true')
          setStatus(context, sha, { name: statusName, description: successMessage }, 'success', oldState)
        } else {
          context.log(pr.number, sha, closestIndex, 'false')
          setStatus(context, sha, { name: statusName, description: failureMessage }, 'failure', oldState)
        }
      }
    } catch (e) {
      context.log.error(e)
    }
  },

  async revalidatePrFromState (context) {
    try {
      const { payload: { state, target_url: targetUrl, sha } } = context
      if (state.toUpperCase() === 'SUCCESS' &&
        targetUrl && targetUrl.startsWith(statusUrlMatch)
      ) {
        context.log('stale from state:', sha)
        const number = await prNumberFromCommit(context, sha)
        if (number) {
          const masterList = await masterCommits(context)
          const pr = await pullrequest(context, number)

          const oldState = _
            .chain(pr)
            .get('statuses', [])
            .find(['context', statusName])
            .get('state', 'PENDING')
            .value()

          const [isValid, closestIndex] = await validatePr(context, pr, masterList)
          if (isValid) {
            context.log(pr.number, closestIndex, 'true')
            setStatus(context, sha, { name: statusName, description: successMessage }, 'success', oldState)
          } else {
            context.log(pr.number, closestIndex, 'false')
            setStatus(context, sha, { name: statusName, description: failureMessage }, 'failure', oldState)
          }
        } else {
          context.error('invalid pr number for sha', sha)
        }
      }
    } catch (e) {
      context.log.error(e)
    }
  },

  async revalidatePr (context) {
    context.log('stale pr:')
    try {
      const masterList = await masterCommits(context)
      const number = _.get(context, 'payload.pull_request.number', -1)
      const pr = await pullrequest(context, number)

      const sha = pr.sha
      const oldState = _
        .chain(pr)
        .get('statuses', [])
        .find(['context', statusName])
        .get('state', 'PENDING')
        .value()

      const [isValid, closestIndex] = await validatePr(context, pr, masterList)

      if (isValid) {
        context.log(pr.number, closestIndex, 'true')
        setStatus(context, sha, { name: statusName, description: successMessage }, 'success', oldState)
      } else {
        context.log(pr.number, closestIndex, 'false')
        setStatus(context, sha, { name: statusName, description: failureMessage }, 'failure', oldState)
      }
    } catch (e) {
      context.log.error(e)
    }
  }
}
