# 得背单词

一个面向 Windows 桌面使用的个人背单词应用原型。第一版先用本地 Node 服务 + 浏览器界面跑通核心学习闭环，后续可以包装成 Tauri 或 Electron 安装包。

## 已实现

- 今日单词学习卡片
- 先主动回忆，再揭示答案
- 认识 / 模糊 / 不认识 三档评分
- 基于简化 SM-2 的间隔复习
- 薄弱词自动加权
- 复习计划、词库、错词本、统计、设置页面
- JSON 本地持久化
- 自定义词库 JSON 导入

## 启动

双击：

```text
start-debei.bat
```

或者在 PowerShell 中运行：

```powershell
.\scripts\start-debei.ps1
```

默认地址：

```text
http://127.0.0.1:4738
```

## 停止服务

```powershell
.\scripts\stop-debei.ps1
```

## 测试

```powershell
$node = "C:\Users\30742\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $node --test tests/scheduler.test.js
```

## 数据

运行时数据保存在：

```text
data/app-data.json
```

这个文件已被 `.gitignore` 排除。删除它可以恢复到内置样例词库的初始状态。

