# trpg-swarm 🛡️🎲

**跨平臺 · 跨代理人 | 多子代理人 TRPG 地下城主與 AI 夥伴跑團引擎**
*Cross-Platform & Cross-Agent Multi-Agent TRPG Dungeon Master & Companion Party Swarm Engine*

![Node](https://img.shields.io/badge/node-%E2%89%A518-339933) ![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-0078D4) ![License](https://img.shields.io/badge/license-MIT-yellow)

把任何 AI 代理人變成全知全能的 **地下城主 / 守密人（DM / Keeper / GM）**，率領 4 名性格鮮明、具備獨立戰術大腦的 AI 冒險夥伴，搭配**零幻覺確定性規則引擎 CLI** 與 **100% 視區滿版虛擬戰術桌面（VTT）**，為人類玩家提供數據嚴密對齊的沉浸式跑團體驗。

支援三大規則系統：**D&D 5e (SRD 5.1)**、**Call of Cthulhu 7e**、**PbtA (Dungeon World)**。

---

## ✨ 核心特色

- **零幻覺確定性檢定（Zero-Hallucination Mechanics）**：所有擲骰、傷害、SAN 扣減、法術位與先攻推進一律由 CLI 以密碼學亂數結算，`--seed` 可完整重現任一場戰役。
- **反罐頭動態戰術 AI（Anti-Slop Tactical AI）**：`ai-decide` 依距離、血量比、掩體、資源與威脅度計算 6 維效用函數 + Softmax 機率分佈，輸出 Top-3 候選戰術；`step-turn --action-id` 可指定採用哪個候選（非法動作會報錯並列出合法清單，絕不靜默改選）。
- **時序語義事實覆寫（Temporal Semantic Supersession）**：世界事實庫自動將被推翻的舊事實標記 `isActive: false` 並記錄 `supersededBy`，長戰役前後零矛盾。
- **跨平臺零依賴**：`dist/trpg-cli.js` 為預建純 JS bundle，Node ≥ 18 免安裝、免旗標、免殼層專屬語法，Windows / macOS / Linux 通吃。
- **跨代理人能力適配**：不綁定任何宿主工具名稱。具備子代理人機制的環境跑 **Mode S（蜂群）**；只有終端機的環境自動降級 **Mode I（單上下文內嵌扮演）**；完全無法執行指令的環境還有 **Mode M（純對話降級）**。
- **隨附 VTT 戰術桌面**：`index.html` 單檔零伺服器，任何瀏覽器直接開啟，含 2D 戰棋網格、角色狀態卡與擲骰動畫。

## 🔀 跨代理人運行模式

| 模式 | 觸發條件 | 夥伴協同方式 |
| :--- | :--- | :--- |
| **Mode S（Swarm 蜂群）** | 宿主具備「執行指令 + 建立子代理人」 | 以宿主的子代理人機制註冊 4 名夥伴，獨立上下文協同扮演 |
| **Mode I（Inline 扮演）** | 宿主僅具備「執行指令」 | DM 在單一上下文依序套用 4 名夥伴人格 —— 人格可內嵌，**骰子絕不內嵌** |
| **Mode M（Manual 降級）** | 宿主無法執行終端機指令 | 人類玩家擲實體骰回報，DM 以 Markdown 表格追蹤狀態並明確標註非確定性模式 |

已適配的宿主範例：Claude Code、Codex CLI、Gemini CLI、Cursor、任意具備 shell 的 Agent 框架。完整能力映射表見 [`SKILL.md`](./SKILL.md)。

## 🚀 快速開始

需求：**Node.js ≥ 18**（不需 npm install —— `dist/` 已預建）。

```bash
git clone https://github.com/killkli/trpg-swarm.git
cd trpg-swarm

# 環境驗證
node dist/trpg-cli.js roll "1d20"

# 初始化戰役（或用 init --example crimson-crypt / arkham-shadow 直接載入隨附劇本）
node dist/trpg-cli.js init --system dnd5e --state ./campaign-state.json
node dist/trpg-cli.js init --example arkham-shadow --state ./campaign-state.json

# 戰術評分 → 執行回合
node dist/trpg-cli.js ai-decide --state ./campaign-state.json --actor vanguard
node dist/trpg-cli.js step-turn --state ./campaign-state.json --actor vanguard --action-id javelin

# 檢定 / 擲骰 / 世界事實 / 全場總覽
node dist/trpg-cli.js check --state ./campaign-state.json --dc 15 --label "Perception" --mode advantage --mod 3
node dist/trpg-cli.js check --system coc7e --skill 65 --difficulty hard
node dist/trpg-cli.js roll --expr "2d20kh1+6"
node dist/trpg-cli.js fact-set --state ./campaign-state.json --subject "crypt_altar" --predicate "status" --value "unsealed"
node dist/trpg-cli.js summary --state ./campaign-state.json
```

所有指令支援 `--json`（機器可讀輸出）與 `--seed`（確定性重現）。`--actor` 支援 `vanguard` / `companion-rogue` / `trpg-companion-healer` 等別名自動解析。

## 🤖 作為 AI 代理技能（Agent Skill）使用

本專案根目錄即為一份標準 **Agent Skills** 格式技能（`SKILL.md` + 漸進式參考文件）：

- **Claude Code**：`cp -r trpg-swarm ~/.claude/skills/trpg-swarm`（或放入專案 `.claude/skills/`）
- **其他支援 SKILL.md 的代理人 / 框架**：將本資料夾置於宿主的技能目錄，或直接把 `SKILL.md` 內容貼進系統提示詞

技能會引導代理人自動偵測自身能力、選擇 Mode S / I / M，並透過 CLI 完成所有規則數學。人設提示詞與通訊協定見 [`references/subagent-persona-prompts.md`](./references/subagent-persona-prompts.md)。

## 🖥️ VTT 戰術桌面

用瀏覽器開啟根目錄 [`index.html`](./index.html)（檔案總管雙擊，或 `open index.html` / `xdg-open index.html` / `start index.html`）：2D 戰棋網格、角色狀態卡、先攻軌與擲骰動畫，可匯入 `campaign-state.json` 即時呈現戰場。

## 📁 專案結構

```text
trpg-swarm/
├── SKILL.md                      # Agent Skill 主文件（跨代理人能力適配層）
├── index.html                    # 零伺服器 VTT 戰術桌面（單檔）
├── dist/trpg-cli.js              # 預建零依賴 CLI bundle（Node ≥ 18）
├── scripts/trpg-cli.ts           # CLI 原始碼（TypeScript）
├── src/engine/                   # 確定性規則核心
│   ├── dice.ts                   #   骰池解析（kh/kl、獎懲骰）與可重現 RNG
│   ├── rulesEngine.ts            #   D&D 5e / CoC 7e / PbtA 規則裁決
│   ├── tacticalAI.ts             #   6 維效用 + Softmax 戰術決策
│   ├── stateStore.ts             #   WorldState、先攻推進、語義事實覆寫
│   └── campaignImport.ts         #   劇本檔（campaign book）自動轉換
├── references/                   # 規則百科與子代理人通訊協定（漸進式揭露）
├── examples/                     # 隨附完整劇本（D&D 5e / CoC 7e）
└── tests/e2e-headless-100.test.ts # 100 場 headless 回歸測試
```

## 🛠️ 開發與測試

```bash
npm install        # 僅需安裝 esbuild（重建 dist 用）
npm run build      # 重新打包 dist/trpg-cli.js
npm run test:100   # 100 場 headless E2E 回歸（0 deadlock 斷言）
npm run cli:src    # 原始碼模式執行 CLI（Node ≥ 22.6）
```

## 📄 授權

本專案以 [MIT License](./LICENSE) 授權。
