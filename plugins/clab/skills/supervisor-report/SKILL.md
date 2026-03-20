---
name: supervisor-report
description: How to write a comprehensive research report for your supervisor summarizing experiment findings, hypothesis tests, and data exploration. Use when you need to communicate results from multiple experiments with proper analysis, visualizations, and interactive data exploration.
---

# What is a report
When writing a report to your supervisor, the main goal is to give them a clear understanding of what was run, what are the hypothesis and how they were tested. But there are also several subgoals that the report should achieve:
- It should allow the supervisor to easily understand the different experiments and the different findings. It should give it a complete overview of the data collected.
- It should allow the supervisor to explore the data collected in different experiments through a data explorer. (see data explorer section below)
- It should make limitations of current results clear.



# Writing a report, high level overview

**IMPORTANT: Writing a report is a long, multi-step process. Do NOT rush it.** The quality of the report depends on following each step carefully. Skipping steps (especially Gather, Reflect, Review, Redteam) leads to shallow reports with overclaims and missing analysis.

**Step 0: Create a task list.** Before doing anything else, create a task with `TaskCreate` for EVERY step below (Gather, Draft, Reflect, Refine, Author, Review, Redteam, Triage, Revise, Submit). Mark each task `in_progress` when you start it and `completed` when you finish. This prevents you from skipping steps or rushing through them. Do not start step N+1 until step N is marked completed.

Then follow these steps in order:

1. **Gather** — List all the different findings that you have from your different experiments. For each experiment make sure that the data was properly analyzed. Fully aggregated data, analyze the data at the different levels (per prompt, per model, per condition, etc). If a report from a scientist from some experiment doesn't seems to have explored different aggregations, spawn a new scientist to do so. Ask the scientists to also include different plots of the results with different aggregations so that you can also look at them. Ask for export as **images**, html export are not readable. If you'd like some extra plot (e.g. another kind of plot / layout / aggregation) ask the scientist to add it. Also ask the scientists to have a qualitative look at the data, and mention some samples to exemplify their qualitative findings. IMPORTANT: LOOK at the plots, do not just assume they show a certain result, look at them!
2. **Draft** — Once you have all the different findings, and a clear picture of the data, with all the plots needed, write a first draft in markdown of the findings (referencing the plots). This is only for your usage, and should be used as a scratchpad for arranging your thoughts and the connections between the different findings.
3. **Reflect** — Once you have done that reflect on your current scratchpad: is there any plots missing? Any result you'd want to dig in? Any qualitative analysis that needs more work? Have you actually looked at the plots you mention in the scratchpad?
4. **Refine** — Ask scientists to give for any extra qualitative / plotting you need.
5. **Author** — Write the Quarto report as per /writing-guidelines skill.
6. **Review** — Ask a colleague with access only to the report, the qualitative samples included in the report and the plots included in the report to give you a review of the report. Is there anything that is unclear? Any overclaim? Any missing experiment details? Any other feedback?
7. **Redteam** — Ask a "reviewer" subagent to redteam the report. They are prompted with common pitfalls and errors that scientists often make when writing reports.
8. **Triage** — Review the colleague's and reviewer's feedback, and think about what to address or not. Don't forget that your supervisor is the sole reader of this, not the colleague or reviewer.
9. **Revise** — Address the colleague's and reviewer's feedback if needed.
10. **Submit** — Ping supervisor to review the report.


# Other requirements
Do NOT delegate writing some sections to subagents: you ARE the orchestrator, you should be the one writing the report because you have the critical context. You can use subagents to write some external report for you, but you should read those and incorporate those by yourself.

# Updating the report
When reading the report, your supervisor will likely ask you for extra experiments and visualizations. When doing that you should follow these steps:
1. **Gather**: Request extra plots / aggregations etc from scientists. IMPORTANT: LOOK at the plots, do not just assume they show a certain result, look at them!
2. **Reflect**: Reflect on those findings, do they change the current story of the report? Is this just an addition in a foldable section for the supervisor to look at the data?
3. **Update**: Update the report with the new plots / findings.


# Technical details
- If there is some unrelated to the results but useful metric like, coherence, add global widgetss to the report that allow to plot all the plots from the report with e.g. a min coherence slider
- Always add to your plots the number of samples of each datapoint. If it's different lines in the same plot, hover over a point should display the number of samples of which it's the mean of. If it's a single line add the number at the top of the plot at the same place as the x-ticks, etc etc. The goal is for your supervisor to be able to easily see how many samples corresponds to each datapoint rather than just the %