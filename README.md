# HJC 的个人主页

GitHub Pages: <https://sheephjc.github.io/>

## 项目

### 小鳄龙之家

集游戏大厅、项目和成员介绍于一体的网站，收录出包魔法师、鳄龙咆哮、暗棋和漳州麻将，提供单机玩法与联机房间。直接在浏览器中访问，无需安装独立客户端。

网站地址：<https://xiaoelong.cn/>

### Fenglab

Fenglab 独立网站。

网站地址：<https://fenglab.sheephjc.cn/>

## 游戏

### 漳州麻将联机版

小鳄龙之家中的十六张闽南麻将，支持单机与 1–4 人联机，空位由 AI 补齐。

发牌、行牌、计分与 AI 由网站后端运行，通过同源 Socket.IO 同步对局。

游玩地址：<https://xiaoelong.cn/game/mahjong>

### 暗棋

一款基于中国象棋棋盘的双人暗棋变体，支持本地同屏和四位房间号联机对战。

游玩地址：<https://xiaoelong.cn/game/anqi>

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

### 按键小精灵

一个 Windows 按键循环小工具。点击“启动”后会等待 3 秒，方便切换到目标窗口，然后按设置好的顺序循环发送键盘按键。

工具默认按键顺序是“上、下、左、右”，也可以录制自定义按键顺序；支持设置按键间隔、窗口置顶，并会把按键顺序和时间间隔保存到 exe 同目录。

下载地址：<https://github.com/sheephjc/sheephjc.github.io/releases/download/zip/KeyWizard.zip>
