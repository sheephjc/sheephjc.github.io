# HJC 的个人主页

GitHub Pages: <https://sheephjc.github.io/>

## 项目

### 小鳄龙之家

## 游戏

### 漳州麻将联机版

基于浏览器的漳州麻将联机项目。

项目以静态页面和原生 ES Module 组织代码，使用 Firebase Anonymous Auth、Realtime Database 承载房间状态同步，并通过本地 vendor 目录加载 Firebase SDK。

项目地址：<https://sheephjc.github.io/Zhangzhou-Mahjong/>

## 工具

### 高分辨质谱计算器

基于高分辨质谱测试数据的分子式候选计算工具。输入精确质量后，页面会在设定误差范围内枚举可能的元素组成，并按化合物类型整理候选分子式。

工具支持限制 C、H、N、O、S、P、F、Cl、Br、I、B 等元素的数量范围，结果会显示理论质量、Da 偏差和 ppm 偏差；也可以勾选 `[M+Na]`，将钠加合峰换算为中性分子质量后再进行搜索。

工具地址：<https://sheephjc.github.io/tools/MassCalculator/>

### 雨课堂组件（HJC 改进）

基于原雨课堂组件继续改进的自动化工具，用于处理雨课堂中的视频、讨论和作业任务。

改进版支持自动刷视频、发讨论、做作业；作业流程会先通过 OCR 识别内容，再接入大模型辅助处理，并提供 DeepSeek API 配置。相比原版，改进后可以选择任一任务作为起点开始执行。

下载地址：<https://github.com/sheephjc/sheephjc.github.io/releases/download/zip/Yuketang.zip>

### 隐藏式录屏

一个轻量的录屏工具，启动后会隐藏在任务栏托盘中，适合需要低打扰录制的场景。

录屏可以通过任务栏托盘菜单启动或关闭，也可以使用快捷键控制；录制过程保持隐藏。

下载地址：<https://github.com/sheephjc/sheephjc.github.io/releases/download/zip/HiddenScreenRecorder.zip>
