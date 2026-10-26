# listing-image

通过本地 Node 命令行调用 Listing 图片接口，为商品图生成白底图、专家场景图或编辑结果。

## 安装

优先用 `skills` CLI 安装。CLI 要求 Node.js 22.20 或更新版本，并需要网络下载 CLI 与 Skill。发布仓库为私有 GitHub 仓库，使用者需有访问权限：

```sh
npx skills add leodknuth/listing-image-skill --skill listing-image -a claude-code
npx skills add leodknuth/listing-image-skill --skill listing-image -a codex
```

以上命令默认安装到当前项目。所有项目通用的用户级安装加 `-g`。

**离线/手工备选：** 运行 Skill 自带 CLI 要求 Node.js 18 或更新版本，不需要安装 npm 依赖。复制整个 `listing-image` 目录到 Agent 的个人 Skills 目录：

```sh
mkdir -p ~/.claude/skills
cp -R skills/listing-image ~/.claude/skills/listing-image
```

使用 Codex 时也可安装到 `~/.agents/skills/listing-image`。手工更新时用新版目录覆盖旧目录。CLI 遥测与完整安装、更新、卸载说明随正式发布包附带。

## 开发与重新生成参考文件

`references/experts.md` 和 `references/experts.json` 是生成文件，请勿手改。运行 `node skills/listing-image/scripts/build-references.mjs` 重新生成并一并提交两个文件。

运行生成脚本需要 Node.js 22.18 或更新版本（推荐 Node.js 24）；它从仓库的专家定义生成 Markdown 字段说明和供 CLI 读取的 JSON 数据。

运行 CLI 测试：

```sh
node --test skills/listing-image/scripts/listing.test.mjs skills/listing-image/scripts/listing-guards.test.mjs
```

## API 密钥

在网站「头像菜单 → API 密钥」创建密钥，并在本机 shell 环境设置 `LISTING_API_KEY`。不要把密钥写进命令行参数、项目文件或对话。可选的 `LISTING_API_URL` 默认是 `https://amazon-ctr.com`。
`LISTING_API_URL` 只应设置为官方地址或你信任的本机调试地址；脚本会把密钥发送到该地址。

## 控制与限制

- `--yes` 和 `--max-credits` 是本地护栏，只防误操作，不能防一个恶意或失控的 Agent。
- 真正不可绕过的是服务器端限制：创建密钥时把每日生成上限设小（建议先 10–20），并留意账户余额。
- 怀疑密钥泄漏时，到网站「头像菜单 → API 密钥」吊销。
- `node scripts/listing.mjs doctor` 可检查本机配置与 API 连通性；`node scripts/listing.mjs --version` 查看 CLI 版本。
- 升级时重新复制新版 `listing-image` 目录；版本号见 `--version`。
- 命令选项和退出码见 `node scripts/listing.mjs help`。

## 命令示例

```sh
node ~/.claude/skills/listing-image/scripts/listing.mjs account
node ~/.claude/skills/listing-image/scripts/listing.mjs experts
node ~/.claude/skills/listing-image/scripts/listing.mjs process ./product.png --out ./results
```

生成命令先显示预计积分与余额；用户明确确认后再加 `--yes` 执行。可先用 `--dry-run` 检查将发送的字段和文件名。结果写入 `--out` 指定目录，CLI 会以 JSON 汇报保存路径。
