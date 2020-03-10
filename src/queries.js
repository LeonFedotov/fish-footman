module.exports = {
  getIssues: `
    query ($owner: String!, $repo: String!, $label: [String!], $cursor: String) {
      repository(owner: $owner, name: $repo) {
        result: issues(states: OPEN, labels: $label, first: 100, after: $cursor, orderBy:{field:CREATED_AT, direction:DESC}) {
          pageInfo { endCursor, hasNextPage }
          nodes { body }
        }
      }
    }
  `,

  getPrsCommits: `
    query ($owner: String!, $repo: String!, $statusName: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        result: pullRequests(states: OPEN, first: 100, after: $cursor, orderBy:{field:CREATED_AT, direction:DESC}) {
          pageInfo { endCursor, hasNextPage }
          nodes {
            sha: headRefOid
            number
            commits(last: 1) {
              nodes {
                commit {
                  committedDate
                  status {
                    context(name: $statusName) {
                      state
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  getPrs: `
    query ($owner: String!, $repo: String!, $statusName: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        result: pullRequests(states: OPEN, first: 100, after: $cursor, orderBy:{field:CREATED_AT, direction:DESC}) {
          pageInfo { endCursor, hasNextPage }
          nodes {
            sha:headRefOid
            number
            commits(last: 1) {
              nodes {
                commit {
                  status {
                    context(name: $statusName) {
                      state
                    }
                  }
                }
              }
            }
            files(first:100) {
              pageInfo { endCursor, hasNextPage }
              nodes { path }
            }
          }
        }
      }
    }
  `,

  getMasterLog: `
    query($owner: String! $repo: String!) {
      repository(name: $repo owner: $owner) {
        ref(qualifiedName: "master") {
          target {
            ... on Commit {
              history(first: 20) {
                commits: edges {
                  node {
                    oid
                    committedDate
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  getPr: `
    query ($owner: String!, $repo: String!, $number: Int!, $statusName: String!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          number
          sha:headRefOid

          files(first:100) {
            pageInfo { endCursor, hasNextPage }
            nodes { path }
          }

          commits(last: 1) {
            nodes {
              commit {
                oid
                timestamp: committedDate
                status {
                  context(name: $statusName) {
                    state
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  getFiles: `
    query ($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          result: files(first:100, after: $cursor) {
            pageInfo { hasNextPage, endCursor }
            nodes { path }
          }
        }
      }
    }
  `
}
