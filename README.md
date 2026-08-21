# dsh-matt-skills-flow

Matt Skills is an unofficial DeepSeek Harness plugin that turns [mattpocock/skills](https://github.com/mattpocock/skills) into a durable engineering workflow.

It keeps the current phase, installed Skill snapshot, Decisions, Specs, Ticket dependencies, isolated Git Lanes, review findings, human acceptance, evidence, and restart recovery in one Flow. The Web UI and `/matt-flow` commands use the same Host service, so a Flow can move between them without losing state.

## Features

- Snapshot the installed Matt Skills and their content digests at Flow creation.
- Preserve the initial goal or Bug context in the Flow and visualize review admission as an interactive lifecycle graph with a concise configuration summary.
- Record and supersede Decisions before generating and approving a Spec.
- Publish a dependency-aware Ticket Graph and preview its executable Frontier.
- Publish the graph to repository-local Markdown by default, or to GitHub Issues when the Host config selects `trackerKind: github` and an authenticated `gh` CLI is available.
- Create isolated Lane branches and worktrees from a Flow-owned integration branch.
- Run bounded Lane Agents, route blocked Questions back to the root session, and retry with a new packet digest.
- Integrate completed Lanes sequentially, run two-axis Standards/Spec review, and require human acceptance.
- Export redacted evidence and recover interrupted work after a Harness restart.
- Localized Simplified Chinese and English Web UI.

## Installation

Install a packed release with the official DeepSeek Harness plugin command:

```sh
pnpm dsh plugin --profile web add --workspace-root ./deepseek-ai-dsh-matt-skills-flow-0.2.0.tgz
```

Start Harness Web normally:

```sh
pnpm dsh web
```

The plugin is designed for a DSH Web profile with `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-skill`, Git, and the standard Agent/Subagent services available.

## Usage

Open **Matt Skills** in the sidebar to create or select a Flow. A Flow is bound to an existing DSH Workspace and clean Git repository. Follow the visible Gates to record Decisions, approve the Spec, add and publish Tickets, prepare and run Lanes, integrate results, review the frozen candidate, and accept it as a human.

The same lifecycle is available from an active session:

```text
/matt-flow start "Add account recovery"
/matt-flow list
/matt-flow status "Add account recovery"
/matt-flow continue <flow-id>
/matt-flow questions <flow-id>
/matt-flow export <flow-id>
```

`/matt-flow continue` performs at most one unambiguous phase transition. Ambiguous planning, review, and acceptance decisions remain explicit UI actions.

Ticket Graph publication is local by default. A Host configuration may set `trackerKind: github` and `githubRepository: owner/name`; publication verifies `gh` authentication and creates Issues in dependency order. The plugin never performs other GitHub mutations.

## Safety

The plugin never pushes, creates pull requests, merges the default branch, or deletes dirty worktrees. Candidate acceptance is human-only and rechecks the frozen candidate commit, review findings, Questions, and Flow revision before writing an Acceptance Receipt.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm verify-package
```

Release artifacts contain the runtime, tests, package metadata, and public documentation needed to build and use the plugin.

## License

MIT. Matt Skills remains the property of its upstream project; this plugin loads the user's installed Skills and does not replace them.
