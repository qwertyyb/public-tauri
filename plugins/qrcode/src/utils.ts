import { utils } from '@public-tauri/api';

export const getChromeCurrentUrl = async () => {
  const script = `
  -- 第一步：检查 Google Chrome 是否正在运行（不会触发启动）
  set chromeIsRunning to false
  tell application "System Events"
      set chromeIsRunning to (exists process "Google Chrome")
  end tell

  -- 第二步：仅在 Chrome 运行时获取 URL，否则返回空字符串
  if chromeIsRunning then
      tell application "Google Chrome"
          -- 检查是否有打开的窗口
          if (count of windows) > 0 then
              set currentTab to active tab of front window
              set currentURL to URL of currentTab
              return currentURL
          else
              return ""
          end if
      end tell
  else
      return ""
  end if
  `;
  try {
    return await utils.runAppleScript(script);
  } catch (err) {
    return '';
  }
};

export const getSafariCurrentUrl = async () => {
  const script = `
    -- 第一步：检查 Safari 是否正在运行（不会触发启动）
    set safariIsRunning to false
    tell application "System Events"
        set safariIsRunning to (exists process "Safari")
    end tell

    -- 第二步：仅在 Safari 运行时获取 URL，否则返回空字符串
    if safariIsRunning then
        tell application "Safari"
            -- 检查是否有打开的窗口
            if (count of windows) > 0 then
                set currentTab to current tab of front window
                set currentURL to URL of currentTab
                return currentURL
            else
                return ""
            end if
        end tell
    else
        return ""
    end if
  `;

  try {
    return await utils.runAppleScript(script);
  } catch (err) {
    return '';
  }
};
