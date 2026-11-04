# 赞助商广告位

首页广告由 `src/lib/sponsors.ts` 的 `sponsors` 数组维护。默认展示三个“广告位招租”色块，点击打开联系弹窗，可通过邮箱 `ip@huzhihui.com` 或微信二维码联系合作。微信二维码文件为 `public/contact/wechat.jpg`，与页脚、联系作者区域及中英文 README 共用。确认素材和推广链接后添加条目，依次替换空闲广告位：

```ts
export const sponsors: readonly Sponsor[] = [
  {
    name: "品牌名称",
    href: "https://example.com/?utm_source=one-ip&utm_medium=sponsor",
    image: "/sponsors/brand.svg",
  },
];
```

`image` 可省略，未配置图片时只显示品牌名称；使用时将文件放入 `public/sponsors/`。建议素材尺寸为 640×88px，按广告位宽度等比缩放并保持展示区高 44px。`href` 使用已确认的 HTTPS 推广链接，可包含 UTM。到期移除对应条目，自动恢复招租色块。

- 广告区位于导航下方、首页查询工具栏上方。
- 三个色块均分可用宽度，小横幅或品牌文字保持高 44px；桌面和手机端都只保留一行。
- 多家赞助商横向并排，空间不足时仅在广告区域内横向滚动，不挤压查询按钮或增加广告行数。
- 直接展示广告图片、品牌文字或招租色块，不额外显示标题或侧边标签。每个广告链接使用 `rel="sponsored noopener noreferrer"`。

中英文 README 在项目介绍与项目链接下方的 `sponsors:start` / `sponsors:end` 注释之间显示一行招租链接。确认合作后，在注释之间替换为普通的一行 Markdown，例如：

```md
[品牌名称](https://example.com/) · [另一品牌](https://example.org/)
```

英文招租文字使用 `Advertise here`。不添加独立标签、大标题、表格或大型 Banner。网站配置和两份 README 分别维护；到期时同时移除。中文 README 的 Logo 与项目标题同行，不额外占用一行。
