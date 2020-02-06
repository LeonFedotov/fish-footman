const { createStatus, restrictedDirs, pullrequests } = require('./lib')
const validatePr = async (context, pr, restrictions) => {
  if (restrictions.some(dir => dir === '*/')) {
    createStatus(context, pr, 'failure')
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

module.exports = async (context) => {
  try {
    context.log('Gathering restrictions')
    const restrictions = await restrictedDirs(context)
    context.log(`Got ${restrictions.length} restrictions`, restrictions)

    for await (const pr of pullrequests(context)) {
      validatePr(context, pr, restrictions)
        .then((res) => context.log(pr.number, res))
    }
  } catch (e) {
    context.error(e.message, JSON.stringify(e))
  }
}
