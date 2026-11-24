# 张泽骞 | AIGC 影像作品集

GitHub Pages 发布版本，包含页面、字体、图片、交互动效、三部影片和最新 PDF。

## 发布

1. 新建一个公开仓库，名称可用 `zeqian-portfolio`。
2. 将本目录内所有文件上传到仓库根目录，包括 `.github/` 和 `.nojekyll`。不要只上传 ZIP 文件，也不要多套一层目录。
3. 在仓库 `Settings → Pages → Build and deployment → Source` 选择 `GitHub Actions`。
4. 在 `Actions` 中运行 `Publish portfolio to GitHub Pages`，或向 `main` 分支提交文件。
5. 发布成功后，在 `Settings → Pages → Visit site` 查看实际网址。

公开项目仓库的默认网址形式为 `https://用户名.github.io/仓库名/`；如果仓库名为 `用户名.github.io`，则默认网址为 `https://用户名.github.io/`。

## 结构

- `index.html`：网页入口。
- `style.css`、`portfolio.js`：版式与交互动效。
- `fonts/`：本地字体及许可。
- `media/`：作品图片与完整影片。
- `files/portfolio.pdf`：最新作品集 PDF。
- `.github/workflows/pages.yml`：自动发布配置。
- `.nojekyll`：静态网站标记。

所有必要资源使用相对路径，兼容项目网站子目录，不需要安装 Node.js。

原始影片按无损分段保存在 `video-parts/`；GitHub Actions 使用 `scripts/build_site.py` 自动拼接并校验 SHA-256，生成完整的 `media/*.mp4`。线上影片与原文件逐字节一致。

## 发布前已检查

- 页面、CSS 引用的本地资源存在。
- 字体、图片、视频无需依赖原 ChatGPT 域名加载。
- 三部影片和 PDF 均保留。
- 单个文件小于 GitHub 网页上传的 25 MiB 限制；整个网站小于 GitHub Pages 的 1 GB 发布限制。

PDF 中的影片跳转已同步到本作品集的 GitHub Pages 网址。

## 官方说明

- 创建网站：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- 自动发布：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- 容量限制：https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

作品著作权归各自权利人所有。字体许可见 `fonts/` 与 `licenses/` 目录。
