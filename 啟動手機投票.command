#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if command -v node >/dev/null 2>&1; then
  node server.js
else
  node_bins=("$HOME"/.nvm/versions/node/*/bin/node(N))
  if (( ${#node_bins} )); then
    "${node_bins[-1]}" server.js
  else
    print '手機投票版需要 Node.js。白板直接操作／舉手投票可以直接開「指路互動地圖.html」。'
  fi
fi
print '\n按 Enter 關閉視窗。'
read
