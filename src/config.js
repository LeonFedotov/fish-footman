const maxDistnace = 10
module.exports = {
  limitMerge: {
    labelName: 'Quarantine',
    statusName: 'Colinoscopy',
    statusDescription: 'Checking mergeability based on issues labeled "Quarantine".',
    failureMessage: 'Merging is frozen on one of affected paths.',
    successMessage: 'No merging restrictions detected.'
  },
  stalePrs: {
    maxDistnace,
    statusName: 'Stale Pull Request',
    statusDescription: 'Making sure pr isn\'t far away from master.',
    failureMessage: 'PR is too stale (farther than ' + maxDistnace + ' commits apart), merge from master.',
    successMessage: 'PR is fresh!'
  }
}
