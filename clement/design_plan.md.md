researcher team:

- Research Orchestrator
- Research Scientist
- Colleague


The research orchestrator keep track of the current state of the research and design new experiments to run.
The research scientist runs the experiments and documents the results.
The colleague is an agent with limited knowledge of the research, given access to no tool apart Read




hooks:
- Research Orchestrator:
  - finish hook: check when was Final Report last updated, if it's more than 5 minutes: ask the model to edit it with their latest findings / just add/update a "last edited" timestamp at the top of the file
  - nudge hook: when it's finished ask to think a bit more if there is anything they want to do some extra check / run  