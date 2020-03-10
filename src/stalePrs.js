const _ = require('lodash')

const {
  maxDistnace,
  statusName,
  statusDescription,
  failureMessage,
  successMessage
} = require('./config').stalePrs

const { lastCommitOfPrs, masterCommits, pullrequest } = require('./lib')

const setStatus = (context, pr, state, status = {
  name: statusName,
  descr: state === 'success' ? successMessage
    : state === 'failure' ? failureMessage
      : statusDescription
}) => pr.state !== state.toUpperCase() && context.github.repos.createStatus(
  context.repo({
    sha: pr.sha,
    state,
    description: status.descr,
    context: status.name
  })
)

const validatePr = async (context, pr, masterList) => {
  const closestIndex = _
    .chain(masterList)
    .sortBy([({ timestamp }) => Math.abs(pr.timestamp - timestamp)])
    .get('0.oid')
    .thru(oid => _.findIndex(masterList, { oid }))
    .value()

  if (closestIndex === -1 || closestIndex > maxDistnace) {
    setStatus(context, pr, 'failure')
    return [closestIndex, false]
  }

  setStatus(context, pr, 'success')
  return [closestIndex, true]
}

module.exports = {
  async revalidateRepo (context) {
    try {
      context.log('Getting master commits')
      const masterList = await masterCommits(context)
      context.log(`Got ${masterList.length} masterCommits`)

      for await (const pr of lastCommitOfPrs(context, statusName)) {
        validatePr(context, pr, masterList)
          .then((res) => context.log(pr.number, res))
      }
    } catch (e) {
      context.log.error(e)
    }
  },

  async revalidatePr (context) {
    try {
      context.log('Getting master commits')
      const masterList = await masterCommits(context)
      context.log(`Got ${masterList.length} masterCommits`)

      const pr = await pullrequest(context, statusName)
      validatePr(context, pr, masterList)
        .then((res) => context.log(pr.number, res))
    } catch (e) {
      context.log.error(e)
    }
  }
}
