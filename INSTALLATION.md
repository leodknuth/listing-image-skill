# Install Listing Image Skill

The following commands use the private GitHub repository `leodknuth/listing-image-skill`; your account must have access.

## Claude Code

Project install (from the project directory):

```sh
npx skills add leodknuth/listing-image-skill --skill listing-image -a claude-code
```

Add `-g` to install for your user across projects.

## Codex

```sh
npx skills add leodknuth/listing-image-skill --skill listing-image -a codex
```

Add `-g` for a user-level install. Run `npx skills list` to view installed skills. Use `npx skills update` to update, and `npx skills remove listing-image -a claude-code` (or `-a codex`) to remove.

The skills CLI requires Node.js 22.20 or later and network access to fetch the CLI and repository. The Skill's own command requires Node.js 18 or later. The CLI collects anonymous usage telemetry; set `DO_NOT_TRACK=1` or `DISABLE_TELEMETRY=1` to disable telemetry and security-audit requests.

For offline/manual installation, copy the complete `skills/listing-image` directory to the agent's Skill directory. Keep `SKILL.md`, `scripts/`, and `references/` together.
