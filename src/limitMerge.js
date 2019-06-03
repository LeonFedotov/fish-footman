const { createStatus, restrictedDirs, pullrequests } = require('./lib')
const validatePr = async (context, pr, restrictions) => {
  await createStatus(context, pr.sha, 'pending')
  for await (const file of pr.files) {
    if (restrictions.some((dir) => file.startsWith(dir))) {
      await createStatus(context, pr.sha, 'failure')
      return false
    }
  }
  await createStatus(context, pr.sha, 'success')
  return true
}

module.exports = async (context) => {
  context.log('Gathering restrictions')
  const restrictions = await restrictedDirs(context)
  context.log(`Got ${restrictions.length} restrictions`)

  for await (const pr of pullrequests(context)) {
    console.log(pr.number, await validatePr(context, pr, restrictions))
  }
}
