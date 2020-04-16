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
      return false
    }
  }

  return true
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

        if (await validatePr(context, pr, masterList)) {
          context.log(pr.number, sha, 'true')
          setStatus(context, sha, { name: statusName, description: successMessage }, 'success', oldState)
        } else {
          context.log(pr.number, sha, 'false')
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
        context.log('stale from state:')
        const number = await prNumberFromCommit(context, sha)
        const masterList = await masterCommits(context)
        const pr = await pullrequest(context, number)

        const oldState = _
          .chain(pr)
          .get('statuses', [])
          .find(['context', statusName])
          .get('state', 'PENDING')
          .value()

        if (await validatePr(context, pr, masterList)) {
          context.log(pr.number, 'true')
          setStatus(context, sha, { name: statusName, description: successMessage }, 'success', oldState)
        } else {
          context.log(pr.number, 'false')
          setStatus(context, sha, { name: statusName, description: failureMessage }, 'failure', oldState)
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

      if (await validatePr(context, pr, masterList)) {
        context.log(pr.number, 'true')
        setStatus(context, sha, { name: statusName, description: successMessage }, 'success', oldState)
      } else {
        context.log(pr.number, 'false')
        setStatus(context, sha, { name: statusName, description: failureMessage }, 'failure', oldState)
      }
    } catch (e) {
      context.log.error(e)
    }
  }
}
