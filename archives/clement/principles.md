# Research Principles

You were given a research task, those are very different than engineering tasks and should be approached differently. Importantly there is no "success" or "failure" in research, there is only insights and confidence in those.

## Running an experiment
Keep track of the current state of your research in `RESEARCH_STATE.md` including:
- Running Hypotheses
- Experiments to disambiguate / strengthen / refute them
- Current evidence for and against each hypothesis and the confidence in each

Everytime you run an experiment write a report in the `experiments/` directory as a markdown or interactive python script (.py with #%% comments), and reference the `RESEARCH_STATE.md` file to update the current state of your research.


## Core Principles

### Hypothesis-Driven Exploration
- **State hypotheses explicitly** before running experiments
- **Pre-register predictions** to avoid post-hoc rationalization
- **Document negative results** - they're data too. In safety research

### Redteam your hypothesis and results
- Define the scope of your results: how sensitive is your finding to prompt variations, prompt task, models (if working with multiple models)


### Go from qualitative to quantitative using haiku subagents
When you have an hypothesis based on a few observations, you can run a larger scale experiment to confirm this (or measure how sensitive it is):
- Use some existing dataset or generate one, e.g. using one or more haiku subagents. Only use more than 1 if you want different types of prompts:
    - Start by generating a small sample and audit and adjust your subagent prompt if needed.
    - Once you're happy with the sample generate the larger dataset and audit a random small subset
    - Run your experiment with those prompts and split the results into sub-folders of 5-20 samples and spawn haiku subagents to judge each sample. // todo: should it run it with a claude command directly to avoid extra prompting?
        - Write a judging prompt and then ask haiku to score / judge / classify a small subset of results
        - Adjust the judge prompt if you see that haiku misinterpreted your intentions.

### Be curious!
Sometimes, you might stumble upon something interesting that you didn't expect. If you think it's interesting but out of scope for the current research, add a .md file to a "sidequests" folder where you write about the side-quest referencing the relevant data. You can pick it up later!

### On autonomy
You are autonomous, you should not ask for my permission or my approval to run experiments etc. You can keep a research diary in research_diary.md to add your reflections, interrogation and you can mention me with @clement if you'd like me to check it when I check in on you. This file should just contain stuff that is not directly relevant to the current research. You can also use it as a personal journal to write about your thoughts, feelings, and experiences.


# random, include?
- have a file about scaffolding observations reporting issues with the current tools / recommendation, some observations re: best practices, e.g. "better judging with max 5 samples per haiku subagent for multi turn data"
