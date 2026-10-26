export const helpText = `listing-image：Listing 图片命令行工具

用法：node scripts/listing.mjs <命令> [选项]

命令与选项：
  account                         查询余额、价格、密钥额度与本地上限
    [--max-credits N]             本次最高积分（正整数）
  experts [专家ID]                查看专家及字段
  process <图片...> --out <目录>  生成白底图（1–10 张）
    [--yes] [--dry-run] [--max-credits N] [--idempotency-key KEY] [--timeout SEC]
  scene --image <图片> --out <目录> 生成专家场景图
    [--expert ID] [--prompt TEXT] [--field name=value] [--mode text|image] [--scene 图片]
    [--yes] [--dry-run] [--max-credits N] [--idempotency-key KEY] [--timeout SEC]
  edit --annotated <图片> --prompt <文字> --out <目录> 编辑商品图
    [--original 图片] [--yes] [--dry-run] [--max-credits N] [--idempotency-key KEY] [--timeout SEC]
  doctor                          检查本机配置、专家数据与只读 API 连通性
  version, --version              显示版本
  help, --help                    显示本帮助

环境变量：
  LISTING_API_KEY                 API 密钥（必需）
  LISTING_API_URL                 API 地址，默认 https://amazon-ctr.com
  LISTING_MAX_CREDITS             默认单次花费上限；--max-credits 优先

退出码：
  0 | 成功
  2 | 参数或本地配置错误
  3 | 尚未确认报价；确认后再使用 --yes
  4 | 超过单次花费上限
  10 | 密钥无效、已过期或已吊销
  11 | 余额不足
  12 | 幂等键已过期或冲突
  13 | 今日生成次数达到上限
  14 | 后端拒绝请求
  15 | 服务端错误或账户查询失败
  16 | 网络失败
  17 | process 的所有图片均失败

安全提示：
  不要自行添加 --yes；须先展示报价并取得用户对本次生成的明确确认。
  LISTING_API_URL 只使用官方地址或可信的本机调试地址；密钥会发送到该地址。
`;
