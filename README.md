# Fish footman [![build status](https://www.travis-ci.com/LeonFedotov/fish-footman.svg?branch=master)](https://travis-ci.com/LeonFedotov/fish-footman)

![38a87fc0635634f4d5828141447156e2--wonderland-fish](https://user-images.githubusercontent.com/130342/58011498-0de4f700-7afb-11e9-87a1-fc8889a92432.jpg)

A bot that manages directory locks on multiproject repos 
using an issue on a project as config with the label:"**Fishy**" on it, this will trigger the bot, it will parse the issue to find limited directories(each line a directory) and will create an error on all PR's touching those directories,
if the issue is closed/the pr is updated the bot will re-evaluate the state and will lock/unlock pull requests accordingly.

### Notes: 
  - you can have more than one issue, the bot will merge the directories
  - you need to create the label "Fishy" on the target repo 
