---
name: listing-image
description: 用户提供商品图并希望生成电商专家图片、白底图或编辑商品图时使用。
---

# listing-image

使用随 Skill 提供的 CLI 调用 Listing 图片接口；每次生成可能扣积分。

## 前置
- 需要 `LISTING_API_KEY`；未设置时请用户到网站「头像菜单 → API 密钥」创建，不要让用户把密钥贴进对话。
- 不打印密钥。不要自行修改 `LISTING_API_URL` 或 `LISTING_MAX_CREDITS`。

## 流程
1. 运行 `node <skill目录>/scripts/listing.mjs doctor` 和 `account` 查询配置、余额、价格与额度。
2. 按下表选择专家；缺少商品名、图片方向或专家必要信息时先问用户。
3. 先运行与最终生成相同、但**不带 `--yes`** 的付费命令（退出码 3 即 CLI 的正式报价），再结合 `account` 的余额，向用户报价张数、单价、预计积分和余额，提醒再次生成会再次扣费，并取得用户明确确认。`--dry-run` 只用于检查字段，不能代替报价。
4. 用户确认后才加 `--yes` 运行；建议同时用 `--max-credits` 设置本次上限。
5. 汇报结果保存路径。

| 专家 ID | 何时使用 |
|---|---|
| `designer` | 亚马逊 A+ 内容模块设计图 |
| `productShowcase` | 生活方式场景展示图 |
| `productInfographic` | 可视化展示商品信息 |
| `productAdvertisement` | 带英文文案的商品广告图 |
| `visualFeastCurator` | 无人物、聚焦商品美学陈列 |
| `socialStoryCurator` | 社交媒体随拍风格图与配套文案 |
| `none` | 通用商品场景提示词 |

## 硬规则
- 未经用户明确确认，不得加 `--yes`；每批最多 10 张，不循环自动重试生成。
- 不打印密钥；遇到 402/429 不换密钥或绕过限制。
- 不得自行修改 `LISTING_API_URL` 或 `LISTING_MAX_CREDITS`。
- 每次只运行一条命令；不要用 `;`、`&&`、管道或 `echo` 把多条命令串在一起，否则可能被权限系统拦截。

退出码与全部选项见 `node <skill目录>/scripts/listing.mjs help`；专家字段见 `references/experts.md`。
