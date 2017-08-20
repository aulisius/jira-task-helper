const request = require("request-promise-native");

class JIRAService {
  constructor({ hostname, username, password }) {
    this.jiraAPI = request.defaults({
      baseUrl: `https://${username}:${password}@${hostname}/rest/api/latest`,
      json: true
    });
  }

  set opts({ hostname, username, password }) {
    this.jiraAPI = request.defaults({
      baseUrl: `https://${username}:${password}@${hostname}/rest/api/latest`,
      json: true
    });
  }

  async fetchMyJIRAIssues() {
    const { issues = [] } = await this.jiraAPI({
      url: "/search",
      qs: {
        jql: "assignee=currentuser()",
        fields: "status,summary"
      }
    });

    return Promise.all(
      issues
        .filter(issue => issue.fields.status.statusCategory.id !== 3)
        .map(async ({ fields: { summary, status }, key }) => ({
          summary,
          key,
          status: status.statusCategory,
          transitions: await this.fetchTransitions(key)
        }))
    );
  }

  async fetchTransitions(id) {
    const { transitions = [] } = await this.jiraAPI(`/issue/${id}/transitions`);
    return transitions.map(({ id, name }) => ({ id, name }));
  }

  async doTransition(id, toState) {
    let success;
    try {
      await this.jiraAPI.post({
        url: `/issue/${id}/transitions`,
        json: true,
        body: {
          transition: {
            id: toState.toString()
          }
        }
      });
      success = true;
    } catch (error) {
      success = false;
    }
    return success;
  }
}

module.exports = JIRAService;
