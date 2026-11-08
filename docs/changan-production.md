# 《走进唐长安城》制作与重渲染

## 交付

- `out/changan.mp4`：60 秒、1920 × 1080、30 fps、H.264 / yuv420p，中文字幕和轻环境声；没有录入人声。
- `out/changan-gate-test.mp4`：8 秒同规格步行测试。
- `out/changan-voiceover.txt`：中文配音稿，按每 4 秒一句对齐。
- `out/changan.zh-CN.srt`：可单独导入剪辑软件的中文字幕。
- `docs/changan-sources.md`：文献链接、固定版本、原文、可支持的断言与情境演绎范围。

## 分镜

|时间|画面|相机|
|---|---|---|
|00—12 秒|全城鸟瞰；宫城、皇城、中轴与两市标注|高空斜俯视，轻微稳定推进|
|12—24 秒|道路网格与坊、市空间|更接近俯视，小幅推进|
|24—32 秒|街道走近坊门，穿过门洞进入坊内|固定 1.65 m 眼高；中央轴线从 z=9 m 到 -4 m|
|32—40 秒|坊内道路、墙、院落、灰瓦与树木|继续行进，z=-4 m 到 -16 m|
|40—50 秒|坊门逐渐合拢，解释夜禁和法律例外|门外缓慢侧向推进；不再穿行|
|50—60 秒|拉回全城，片尾资料|高空缓慢拉远|

跨镜头短淡入淡出；不使用摇晃、急转或快速环绕。画面上“布局示意”“情境演绎”分别持续覆盖对应场景。

## 技术

保留原手机模板 `Scene`，新增 `ChanganGateTest` 与 `Changan` 两个 composition。入口是 `src/changan/Film.tsx`；建筑和材质在 `src/changan/Architecture.tsx`。无需新增 npm 依赖。纹理与声音都是固定种子的程序化原创素材；本地字体来自 Noto CJK，许可证在 `public/changan/FONT-LICENSE.txt`。字幕字体子集从系统字体生成，覆盖片中全部文本。

云环境无硬件 GPU，使用已验证的真实 Chromium 二进制 `/usr/lib/chromium/chromium` 和 `--gl=swangle` 软件 WebGL。2 个并发渲染页面，避免让软件 GPU 过量争用。鸟瞰屋顶使用低细分实例几何；近景使用曲面灰瓦屋顶、木梁、门扇、石座、夯土纹理、方向光及阴影。静止灯光的阴影缓存；关门时逐帧更新，不能只靠旧阴影缓存遮掩门扇运动。

首次素材生成：

```bash
cd /workspace/3dvideo
python scripts/generate-changan-assets.py
python scripts/generate-changan-audio.py
```

渲染和媒体验证：

```bash
cd /workspace/3dvideo
bash scripts/render-changan.sh
```

只重渲染全片可使用该脚本中第二条 Remotion 命令，然后执行其交付编码步骤。当前 Remotion/JPEG 渲染管线会产生全范围 YUV：交付时显式转换到标准视频范围 `yuv420p`，保留 `*-master.mp4` 原始渲染文件，并添加 MP4 faststart。`npm run dev -- --port=3000 --no-open` 可在 Studio 中选择新增 composition。

## 质量检查方法

1. 完整渲染 8 秒测试，而非只输出若干张截图。查看门前、过门、门后关键帧的接触表与 1080p 原帧。
2. 每个街景渲染帧在实际场景中遍历 mesh 世界边界，将相机视作半径 0.25 m 球体检查交叠；有交叠即抛错使渲染失败。此法对复杂曲面采用保守包围盒，不宣称完整物理引擎。
3. 建筑比例在 `changan-sources.md` 中列明，使用人物作比例参照；模型不是考古实测。
4. 40 px 中文字幕配不透明深色底板；主要字幕位于画面左右各 120 px、底部约 104 px 的安全区，资料文字与对白不重叠。
5. `verify-changan.py` 检查最终文件的真实分辨率、帧率、帧数、时长、编码、音频，并完整解码。媒体头正确不足以代替全片解码。

视频声音为轻风、鸟鸣、脚步和关门拟音。配音稿另附，**不把合成环境声称为中文配音**。需要人声时可按稿录制，再替换或叠加音轨。
