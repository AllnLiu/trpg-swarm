# 自訂戰役與匯入劇本目錄 (Custom & Imported Campaigns)

此目錄專供放置使用者自訂、社群下載或第三方匯入的 TRPG 劇本 JSON 檔案。

- **目錄約定**：
  - 檔案格式：標準 TRPG-Swarm Campaign Book JSON（可參考 `examples/catalog.json` 中的各系統範本）
  - 載入指令：
    ```bash
    # 支援直接載入 campaigns/ 內的劇本檔名（含或不含 .json）
    node dist/trpg-cli.js init --example campaigns/my-story.json --state ./campaign-state.json
    ```
