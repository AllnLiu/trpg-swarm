# Powered by the Apocalypse: Dungeon World 敘事導向核心規則百科

> **授權與系統定位**：本文件基於 Sage Kobold Productions 發布之 *Dungeon World* (CC-BY-3.0) 與 *Powered by the Apocalypse (PbtA)* 敘事引擎編纂。強調「由虛構敘事觸發規則，再由規則結果推動虛構敘事 (To do it, do it; fiction first)」，供 AI 地下城主 (DM Orchestrator) 與夥伴子代理人進行流暢的電影感跑團裁定。

---

## 1. PbtA 核心引擎：`2d6 + Stat` 三階段裁定

在《地城世界 (Dungeon World)》中，**只有玩家會擲骰，地下城主 (GM) 永遠不擲攻擊骰或豁免骰**。當玩家角色 (PC) 在敘事中做出的行動符合某個「動作 (Move)」的觸發條件時，投擲兩顆六面骰並加上對應的屬性調整值（範圍 `-3` 至 `+3`）：

$$\text{Roll Result} = 2\text{d}6 + \text{Stat Modifier}$$

### 1.1 三階段結果分佈與敘事權責

| 擲骰總和 | 結果分類 | 機率分佈 (以 +1 為例) | 核心敘事與規則裁定 |
| :---: | :--- | :---: | :--- |
| **`10+`** | **完全成功**<br>*(Strong Hit / Full Success)* | ~41.7% | 角色俐落地達成意圖，沒有負面副作用，甚至獲得額外優勢選項。 |
| **`7–9`** | **部分成功 / 帶代價成功**<br>*(Weak Hit / Mixed Success)* | ~41.7% | 角色基本上做到了想做的事，但**伴隨著代價、妥協、複雜化、較差的效果，或陷入艱難的兩難抉擇 (Hard Bargain / Ugly Choice)**。 |
| **`6-`** | **失手 / 局勢惡化**<br>*(Miss / Trouble)* | ~16.6% | **1. 玩家立即標記 1 點經驗值 (`+1 XP`，失敗是成長的養分！)**<br>**2. GM 立即執行一個強硬動作 (Hard Move)**，使戰局急轉直下（注意：`6-` 不一定代表角色動作愚蠢失誤，也可能是敵人比想像中更狡猾、天花板在此刻坍塌）。 |

### 1.2 傷害與護甲機制 (Damage & Armor)
- **職業基礎傷害骰 (Class Damage Die)**：在 PbtA 中，傷害不取決於你拿的是匕首還是巨劍，而是取決於**英雄職業**（武器僅提供敘事標籤 Tags，如 `近身 Close`、`觸及 Reach`、`破甲 N Piercing`、`凌亂 Messy`）：
  - **法師 (Wizard)**：`1d4`
  - **牧師 (Cleric) / 吟遊詩人 (Bard)**：`1d6`
  - **盜賊 (Thief) / 遊俠 (Ranger)**：`1d8`
  - **聖武士 (Paladin) / 戰士 (Fighter) / 野蠻人 (Barbarian)**：`1d10`
- **護甲減傷 (Armor Mitigation)**：護甲不影響「是否被命中」，而是直接作為**固定傷害減免**：
  $$\text{Actual Damage} = \max(0, \text{Rolled Damage} - (\text{Target Armor} - \text{Weapon Piercing}))$$

---

## 2. 八大基礎玩家動作 (The Eight Basic Moves)

### 2.1 近戰搏殺 (Hack and Slash — `+STR` 或靈巧武器 `+DEX`)
- **觸發條件**：當你與具備反擊能力的敵人在近距離白刃交鋒時（若敵人毫無防備或背對你，直接造成傷害或觸發盜賊背刺，無需擲此動作）。
- **擲 `2d6 + STR`**（若持有 `精巧 Precise` 標籤武器如刺劍，改擲 `+DEX`）：
  - **`10+`**：你對敵人造成你的職業傷害，且成功避開敵人的反擊。你還可以選擇**主動承受敵人的反擊**，換取對敵人額外造成 **`+1d6` 傷害**！
  - **`7–9`**：你對敵人造成你的職業傷害，但同時也暴露破綻，**敵人對你執行一次攻擊（造成敵人的傷害或特殊效果）**。
  - **`6-`**：記 `1 XP`，GM 對你執行強硬動作（承受重創、武器被擊飛、陷入包圍）。

### 2.2 遠程齊射 (Volley — `+DEX`)
- **觸發條件**：當你瞄準並從遠處向敵人射擊或投擲武器時。
- **擲 `2d6 + DEX`**：
  - **`10+`**：精準命中，造成你的職業傷害。
  - **`7–9`**：你命中了目標並造成傷害，但必須從以下**三項代價中選擇一項**：
    1. **為了取得射界，你必須移動到危險的位置**（由 GM 描述危險）。
    2. **你只能草率射擊，傷害減少 `-1d6`**（與基礎傷害骰同擲，取較低或扣除）。
    3. **你連射多發才命中，消耗 1 點彈藥 (`-1 Ammo`)**。
  - **`6-`**：記 `1 XP`，GM 執行強硬動作。

### 2.3 迎難而上 (Defy Danger — `+依應對方式決定屬性`)
- **觸發條件**：當你面對迫在眉睫的威脅（陷阱觸發、巨龍吐息、岩石崩落、精神控制）採取行動規避，或頂著災難強行行事時。
- **依你的敘事方式決定投擲屬性**：
  - **靠蠻力硬扛或撞開** $\rightarrow$ `+STR`
  - **靠敏捷閃避或特技翻滾** $\rightarrow$ `+DEX`
  - **靠耐力咬牙硬撐** $\rightarrow$ `+CON`
  - **靠急智快速思考對策** $\rightarrow$ `+INT`
  - **靠精神意志力抵抗** $\rightarrow$ `+WIS`
  - **靠個人魅力或話術化解** $\rightarrow$ `+CHA`
- **結算**：
  - **`10+`**：你安然度過危險，威脅未能傷你分毫。
  - **`7–9`**：你踉蹌、猶豫或退縮了——GM 將提供給你**一個較差的結果 (Worse Outcome)、一個沉重的代價 (Hard Bargain)，或一個殘酷的二選一抉擇 (Ugly Choice)**。
  - **`6-`**：記 `1 XP`，災難全面降臨。

### 2.4 辨識現實 (Discern Realities — `+WIS`)
- **觸發條件**：當你仔細觀察、搜索並分析當前的環境、局勢或人物時。
- **擲 `2d6 + WIS`**：
  - **`10+`**：從下方列表中向 GM 提出 **3 個問題**。
  - **`7–9`**：從下方列表中向 GM 提出 **1 個問題**。
  - **`6-`**：記 `1 XP`，在你觀察時發現了最糟糕的事實或觸發陷阱。
- **問題列表**（當你根據 GM 的回答採取行動時，下次檢定獲得 **`+1 forward`**）：
  1. *這裡最近發生了什麼事？ (What happened here recently?)*
  2. *有什麼事情即將發生？ (What is about to happen?)*
  3. *我應該小心防範什麼？ (What should I be on the lookout for?)*
  4. *這裡有什麼對我有用的或有價值的東西？ (What here is useful or valuable to me?)*
  5. *是誰真正在掌控這裡的局勢？ (Who’s really in control here?)*
  6. *這裡有什麼東西並非表面看起來那樣？ (What here is not what it appears to be?)*

### 2.5 博聞強記 (Spout Lore — `+INT`)
- **觸發條件**：當你調動腦海中的古老學識，回憶關於某個怪物、遺蹟、神話或魔法物品的知識時。
- **擲 `2d6 + INT`**：
  - **`10+`**：GM 會告訴你關於該事物**既有趣又直接有用的關鍵情報**（如怪物的致命弱點或機關密碼邏輯）。
  - **`7–9`**：GM 只會告訴你**有趣的事實**；至於如何讓它變得「有用」，取決於你自己的推理與運用。GM 可能會反問你：「你是從哪本古籍或哪位導師那裡聽說這件事的？」
  - **`6-`**：記 `1 XP`，你的記憶出現致命偏差，或知識本身招來了不祥的注意。

### 2.6 交涉談判 (Parley — `+CHA`)
- **觸發條件**：當你手握**籌碼 (Leverage)**（對方渴望的東西，或對方懼怕你做的事）並試圖操縱、說服或威逼某個 NPC 時。（若沒有籌碼，不算觸發此動作！）
- **擲 `2d6 + CHA`**：
  - **`10+`**：只要你承諾給予他們想要的東西（或兌現威脅），他們就會照你的要求去做。
  - **`7–9`**：他們會照你的要求去做，但要求你**現在立刻先提供具體的保證、訂金或證據**。
  - **`6-`**：記 `1 XP`，談判破裂，對方翻臉或設下圈套。

### 2.7 援助或妨礙 (Aid or Interfere — `+Bond 羈絆數量`)
- **觸發條件**：當你採取具體行動協助或阻撓另一名玩家角色的檢定時。
- **擲 `2d6 + 你與該名隊友之間的羈絆 (Bonds) 數量`**：
  - **`10+`**：你選擇讓對方的檢定獲得 **`+1`**（援助）或 **`-2`**（妨礙）。
  - **`7–9`**：你同樣給予對方 `+1` 或 `-2`，但你也因此**將自己暴露於危險、報復或代價之中**。
  - **`6-`**：記 `1 XP`，你的介入幫了倒忙並引發 GM 強硬動作。

### 2.8 彌留之際 (Last Breath — 固定 `2d6`，無屬性調整)
- **觸發條件**：當你的 HP 歸零，嚥下最後一口氣，靈魂跨越黑門 (The Black Gates of Death) 直面死神時。
- **擲 `2d6`（不加任何屬性值，死神面前眾生平等）**：
  - **`10+`**：你欺騙了死神！你處於瀕危但穩定狀態（1 HP），在關鍵時刻重返人間。
  - **`7–9`**：死神願意與你做一筆**交易 (A Bargain)**。接受交易，你就能穩定傷勢活下來（但必須背負死神的烙印、使命或代價）；拒絕交易，你將永遠踏入黑門。
  - **`6-`**：你的命運已成定局。死神將帶走你的靈魂（GM 會詢問你最後的遺言或何時嚥氣）。

---

## 3. 關係紐帶 (Bonds) 與結算階段 (End of Session)

### 3.1 關係紐帶 (Bonds)
每位夥伴與其他隊友之間都擁有 1～3 條具體的「羈絆句子」，例如：
- *「洛克曾經在死人胡同偷走了我的聖徽，我還沒完全信任他。」*
- *「賽拉斯掌握著可能吞噬他靈魂的禁忌知識，我發誓要指引他走向光明。」*
- *「艾莉亞在巨魔戰役中替我擋下了致命一擊，我欠她一條命。」*

羈絆的數值直接作為 **援助或妨礙 (Aid or Interfere)** 動作的加值，也是觸發隊伍內部對話 (Party Banter) 的核心錨點。

### 3.2 團務結束結算 (End of Session Move)
當每次冒險章節結束時，團隊依序進行以下結算：
1. **檢視羈絆 (Resolve Bonds)**：每位角色可選擇一條自己認為「已經解決、不再成立或已經昇華」的羈絆。若涉及的隊友同意，則**抹除該條舊羈絆、獲得 `1 XP`，並寫下一條全新的羈絆**。
2. **檢視陣營目標 (Alignment Move)**：若角色在本場團務中實踐了自己的陣營信條（例如善良聖武士不計代價拯救無辜者；中立法師揭開了一項未知的奧術秘密），**獲得 `1 XP`**。
3. **回答三大結算問題 (Three End-of-Session Questions)**：全隊共同回答以下三個問題，每有一個回答為「是」，全員各獲得 **`1 XP`**：
   - *我們是否學到了關於這個世界的全新且重要的事情？ (Did we learn something new and important about the world?)*
   - *我們是否戰勝了一個值得銘記的強大怪物或敵人？ (Did we overcome a notable monster or enemy?)*
   - *我們是否搜刮到了令人難忘的寶藏？ (Did we loot a memorable treasure?)*
4. **升級公式 (Level Up)**：當角色的經驗值達到 $\text{XP} \ge \text{Current Level} + 7$ 時，在紮營休息期間可扣除 $\text{Current Level} + 7$ 點 XP，提升 1 級、某項屬性分數 `+1`（最高 18），並習得一項高階職業動作！

---

## 4. 地下城主 GM 議程、原則與 12 項核心動作

在 PbtA 系統中，AI 地下城主 (DM Orchestrator) 並非與玩家對立的棋手，而是受嚴格規則約束的敘事引擎。

### 4.1 三大 GM 議程 (The Three GM Agendas)
1. **將世界描繪得充滿奇幻感 (Portray a fantastic world)**
2. **讓玩家角色的生活充滿冒險與波瀾 (Fill the characters' lives with adventure)**
3. **為了見證接下來會發生什麼而玩 (Play to find out what happens)** —— 嚴禁預設強制劇情殺或鐵軌式劇本 (No Railroading)。

### 4.2 十二項 GM 原則 (The Twelve GM Principles)
1. **繪製地圖，但留出空白 (Draw maps, leave blanks)**
2. **直接稱呼角色的名字，而非玩家 (Address the characters, not the players)**
3. **擁抱奇幻色彩 (Embrace the fantastic)**
4. **讓每一次戰鬥動作都推動敘事改變 (Make a move that follows)**
5. **永遠不要說出你所執行 GM 動作的規則名稱 (Never speak the name of your move)**
6. **賦予每個怪物鮮活的生命力 (Give every monster life)**
7. **賦予每個 NPC 名字與動機 (Name every person)**
8. **主動提問並以玩家的回答為基礎建構世界 (Ask questions and use the answers)**
9. **成為玩家角色的頭號粉絲 (Be a fan of the characters)**
10. **思考鏡頭之外發生的事 (Think offscreen, too)**
11. **從虛構敘事開始，並在虛構敘事結束 (Begin and end with the fiction)**
12. **思考危險的本質，而非單純扣血 (Think dangerous)**

### 4.3 軟招與硬招：12 項 GM 核心動作 (The 12 GM Moves)

#### 何時發動 GM 動作？
- 當全體玩家看向你，等待知道接下來發生什麼事時 $\rightarrow$ 通常發動 **軟招 (Soft Move)**。
- 當玩家給你一個「黃金機會 (Golden Opportunity)」（例如無視你剛才預告的危險）時 $\rightarrow$ 發動 **硬招 (Hard Move)**。
- 當玩家擲骰擲出 **`6-` (Miss)** 時 $\rightarrow$ 發動 **硬招 (Hard Move)**。

#### 軟招鋪墊 (Soft Moves) vs 硬招降臨 (Hard Moves)
- **軟招 (Soft Move)**：預告即將到來的威脅，並把球拋給玩家：「巨魔高舉鑲鐵巨棒朝艾莉亞當頭砸下，地面都被震得龜裂——艾莉亞，你怎麼做？」（玩家有機會用 *Defy Danger* 規避）。
- **硬招 (Hard Move)**：威脅已經不可逆轉地發生：「巨棒狠狠砸在你的盾牌上，你受到 `1d10+3` 點傷害，整個人被轟飛撞碎石柱，盾牌脫手飛進深淵！」

#### 12 項 GM 核心動作清單：
1. **使用怪物、危險或環境的專屬動作 (Use a monster, danger, or location move)**
2. **揭示不受歡迎的真相 (Reveal an unwelcome truth)**（如：火把照亮天頂，你們以為的鐘乳石其實全是倒掛的食屍鬼）
3. **展現即將到來的威脅徵兆 (Show signs of an approaching threat)**（軟招首選：遠處傳來沉重的鐵鍊拖曳聲）
4. **造成傷害 (Deal damage)**（依怪物傷害骰結算）
5. **消耗他們的資源 (Use up their resources)**（箭袋見底、火把熄滅、藥水瓶碎裂、失去法術記憶）
6. **將他們的動作反噬回自身 (Turn their move back on them)**
7. **將隊伍拆散 (Separate them)**（閘門落下、地板塌陷將前衛與後排隔開）
8. **提供一個帶代價或無代價的機會 (Give an opportunity that fits a class’ abilities)**（給盜賊一個高處吊燈，給牧師一個受污染的祭壇）
9. **指出他們裝備、職業或種族的弱點限制 (Show a downside to their class, race, or equipment)**
10. **提供一個兩難的醜陋抉擇 (Offer an ugly choice)**（「你要抓住快掉下懸崖的萊拉，還是保住手中盛裝解藥的聖杯？」）
11. **把他們推入絕境並詢問如何應對 (Put someone in a spot)**
12. **告訴他們行動的代價或先決條件，然後問他們是否還要做 (Tell them the requirements or consequences and ask)**
