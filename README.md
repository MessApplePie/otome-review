# 🌸 乙女评测站 · Otome Review Site

A fully local, offline-capable otome game review website.  
All data is saved in your browser's `localStorage`. No server needed.

---

## 快速开始 / Quick Start

### 方法一：直接打开（推荐 / Recommended）

由于页面使用了 Google Fonts（外部字体），建议通过本地服务器运行以获得最佳体验。  
不过，直接双击 `index.html` 也可正常使用所有功能（仅字体可能回退为系统字体）。

1. 将整个 `otome-review/` 文件夹保存到本地
2. 双击 `index.html` 在浏览器中打开

### 方法二：本地服务器（最佳体验）

**使用 Python（最简单）：**
```bash
cd otome-review
python -m http.server 8080
# 然后在浏览器打开 http://localhost:8080
```

**使用 Node.js (npx serve)：**
```bash
cd otome-review
npx serve .
# 然后在浏览器打开显示的地址
```

**使用 VS Code Live Server 插件：**
1. 安装 Live Server 插件
2. 右键点击 `index.html` → "Open with Live Server"

---

## 文件结构 / File Structure

```
otome-review/
├── index.html          # 主页面（唯一 HTML 文件）
├── css/
│   ├── themes.css      # 六套主题色（CSS 变量）
│   ├── base.css        # 基础样式、布局、工具类
│   └── components.css  # 组件样式（卡片、导航、表单等）
├── js/
│   ├── data.js         # 数据层：localStorage CRUD、导入导出
│   ├── router.js       # 路由：Hash 路由页面切换
│   ├── components.js   # 可复用渲染函数
│   ├── home.js         # 首页：游戏网格、搜索、筛选
│   ├── form.js         # 添加/编辑页面
│   └── detail.js       # 游戏详情页面
└── README.md
```

---

## 功能说明 / Features

| 功能 | 说明 |
|------|------|
| 添加游戏 | 填写基本信息、评分、评测文字、上传封面和 CG |
| 编辑游戏 | 修改任意已保存的游戏记录 |
| 删除游戏 | 带确认对话框，防止误操作 |
| 角色评测 | 每部游戏可添加多个角色，支持头像、标签、评分、详评、CG |
| 图片上传 | 本地图片转 base64 存储，支持封面/游戏CG/角色头像/角色CG |
| 图片预览 | 点击缩略图弹出全屏模态框，支持键盘左右切换 |
| 搜索 | 实时搜索游戏名称、公司、编剧 |
| 标签筛选 | 按进度状态或自定义标签过滤 |
| 主题切换 | 六种主题：粉色/紫色/蓝色/绿色/黄色/灰色 |
| 导出备份 | 将所有数据导出为 JSON 文件 |
| 导入备份 | 支持「合并」或「替换」两种导入方式 |

---

## 数据存储说明 / Data Storage

- 所有数据（含图片 base64）存储在浏览器 `localStorage`
- 键名：`otome_games_v1`，主题：`otome_theme`
- ⚠️ 清除浏览器数据会丢失所有记录，请定期导出 JSON 备份
- 图片以 base64 格式存储，**大量高分辨率图片可能导致存储空间不足**，建议上传前压缩图片

---

## 浏览器兼容性 / Browser Compatibility

推荐使用现代浏览器：Chrome / Edge / Firefox / Safari（最新版）

---

## 主题颜色 / Themes

| 主题 | 色调 |
|------|------|
| 🌸 粉色 (pink)   | 玫瑰粉、香槟色，温柔典雅 |
| 💜 紫色 (purple) | 薰衣草紫、丁香色，梦幻气质 |
| 💙 蓝色 (blue)   | 矢车菊蓝、粉蓝色，清新静谧 |
| 💚 绿色 (green)  | 鼠尾草绿、薄荷色，自然清透 |
| 💛 黄色 (yellow) | 奶油黄、暖米色，温暖甜蜜 |
| 🩶 灰色 (grey)   | 银雾灰、月白色，简约知性 |
