# APICK Subagent

See the [project integration guide (Korean)](https://github.com/lead788/apick-subagent/blob/main/docs/project-integration.md) for reusable project instructions and operating-system-specific API key setup.

The installation package for the `apick-agent` product on [apick.app](https://apick.app/subagent). Delegate inventory, extraction, summarization and comparison from Codex or Claude Code.

Requires Node.js 22.17 or later:

```sh
npm install -g apick-subagent
apick-subagent install
```

Then link your key: on [My Page](https://apick.app/my_page) > API info, click **Issue connection code**, run `apick-subagent login` and paste the code at the hidden prompt. A code works once within 10 minutes, and issuing a new one invalidates the previous code. You can paste the API key itself instead. The key is verified with the server before it is saved to `.apick-subagent/credentials.json` in your user folder. Use `apick-subagent logout` to remove it. Restart the client, then run `apick-subagent doctor`, which reports `key_source` as `saved`, `environment` or `none`. The `APICK_API_KEY` environment variable still works for CI and shared machines. Never paste keys into chats, command arguments or public configuration. The installer preserves existing model, login and MCP settings. `apick-subagent uninstall` removes only unchanged package-owned entries and preserves keys, backups and user edits.

Open the project and ask the main agent to delegate bulk reading to `apick-subagent`, then verify important citations. Installation alone does not prove automatic delegation; confirm actual tool calls and [usage](https://apick.app/subagent/usage). The main agent retains final decisions, file editing and code execution.

The bridge reads selected files directly from the client workspace and hashes them before uploading only missing content. Symlinks, workspace escapes and common secret files are blocked. Restrict the selected files: secret detection cannot cover every format. Use `APICK_WORKSPACE` if the client does not provide a project root.

There is no installation, setup or subscription fee. Successful work is billed by actual usage. Each successful job costs at least 1 point, and a job that uses AI has a 5-point base fee. Approved identical-result cache reuse and `inventory` listing make no external model call and cost 1 point. There is no product quota beyond prepaid balance. Technical chunk sizes and worker concurrency protect reliability.

Tenant-isolated encrypted content expires after seven days. `retention: none` deletes after review with temporary retention of at most one hour. Immediate deletion is available. Failed/cancelled work and automatic verification failures are not charged. Main-model usage remains unconnected unless supplied; estimates are not actual subscription savings.

Tools: `apick_status`, `apick_dispatch`, `apick_collect`, `apick_evidence`, `apick_review`, `apick_cancel`, `apick_usage`. Use a stable `idempotency_key` after response loss. Receipt files contain neither raw documents nor API keys.

The package includes `templates/SKILL.md` for skill authors. [REST and MCP guide](https://apick.app/dev_guide/subagent).
