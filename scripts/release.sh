#!/usr/bin/env bash
# 发布助手：status 查两个渠道是否同步，prep 把包备好并打印剩下要人工执行的命令。
#
# 背景：2026-08-22 在 GitHub 发了 v0.6.0 / v0.6.1 两个版本却漏了 npm，
# npm 上卡在 0.5.2 隔了一天多，期间 npm install 的人拿到的都是旧版。
# 这个脚本的存在就是为了让"漏发"当场可见。

set -euo pipefail
cd "$(dirname "$0")/.."

PKG_NAME=$(node -p "require('./package.json').name")
LOCAL_VER=$(node -p "require('./package.json').version")

npm_latest() {
  curl -sf "https://registry.npmjs.org/$PKG_NAME" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s)['dist-tags'].latest)}catch{console.log('(未发布)')}})" \
    2>/dev/null || echo "(查不到)"
}

gh_latest() {
  GH_TOKEN="${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}" \
    gh release view --json tagName -q .tagName 2>/dev/null || echo "(无 release)"
}

cmd_status() {
  local npm_v gh_v
  npm_v=$(npm_latest); gh_v=$(gh_latest)
  echo "本地 package.json : $LOCAL_VER"
  echo "npm latest        : $npm_v"
  echo "GitHub 最新 release: $gh_v"
  echo

  if [ "v$npm_v" != "$gh_v" ]; then
    echo "❌ 两个渠道不同步——GitHub 是 ${gh_v}，npm 是 ${npm_v}。"
    echo "   npm 是主分发渠道，漏发等于让所有人装到旧版。跑 './scripts/release.sh prep' 补。"
    return 1
  fi
  echo "✅ GitHub 与 npm 同步在 ${gh_v}。"
}

cmd_prep() {
  echo "▸ 检查工作区是否干净"
  if [ -n "$(git status --porcelain)" ]; then
    echo "❌ 工作区有未提交改动，先提交再发布。"; git status --short; exit 1
  fi

  echo "▸ 检查 $LOCAL_VER 是否已在 npm 上"
  if [ "$(npm_latest)" = "$LOCAL_VER" ]; then
    echo "❌ npm 上已经是 $LOCAL_VER 了。要发新版先改 package.json 的版本号。"; exit 1
  fi

  echo "▸ 检查 npm 登录状态（令牌会过期，失效表现是 401；publish 时报的却是 404）"
  if ! npm whoami >/dev/null 2>&1; then
    # 必须硬失败：2026-08-26 实测这里只警告不拦截，包照样打好、人工 publish 时才撞
    # E404（npm 对无权限的 PUT 报 404 不报 401，极具误导性）。守卫的意义就是当场拦。
    echo "❌ npm 未登录或令牌已过期。先在自己的终端跑：npm login --auth-type=web"
    exit 1
  fi
  echo "   已登录：$(npm whoami)"

  echo "▸ 类型检查 + 测试 + 构建"
  pnpm run check

  echo "▸ 打包"
  rm -f "artifacts/$PKG_NAME-$LOCAL_VER.tgz"
  pnpm pack --pack-destination artifacts >/dev/null

  local tgz="artifacts/$PKG_NAME-$LOCAL_VER.tgz"
  echo "▸ 验包"
  local in_tgz
  in_tgz=$(tar xzOf "$tgz" package/package.json | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).version")
  [ "$in_tgz" = "$LOCAL_VER" ] || { echo "❌ 包内版本 $in_tgz 与预期 $LOCAL_VER 不符"; exit 1; }
  echo "   包内版本 ${in_tgz}，共 $(tar tzf "$tgz" | wc -l | tr -d ' ') 个文件，$(du -h "$tgz" | cut -f1)"
  echo "   shasum: $(shasum -a 1 "$tgz" | cut -d' ' -f1)"

  cat <<EOF

包已备好：$tgz

剩下两条命令请在你自己的终端里跑（npm 发布强制二次验证，验证链接里的凭据被 npm
在输出和日志里都遮掉了，agent 取不到，所以这一步只能人工）：

  cd $(pwd)
  npm publish ./$tgz --access public
  GH_TOKEN=\$(gh auth token) gh release create v$LOCAL_VER $tgz --generate-notes

注意 publish 的路径必须带 ./，省掉的话 npm 会当成 git 地址去连 GitHub 的 22 端口，直接失败。
两条都跑完后用 './scripts/release.sh status' 对账。
EOF
}

case "${1:-status}" in
  status) cmd_status ;;
  prep)   cmd_prep ;;
  *) echo "用法: $0 [status|prep]"; exit 2 ;;
esac
