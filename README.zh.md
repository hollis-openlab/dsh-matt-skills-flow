# dsh-matt-skills-flow

Matt Skills 是一个非官方 DeepSeek Harness 插件，把 [mattpocock/skills](https://github.com/mattpocock/skills) 组织成可持续的工程工作流。

它把当前阶段、已安装 Skill 快照、决策、Spec、Ticket 依赖、隔离的 Git Lane、审查结果、人工验收、证据和重启恢复统一保存在一个 Flow 中。Web 界面和 `/matt-flow` 命令使用同一套 Host 服务，可以在两种入口之间切换而不丢失状态。

## 功能

- 创建 Flow 时记录已安装 Matt Skills 及其内容摘要。
- 持久化并支持 supersede 决策，再生成和批准 Spec。
- 发布依赖感知的 Ticket Graph，预览可执行 Frontier。
- 从 Flow 自有的 integration 分支创建隔离 Lane 分支和 Worktree。
- 运行受限的 Lane Agent，把阻塞 Question 回收到根会话，并用新的 packet 摘要重试。
- 按顺序集成完成的 Lane，执行 Standards/Spec 双轴 Review，并要求人工验收。
- 导出脱敏证据，DeepSeek Harness 重启后恢复被中断的工作。
- Web 界面支持简体中文和 English。

## 安装

使用 DeepSeek Harness 官方插件命令安装打包版本：

```sh
pnpm dsh plugin --profile web add --workspace-root ./deepseek-ai-dsh-matt-skills-flow-0.1.0.tgz
```

然后正常启动 Harness Web：

```sh
pnpm dsh web
```

插件要求 DSH Web profile 提供 `@deepseek-ai/dsh-commands`、`@deepseek-ai/dsh-skill`、Git 以及标准 Agent/Subagent 服务。

## 使用

从侧边栏打开 **Matt Skills**，创建或选择 Flow。Flow 必须绑定到已有的 DSH Workspace 和干净的 Git 仓库。按照界面中的 Gate 依次记录决策、批准 Spec、添加并发布 Tickets、准备和运行 Lanes、集成结果、审查冻结的候选版本，最后由人工接受。

活动会话中也可以使用同一套生命周期命令：

```text
/matt-flow start "添加账户恢复"
/matt-flow list
/matt-flow status "添加账户恢复"
/matt-flow continue <flow-id>
/matt-flow questions <flow-id>
/matt-flow export <flow-id>
```

`/matt-flow continue` 每次最多推进一个明确的阶段边界；需求澄清、Review 和验收中的多义决策仍必须由界面明确选择。

## 安全边界

插件不会 push、创建 Pull Request、合并默认分支，也不会删除有未提交改动的 Worktree。人工验收前会重新检查冻结候选 commit、Review finding、Question 和 Flow revision，并写入 Acceptance Receipt。

## 开发

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm verify-package
```

发布内容只包含构建和使用插件所需的运行时代码、测试、包元数据和公开文档。

## 许可证

MIT。Matt Skills 的权利归上游项目所有；本插件使用用户已安装的 Skill，不替换其内容。
